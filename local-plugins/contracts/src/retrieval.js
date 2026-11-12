/**
 * 检索视图命中记录与 resolve 打分（派生投影，不是元模型类型）。
 */
import { finish, isObj, isStr, isStrArr } from './common.js'

export const RETRIEVAL_FACETS = Object.freeze([
  'tech_name', 'biz_label', 'value', 'assoc', 'process', 'policy', 'case', 'domain',
])

export const OBJECT_KINDS = Object.freeze([
  'table', 'column', 'association', 'concept', 'document_type', 'process', 'activity',
  'event_type', 'policy', 'case', 'domain', 'role', 'enum_member', 'module', 'enum', 'document', 'mapping',
  'grounding', 'metric',
])

/**
 * @param {object} hit
 */
export function validateRetrievalHit(hit) {
  if (!isObj(hit)) return finish(['hit must be an object'])
  const e = []
  if (!RETRIEVAL_FACETS.includes(hit.facet)) e.push(`facet must be one of ${RETRIEVAL_FACETS.join(', ')}`)
  if (!OBJECT_KINDS.includes(hit.objectKind)) e.push(`objectKind must be one of ${OBJECT_KINDS.join(', ')}`)
  if (!isStr(hit.objectId)) e.push('objectId must be a non-empty string')
  if (typeof hit.score !== 'number' || !Number.isFinite(hit.score)) e.push('score must be a finite number')
  if (!isStr(hit.display)) e.push('display must be a non-empty string')
  if (hit.aliases !== undefined && !isStrArr(hit.aliases)) e.push('aliases must be string[]')
  if (hit.evidenceIds !== undefined && !isStrArr(hit.evidenceIds)) e.push('evidenceIds must be string[]')
  if (hit.caliber !== undefined && !['accepted', 'draft', 'proposed'].includes(hit.caliber)) {
    e.push("caliber must be 'accepted', 'draft', or 'proposed'")
  }
  if (!isStr(hit.knowledgeBaseId)) e.push('knowledgeBaseId must be a non-empty string')
  return finish(e)
}

/**
 * 词面分面打分：每个 query token 命中 display/aliases/haystack 加分。
 * @param {string} query
 * @param {object} hit
 */
export function scoreRetrievalHit(query, hit) {
  const terms = String(query ?? '').toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return 0
  const aliases = Array.isArray(hit.aliases) ? hit.aliases : []
  const text = `${hit.display ?? ''}\n${aliases.join('\n')}\n${hit.haystack ?? ''}`.toLowerCase()
  let score = 0
  for (const term of terms) {
    if (String(hit.display ?? '').toLowerCase() === term) score += 3
    else if (aliases.some((alias) => String(alias).toLowerCase() === term)) score += 2.5
    else if (text.includes(term)) score += 1
  }
  return score
}

/**
 * @param {object[]} hits
 * @param {string} query
 * @param {{limit?: number, facets?: string[], acceptedOnly?: boolean}} [opts]
 */
export function resolveRetrievalHits(hits, query, opts = {}) {
  const limit = opts.limit ?? 8
  const facets = opts.facets?.length ? new Set(opts.facets) : null
  const scored = []
  for (const hit of hits) {
    if (facets && !facets.has(hit.facet)) continue
    if (opts.acceptedOnly && hit.caliber && hit.caliber !== 'accepted') continue
    const score = scoreRetrievalHit(query, hit)
    if (score <= 0) continue
    scored.push({ ...hit, score })
  }
  scored.sort((a, b) => b.score - a.score || String(a.objectId).localeCompare(String(b.objectId)))
  return scored.slice(0, limit)
}
