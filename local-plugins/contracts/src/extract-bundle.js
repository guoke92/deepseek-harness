/**
 * 采集深挖产物：挂在原料上的 ExtractBundle（非规范对象）。
 * nodes/links 可多、可假设；每条须有证据锚点。
 */
import { createHash } from 'node:crypto'
import { finish, isObj, isStr, isUnit, isStrArr } from './common.js'
import { validateCompletenessVerdict } from './completeness.js'
import { stableStringify } from './assertions.js'

export const EXTRACT_SUPPORT = Object.freeze(['direct', 'indirect', 'implicit'])
export const EXTRACT_NODE_KINDS = Object.freeze([
  'concept', 'role', 'process', 'activity', 'document_type', 'event_type',
  'policy', 'metric', 'domain', 'label', 'other',
])

/**
 * @param {object} anchor
 */
export function validateEvidenceAnchor(anchor) {
  if (!isObj(anchor)) return finish(['anchor must be an object'])
  const e = []
  if (!isStr(anchor.assertionKey) && !isStr(anchor.ref)) {
    e.push('anchor needs assertionKey or ref')
  }
  if (anchor.materialId !== undefined && !isStr(anchor.materialId)) {
    e.push('anchor.materialId must be a non-empty string when set')
  }
  return finish(e)
}

/**
 * @param {object} node
 */
export function validateExtractNode(node) {
  if (!isObj(node)) return finish(['node must be an object'])
  const e = []
  if (!isStr(node.id)) e.push('node.id must be a non-empty string')
  if (!EXTRACT_NODE_KINDS.includes(node.kind)) e.push(`node.kind must be one of ${EXTRACT_NODE_KINDS.join(', ')}`)
  if (!isStr(node.title)) e.push('node.title must be a non-empty string')
  if (!EXTRACT_SUPPORT.includes(node.support)) e.push(`node.support must be one of ${EXTRACT_SUPPORT.join(', ')}`)
  if (!isUnit(node.confidence)) e.push('node.confidence must be in [0, 1]')
  if (!Array.isArray(node.evidenceAnchors) || node.evidenceAnchors.length === 0) {
    e.push('node.evidenceAnchors must be a non-empty array')
  } else {
    for (let i = 0; i < node.evidenceAnchors.length; i++) {
      const checked = validateEvidenceAnchor(node.evidenceAnchors[i])
      if (!checked.ok) e.push(...checked.errors.map((msg) => `evidenceAnchors[${i}]: ${msg}`))
    }
  }
  if (node.aliases !== undefined && !isStrArr(node.aliases)) e.push('node.aliases must be a string array')
  if (node.rationale !== undefined && node.rationale !== null && typeof node.rationale !== 'string') {
    e.push('node.rationale must be a string when set')
  }
  return finish(e)
}

/**
 * @param {object} link
 */
export function validateExtractLink(link) {
  if (!isObj(link)) return finish(['link must be an object'])
  const e = []
  if (!isStr(link.id)) e.push('link.id must be a non-empty string')
  if (!isStr(link.fromRef)) e.push('link.fromRef must be a non-empty string')
  if (!isStr(link.toRef)) e.push('link.toRef must be a non-empty string')
  if (!isStr(link.predicate)) e.push('link.predicate must be a non-empty string')
  if (!EXTRACT_SUPPORT.includes(link.support)) e.push(`link.support must be one of ${EXTRACT_SUPPORT.join(', ')}`)
  if (!isUnit(link.confidence)) e.push('link.confidence must be in [0, 1]')
  if (!Array.isArray(link.evidenceAnchors) || link.evidenceAnchors.length === 0) {
    e.push('link.evidenceAnchors must be a non-empty array')
  } else {
    for (let i = 0; i < link.evidenceAnchors.length; i++) {
      const checked = validateEvidenceAnchor(link.evidenceAnchors[i])
      if (!checked.ok) e.push(...checked.errors.map((msg) => `evidenceAnchors[${i}]: ${msg}`))
    }
  }
  return finish(e)
}

/**
 * @param {object} bundle
 */
export function validateExtractBundle(bundle) {
  if (!isObj(bundle)) return finish(['extractBundle must be an object'])
  const e = []
  if (bundle.schemaVersion !== 1) e.push('extractBundle.schemaVersion must be 1')
  if (!Array.isArray(bundle.nodes)) e.push('nodes must be an array')
  else {
    for (let i = 0; i < bundle.nodes.length; i++) {
      const checked = validateExtractNode(bundle.nodes[i])
      if (!checked.ok) e.push(...checked.errors.map((msg) => `nodes[${i}]: ${msg}`))
    }
  }
  if (!Array.isArray(bundle.links)) e.push('links must be an array')
  else {
    for (let i = 0; i < bundle.links.length; i++) {
      const checked = validateExtractLink(bundle.links[i])
      if (!checked.ok) e.push(...checked.errors.map((msg) => `links[${i}]: ${msg}`))
    }
  }
  if (bundle.completeness !== undefined) {
    const checked = validateCompletenessVerdict(bundle.completeness)
    if (!checked.ok) e.push(...checked.errors.map((msg) => `completeness: ${msg}`))
  }
  if (bundle.sealed !== undefined && typeof bundle.sealed !== 'boolean') e.push('sealed must be a boolean')
  if (bundle.extractHash !== undefined && (typeof bundle.extractHash !== 'string' || !/^[0-9a-f]{64}$/.test(bundle.extractHash))) {
    e.push('extractHash must be a sha256 hex string')
  }
  if (bundle.triage !== undefined && bundle.triage !== null && !isObj(bundle.triage)) {
    e.push('triage must be an object when set')
  }
  if (bundle.rounds !== undefined) {
    if (!Array.isArray(bundle.rounds)) e.push('rounds must be an array')
  }
  return finish(e)
}

/**
 * 规范化提取输入指纹，供跳过重挖。
 * @param {object} input
 */
export function extractHashOf(input) {
  return createHash('sha256').update(stableStringify(input), 'utf8').digest('hex')
}

/**
 * 合并增量节点/边（同 id 覆盖）。
 * @param {object} base
 * @param {{nodes?: object[], links?: object[]}} delta
 */
export function mergeExtractDelta(base, delta) {
  const nodesById = new Map((base?.nodes ?? []).map((node) => [node.id, node]))
  const linksById = new Map((base?.links ?? []).map((link) => [link.id, link]))
  for (const node of delta?.nodes ?? []) nodesById.set(node.id, node)
  for (const link of delta?.links ?? []) linksById.set(link.id, link)
  return {
    schemaVersion: 1,
    nodes: [...nodesById.values()],
    links: [...linksById.values()],
    triage: delta?.triage ?? base?.triage,
    extractHash: base?.extractHash,
    sealed: false,
    rounds: [...(base?.rounds ?? [])],
  }
}

/**
 * 本轮相对上一快照的有效新增数。
 * @param {object|null} before
 * @param {object} after
 */
export function countExtractAdditions(before, after) {
  const beforeNodes = new Set((before?.nodes ?? []).map((node) => node.id))
  const beforeLinks = new Set((before?.links ?? []).map((link) => link.id))
  let addedNodes = 0
  let addedLinks = 0
  for (const node of after?.nodes ?? []) if (!beforeNodes.has(node.id)) addedNodes++
  for (const link of after?.links ?? []) if (!beforeLinks.has(link.id)) addedLinks++
  return { addedNodes, addedLinks, total: addedNodes + addedLinks }
}
