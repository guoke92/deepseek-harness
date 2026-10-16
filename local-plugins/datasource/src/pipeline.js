/**
 * datasource 的剖析与候选管线（P1）：读结构 → 计行数 → 采样 → buildProfile → generateCandidates。
 * 只读；不写 wiki。输出 { profiles, candidates, rawMaterials }，原料按 contracts.RawMaterial 形状给出。
 */
import { readColumns, readRowCounts, sampleColumn } from './connector.js'
import { buildProfile } from './profile.js'
import { generateCandidates } from './candidates.js'
import { randomUUID } from 'node:crypto'

/**
 * @param {object} cfg 数据源连接配置（type/host/port/database/username/password）
 * @param {object} opts
 * @param {number} opts.datasourceId
 * @param {string[]|null} opts.tables 表范围，null 为全部
 * @param {object} opts.policy wiki 策略的 wiki 段（来自 contracts.defaultPolicy().wiki 合并结果）
 */
export async function profileDatasource(cfg, { datasourceId, tables = null, policy }) {
  const cols = await readColumns(cfg, { tables })
  const tableNames = [...new Set(cols.map((c) => c.table))]
  const rowCounts = await readRowCounts(cfg, tableNames)
  const profiles = []
  for (const table of tableNames) {
    const tableCols = cols.filter((c) => c.table === table)
    for (const column of tableCols) {
      const values = await sampleColumn(cfg, table, column.name, policy.profileSampleRows)
      profiles.push(buildProfile({
        table,
        column: { name: column.name, dataType: column.dataType, comment: column.comment },
        values,
        rowCount: rowCounts[table],
        sampleRows: Math.min(values.length, policy.profileSampleRows),
        k: policy.minhashK,
        dictDistinctMax: policy.dictDistinctMax,
        highDefaultRatio: policy.highDefaultRatio,
      }))
    }
  }
  const candidates = generateCandidates(profiles, { dictDistinctMax: policy.dictDistinctMax })
  const at = new Date().toISOString()
  const rawMaterials = profiles.map((p) => ({
    schemaVersion: 1,
    id: `raw_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
    sourceType: 'db',
    sourceRef: `database_profile:${p.table}.${p.column}`,
    datasourceId,
    content: describeProfile(p),
    evidence: { rowCount: p.rowCount, nullCount: p.nullCount, distinctCount: p.distinctCount, distinctApprox: p.distinctApprox, skipReason: p.skipReason, excludedDefaults: p.excludedDefaults },
    createdAt: at,
  }))
  return { profiles, candidates, rawMaterials }
}

/** 机械生成的一句话剖析描述（论文 2.1 的"机械英文描述"对应物，中文）。 */
export function describeProfile(p) {
  const parts = [`${p.table}.${p.column}`]
  parts.push(`行数 ${p.rowCount}，空值 ${p.nullCount}，不同值 ${p.distinctCount}${p.distinctApprox ? '（近似）' : ''}`)
  if (p.skipReason) parts.push(`跳过关联（${p.skipReason}）`)
  if (p.isDictLike && !p.skipReason) parts.push('低基数，候选字典')
  if (p.topK.length) parts.push(`高频值 ${p.topK.slice(0, 5).map((x) => x.value).join('、')}`)
  return parts.join('；')
}
