/**
 * 多轮收束的纯判定：何时停止、任务状态如何标。
 */
import { isVerdictAbstain, isVerdictComplete } from './completeness.js'

export const DEFAULT_COLLECT_MAX_ROUNDS = 3
export const DEFAULT_COMPILE_MAX_ROUNDS = 3

/**
 * @param {{
 *   roundIndex: number,
 *   maxRounds: number,
 *   verdict: object|null,
 *   additions: number,
 *   previousAdditions: number|null,
 *   aborted?: boolean,
 * }} state
 * @returns {{stop: boolean, status: 'complete'|'done_partial'|'continue'|'cancelled', reason: string}}
 */
export function decideRoundStop(state) {
  if (state.aborted) return { stop: true, status: 'cancelled', reason: 'aborted' }
  if (state.verdict && isVerdictComplete(state.verdict)) {
    return { stop: true, status: 'complete', reason: 'model_complete' }
  }
  if (state.verdict && isVerdictAbstain(state.verdict)) {
    return { stop: true, status: 'complete', reason: 'model_abstain' }
  }
  if (state.roundIndex >= state.maxRounds) {
    return { stop: true, status: 'done_partial', reason: 'max_rounds' }
  }
  if (
    state.previousAdditions != null
    && state.additions === 0
    && state.previousAdditions === 0
  ) {
    return { stop: true, status: 'done_partial', reason: 'zero_delta' }
  }
  return { stop: false, status: 'continue', reason: 'continue' }
}
