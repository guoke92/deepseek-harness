/**
 * 采集一条库的表文档：读结构、精确行数、整表采样、值域和关系。
 * 只读。每张表产出一条原料，正文来自 contracts 的同一渲染。
 */
import { measureOverlaps, readRowCounts, readTableMetas, sampleTable } from './connector.js'
import { buildTableFacts, declaredEndpoints, discoverRelations, evidenceFor, judgeOverlap } from './document.js'
import { tableMaterial } from './deliver.js'

/**
 * @param {object} cfg 数据源连接配置
 * @param {object} opts
 * @param {number} opts.datasourceId
 * @param {string[]|null} opts.tables
 * @param {object} opts.policy wiki 策略里的 wiki 段
 */
export async function profileDatasource(cfg, { datasourceId, tables = null, policy, onProgress, signal, gate }) {
  onProgress?.({ phase: 'catalog', done: 0, total: 1, current: 1, message: '读取结构' })
  const metas = await readTableMetas(cfg, tables)
  const total = Math.max(metas.length, 1)
  onProgress?.({ phase: 'catalog', done: 0, total, current: 1, message: `读取结构 · ${metas.length} 张表` })
  onProgress?.({ phase: 'count', done: 0, total, current: 1, message: `统计行数 · ${metas.length} 张表` })
  const counts = await readRowCounts(cfg, metas.map((meta) => meta.tableKey))
  const partials = []
  const keys = []
  let done = 0
  for (const meta of metas) {
    if (signal?.aborted) throw cancelled()
    if (gate) await gate()
    onProgress?.({ phase: 'profile', done, total, current: done + 1, message: meta.tableKey })
    meta.rowCount = counts[meta.tableKey] ?? 0
    const sample = await sampleTable(cfg, meta, policy.profileSampleRows)
    if (signal?.aborted) throw cancelled()
    const facts = buildTableFacts(meta, sample, policy)
    partials.push(facts)
    keys.push(...facts.keys)
    done += 1
    onProgress?.({ phase: 'profile', done, total, current: done, message: meta.tableKey })
  }
  const declared = declaredEndpoints(partials)
  const complete = keys.filter((key) => !key.partial)
  const relations = discoverRelations(complete, declared.pairs)
  const probes = []
  for (const big of keys) {
    if (!big.partial || !big.probe) continue
    for (const small of complete) {
      if (!small.probe || !small.values?.length || sameTableName(small.table, big.table)) continue
      probes.push({ big, small })
    }
  }
  if (probes.length > 0) {
    const measured = await measureOverlaps(cfg, probes.map((item) => ({
      table: item.big.table,
      column: item.big.column,
      values: item.small.values,
    })))
    probes.forEach((item, index) => {
      const stats = measured[index]
      const relation = judgeOverlap(item.small, {
        table: item.big.table,
        column: item.big.column,
        distinct: stats.distinct,
        nonNull: stats.nonNull,
        rowCount: item.big.rowCount,
        uniqueness: stats.nonNull ? stats.distinct / stats.nonNull : 0,
        bareId: item.big.bareId,
      }, stats.hits, declared.pairs)
      if (relation) relations.push(relation)
    })
    relations.sort((a, b) => `${a.fromTable}.${a.fromColumn}->${a.toTable}.${a.toColumn}`.localeCompare(`${b.fromTable}.${b.fromColumn}->${b.toTable}.${b.toColumn}`))
  }
  const materials = partials.map((partial) => tableMaterial(
    evidenceFor(partial, relations, declared.foreignKeys),
    datasourceId,
  ))
  const keep = []
  for (const material of materials) {
    for (const column of material.evidence.columns) {
      if (column.dictionary) keep.push({ table: material.evidence.table, column: column.name })
    }
  }
  return { materials, dicts: { keep, hold: [], drop: [] } }
}

function sameTableName(left, right) {
  return left === right || String(left).endsWith(`.${right}`) || String(right).endsWith(`.${left}`)
}

function cancelled() {
  const error = new Error('cancelled')
  error.code = 'cancelled'
  return error
}
