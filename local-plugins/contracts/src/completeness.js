/**
 * 采集/编译多轮收束用的完整性判决。
 * complete 为真且 gaps 无 error 级项时才算完整；abstainReasons 表示有条件停止。
 */
import { finish, isObj, isStr, isUnit, isStrArr } from './common.js'

export const GAP_KINDS = Object.freeze([
  'orphan_node', 'broken_link', 'focus_empty', 'missing_grounding', 'conflict',
  'unanchored', 'implicit_pending', 'facet_hole', 'other',
])

export const GAP_SEVERITIES = Object.freeze(['error', 'warning', 'info'])

/**
 * @param {object} gap
 */
export function validateCompletenessGap(gap) {
  if (!isObj(gap)) return finish(['gap must be an object'])
  const e = []
  if (!GAP_KINDS.includes(gap.kind)) e.push(`gap.kind must be one of ${GAP_KINDS.join(', ')}`)
  if (!isStr(gap.detail)) e.push('gap.detail must be a non-empty string')
  if (gap.targetRef !== undefined && gap.targetRef !== null && !isStr(gap.targetRef)) {
    e.push('gap.targetRef must be a non-empty string when set')
  }
  if (gap.suggestedAction !== undefined && gap.suggestedAction !== null && !isStr(gap.suggestedAction)) {
    e.push('gap.suggestedAction must be a non-empty string when set')
  }
  if (gap.severity !== undefined && !GAP_SEVERITIES.includes(gap.severity)) {
    e.push(`gap.severity must be one of ${GAP_SEVERITIES.join(', ')}`)
  }
  return finish(e)
}

/**
 * @param {object} verdict
 */
export function validateCompletenessVerdict(verdict) {
  if (!isObj(verdict)) return finish(['verdict must be an object'])
  const e = []
  if (typeof verdict.complete !== 'boolean') e.push('complete must be a boolean')
  if (!isUnit(verdict.score)) e.push('score must be a number in [0, 1]')
  if (!Array.isArray(verdict.gaps)) e.push('gaps must be an array')
  else {
    for (let i = 0; i < verdict.gaps.length; i++) {
      const checked = validateCompletenessGap(verdict.gaps[i])
      if (!checked.ok) e.push(...checked.errors.map((msg) => `gaps[${i}]: ${msg}`))
    }
  }
  if (verdict.abstainReasons !== undefined) {
    if (!isStrArr(verdict.abstainReasons)) e.push('abstainReasons must be a string array when set')
  }
  return finish(e)
}

/**
 * 是否存在 error 级缺口（未标 severity 的 gap 视为 warning，避免误杀）。
 * @param {object} verdict
 */
export function hasErrorGaps(verdict) {
  return (verdict?.gaps ?? []).some((gap) => gap.severity === 'error')
}

/**
 * 模型认完整且无 error 缺口。
 * @param {object} verdict
 */
export function isVerdictComplete(verdict) {
  return Boolean(verdict?.complete) && !hasErrorGaps(verdict)
}

/**
 * 有条件完成：主动 abstain 且无 error 缺口。
 * @param {object} verdict
 */
export function isVerdictAbstain(verdict) {
  return Array.isArray(verdict?.abstainReasons) && verdict.abstainReasons.length > 0 && !hasErrorGaps(verdict)
}
