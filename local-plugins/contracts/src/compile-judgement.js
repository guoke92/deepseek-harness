/**
 * 编译印证判决（非 Wiki 页面 Decision）。
 * 无锚点主张不得 accepted；主产物禁止整页 Markdown body。
 */
import { finish, isObj, isStr, isUnit } from './common.js'
import { validateEvidenceAnchor } from './extract-bundle.js'
import { validateCompletenessVerdict } from './completeness.js'

export const JUDGEMENT_ACTIONS = Object.freeze([
  'upsert_canonical', 'merge_identity', 'ground', 'reject', 'flag_coverage', 'judge_association',
])

export const CALIBERS = Object.freeze(['observed', 'inferred', 'proposed', 'accepted', 'hypothesized'])

/**
 * @param {object} judgement
 */
export function validateCompileJudgement(judgement) {
  if (!isObj(judgement)) return finish(['judgement must be an object'])
  const e = []
  if (!JUDGEMENT_ACTIONS.includes(judgement.action)) {
    e.push(`action must be one of ${JUDGEMENT_ACTIONS.join(', ')}`)
  }
  if (!isUnit(judgement.confidence)) e.push('confidence must be in [0, 1]')
  if (judgement.rationale !== undefined && typeof judgement.rationale !== 'string') {
    e.push('rationale must be a string when set')
  }
  if (judgement.body !== undefined) e.push('judgement must not carry page body; pages are projections')
  if (judgement.action === 'upsert_canonical' || judgement.action === 'ground' || judgement.action === 'judge_association') {
    if (!Array.isArray(judgement.evidenceAnchors) || judgement.evidenceAnchors.length === 0) {
      e.push('evidenceAnchors must be a non-empty array for this action')
    } else {
      for (let i = 0; i < judgement.evidenceAnchors.length; i++) {
        const checked = validateEvidenceAnchor(judgement.evidenceAnchors[i])
        if (!checked.ok) e.push(...checked.errors.map((msg) => `evidenceAnchors[${i}]: ${msg}`))
      }
    }
  }
  if (judgement.action === 'upsert_canonical') {
    if (!isObj(judgement.object)) e.push('object is required for upsert_canonical')
    else {
      if (!isStr(judgement.object.kind)) e.push('object.kind is required')
      if (!isStr(judgement.object.title) && !isStr(judgement.object.id)) {
        e.push('object needs title or id')
      }
      if (judgement.object.caliber && !CALIBERS.includes(judgement.object.caliber)) {
        e.push(`object.caliber must be one of ${CALIBERS.join(', ')}`)
      }
      if (judgement.object.caliber === 'accepted' && (!judgement.evidenceAnchors || judgement.evidenceAnchors.length === 0)) {
        e.push('accepted objects need evidenceAnchors')
      }
    }
  }
  if (judgement.action === 'ground') {
    if (!isStr(judgement.bizId)) e.push('bizId is required for ground')
    if (!isStr(judgement.techId)) e.push('techId is required for ground')
    if (!isStr(judgement.predicate)) e.push('predicate is required for ground')
  }
  if (judgement.action === 'flag_coverage') {
    if (!isStr(judgement.detail)) e.push('detail is required for flag_coverage')
  }
  if (judgement.action === 'merge_identity') {
    if (!isStr(judgement.keepId)) e.push('keepId is required for merge_identity')
    if (!isStr(judgement.dropId)) e.push('dropId is required for merge_identity')
  }
  if (judgement.corroboration !== undefined && judgement.corroboration !== null && !isObj(judgement.corroboration)) {
    e.push('corroboration must be an object when set')
  }
  return finish(e)
}

/**
 * @param {object[]} judgements
 */
export function validateCompileJudgements(judgements) {
  if (!Array.isArray(judgements)) return finish(['judgements must be an array'])
  const e = []
  for (let i = 0; i < judgements.length; i++) {
    const checked = validateCompileJudgement(judgements[i])
    if (!checked.ok) e.push(...checked.errors.map((msg) => `[${i}]: ${msg}`))
  }
  return finish(e)
}

/**
 * 一轮编译模型输出：判决列表 + 完整性。
 * @param {object} round
 */
export function validateCompileRoundOutput(round) {
  if (!isObj(round)) return finish(['round output must be an object'])
  const e = []
  const judgements = validateCompileJudgements(round.judgements ?? [])
  if (!judgements.ok) e.push(...judgements.errors)
  if (round.verdict === undefined) e.push('verdict is required')
  else {
    const verdict = validateCompletenessVerdict(round.verdict)
    if (!verdict.ok) e.push(...verdict.errors.map((msg) => `verdict: ${msg}`))
  }
  return finish(e)
}

/**
 * 业务候选稳定键（proposed 阶段 content-address）。
 * @param {string} knowledgeBaseId
 * @param {string} kind
 * @param {string} preferred
 */
export function businessCandidateKey(knowledgeBaseId, kind, preferred) {
  const norm = String(preferred ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
  return `${knowledgeBaseId}\u0000${kind}\u0000${norm}`
}

/**
 * Grounding 稳定 id。
 * @param {string} bizId
 * @param {string} predicate
 * @param {string} techId
 */
export function groundingId(bizId, predicate, techId) {
  return `gnd:${bizId}:${predicate}:${techId}`
}
