/**
 * 无模型时从 L0 断言/证据确定性搭建 ExtractBundle 脚手架并封印。
 * 深挖语义仍归 wiki-collect lead；此处只保证原料有可印证锚点的密封起点。
 */
import { sealExtractBundle } from './pipeline-ops.js'
import { extractHashOf } from '@local/contracts'
import { buildEvidenceBrief } from './extract-rounds.js'

/**
 * 已有非 no_model 封印时跳过，避免覆盖模型深挖。
 * @param {object} material
 */
export function shouldSkipExtractScaffold(material) {
  const bundle = material?.extractBundle
  if (!bundle?.sealed) return false
  const abstain = bundle.completeness?.abstainReasons
  return !(Array.isArray(abstain) && abstain.includes('no_model'))
}

/**
 * @param {object} material
 * @returns {{nodes: object[], links: object[]}}
 */
export function buildExtractScaffoldDelta(material) {
  const evidence = material.evidence ?? {}
  const assertions = Array.isArray(material.assertions)
    ? material.assertions
    : (Array.isArray(material.assertions?.assertions) ? material.assertions.assertions : [])
  const byCol = new Map()
  for (const item of assertions) {
    if (item?.kind === 'column' && item.payload?.name) byCol.set(String(item.payload.name), item.key)
  }
  const tableKey = assertions.find((item) => item?.kind === 'table')?.key ?? 'table'
  const table = evidence.table ?? assertions.find((item) => item?.kind === 'table')?.payload?.name ?? 'table'
  const tableTitle = String(evidence.comment || table).trim() || table
  const materialId = material.id
  const nodes = []
  const links = []
  const nodeIds = new Set()

  const addNode = (node) => {
    if (!node?.id || nodeIds.has(node.id)) return
    nodeIds.add(node.id)
    nodes.push(node)
  }

  addNode({
    id: `scaffold:domain:${table}`,
    kind: 'domain',
    title: tableTitle,
    support: 'direct',
    confidence: 0.55,
    evidenceAnchors: [{ materialId, assertionKey: tableKey }],
    aliases: tableTitle === table ? [] : [table],
    rationale: 'rule_scaffold: table comment or name',
  })

  const pk = new Set(evidence.primaryKey ?? [])
  for (const column of evidence.columns ?? []) {
    const name = column?.name
    if (!name) continue
    const comment = String(column.comment ?? '').trim()
    const assertionKey = byCol.get(name) ?? `col:${name}`
    const anchor = [{ materialId, assertionKey }]
    if (pk.has(name) || column.role === 'identifier') {
      addNode({
        id: `scaffold:role:${table}.${name}`,
        kind: 'role',
        title: comment || name,
        support: 'direct',
        confidence: 0.5,
        evidenceAnchors: anchor,
        aliases: comment && comment !== name ? [name] : [],
        rationale: 'rule_scaffold: identifier/primary key',
      })
      continue
    }
    if (column.dictionary || column.role === 'enum') {
      addNode({
        id: `scaffold:concept:${table}.${name}`,
        kind: 'concept',
        title: comment || name,
        support: 'direct',
        confidence: 0.5,
        evidenceAnchors: anchor,
        aliases: comment && comment !== name ? [name] : [],
        rationale: 'rule_scaffold: dictionary/enum column',
      })
      continue
    }
    if (column.role === 'measure' && comment) {
      addNode({
        id: `scaffold:metric:${table}.${name}`,
        kind: 'metric',
        title: comment,
        support: 'direct',
        confidence: 0.45,
        evidenceAnchors: anchor,
        aliases: [name],
        rationale: 'rule_scaffold: measure with comment',
      })
    }
  }

  for (const rel of evidence.relations ?? []) {
    if (rel?.verdict !== 'accepted' && rel?.verdict !== 'review') continue
    const fromId = `scaffold:role:${rel.fromTable}.${rel.fromColumn}`
    const toId = `scaffold:role:${rel.toTable}.${rel.toColumn}`
    // Ensure endpoints exist as role nodes even if not PK on this table.
    addNode({
      id: fromId,
      kind: 'role',
      title: `${rel.fromTable}.${rel.fromColumn}`,
      support: rel.verdict === 'accepted' ? 'direct' : 'indirect',
      confidence: rel.verdict === 'accepted' ? 0.5 : 0.35,
      evidenceAnchors: [{ materialId, assertionKey: byCol.get(rel.fromColumn) ?? `col:${rel.fromColumn}` }],
      rationale: 'rule_scaffold: relation endpoint',
    })
    addNode({
      id: toId,
      kind: 'role',
      title: `${rel.toTable}.${rel.toColumn}`,
      support: rel.verdict === 'accepted' ? 'direct' : 'indirect',
      confidence: rel.verdict === 'accepted' ? 0.5 : 0.35,
      evidenceAnchors: [{
        materialId,
        ref: `relation:${rel.fromTable}.${rel.fromColumn}->${rel.toTable}.${rel.toColumn}`,
      }],
      rationale: 'rule_scaffold: relation endpoint',
    })
    links.push({
      id: `scaffold:link:${rel.fromTable}.${rel.fromColumn}->${rel.toTable}.${rel.toColumn}`,
      fromRef: fromId,
      toRef: toId,
      predicate: 'associates_with',
      support: rel.verdict === 'accepted' ? 'direct' : 'indirect',
      confidence: rel.verdict === 'accepted' ? 0.55 : 0.35,
      evidenceAnchors: [{
        materialId,
        ref: `relation:${rel.fromTable}.${rel.fromColumn}->${rel.toTable}.${rel.toColumn}`,
      }],
    })
  }

  return { nodes, links }
}

/**
 * 规则脚手架 completeness（no_model + rule_scaffold 说明）。
 */
export function scaffoldCompleteness() {
  return {
    complete: false,
    score: 0.2,
    gaps: [{
      kind: 'other',
      detail: 'rule_scaffold: deterministic extract from L0; model deep extract skipped',
      severity: 'warning',
    }],
    abstainReasons: ['no_model'],
  }
}

/**
 * 生成并封印脚手架 bundle；若应跳过则返回 null。
 * @param {object} material
 * @returns {object|null}
 */
export function buildScaffoldedExtractBundle(material) {
  if (shouldSkipExtractScaffold(material)) return null
  const { nodes, links } = buildExtractScaffoldDelta(material)
  const brief = buildEvidenceBrief(material)
  const extractHash = extractHashOf({
    structureHash: material.structureHash,
    profileHash: material.profileHash,
    brief,
  })
  const staged = {
    ...material,
    extractBundle: {
      schemaVersion: 1,
      nodes,
      links,
      triage: { source: 'rule_scaffold' },
      rounds: [{ index: 0, addedNodes: nodes.length, addedLinks: links.length, verdict: null }],
      sealed: false,
      extractHash,
    },
  }
  return sealExtractBundle(staged, scaffoldCompleteness())
}
