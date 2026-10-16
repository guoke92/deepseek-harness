/**
 * 字典分流（dict_triage，SQLBot 规则的机械部分）：对低基数候选给出 keep | hold | drop。
 *  - drop：明确不是字典（编号/UUID/哈希样本、时间戳、名称类长文本、*_id/ref_* 关联列、注释显式引用列）
 *  - hold：证据不足（测库仅单值、或取值数量过少而无法判断是否为全码表）；保留审核，不回填字段
 *  - keep：取值为短码（大写字母/数字/下划线，长度有界），数量在阈值内，且不是关联或编号列
 * 只做机械判定；语义确认（码值含义、是否补全对立码）交给 agent 决策层。
 */

const CODE_RE = /^[A-Z][A-Z0-9_]{0,31}$|^[a-z][a-z0-9_]{0,31}$|^[0-9]{1,4}$|^[YN]$/
const NUMERIC_CODE_RE = /^[0-9]{1,4}$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-/i
const HASH_RE = /^[0-9a-f]{16,}$/i
const TIME_RE = /^\d{4}-\d{2}-\d{2}|\d{2}:\d{2}:\d{2}/
const REF_COL_RE = /(^ref_|_ref$|_id$|^id$|_no$|_code_no$|_sn$|_serial$|_number$|_num$|_seq$)/i

/**
 * @param {object} c 字典候选（contracts.Candidate，kind=dict）
 * @param {{dictDistinctMax?: number}} opts
 * @returns {{decision: 'keep'|'hold'|'drop', reasons: string[], values: string[]}}
 */
export function triageDict(c, { dictDistinctMax = 32 } = {}) {
  const reasons = []
  const col = c.left.column
  const topK = (c.evidence?.topK ?? []).map((x) => String(x.value))
  const distinct = c.evidence?.distinctCount ?? topK.length

  if (c.evidence?.commentRef) reasons.push('comment_ref')
  if (REF_COL_RE.test(col)) reasons.push('ref_or_id_column')
  if (distinct === 0) reasons.push('empty')
  if (reasons.length > 0) return { decision: 'drop', reasons, values: [] }

  const hasTime = topK.some((v) => TIME_RE.test(v))
  const hasUuidOrHash = topK.some((v) => UUID_RE.test(v) || HASH_RE.test(v))
  const longText = topK.filter((v) => v.length > 40).length
  if (hasTime) reasons.push('temporal_values')
  if (hasUuidOrHash) reasons.push('uuid_or_hash_values')
  if (longText > 0) reasons.push('long_text_values')
  if (reasons.length > 0) return { decision: 'drop', reasons, values: [] }

  if (distinct === 1) return { decision: 'hold', reasons: ['single_value_maybe_pollution'], values: topK }
  if (distinct > dictDistinctMax) return { decision: 'drop', reasons: ['too_many_distinct'], values: [] }

  const allShort = topK.every((v) => CODE_RE.test(v))
  if (!allShort) return { decision: 'hold', reasons: ['non_code_shape_values'], values: topK }

  // 纯数字码：只有在取值互不相同且数量较少时才算码表，否则可能是序号
  const numeric = topK.filter((v) => NUMERIC_CODE_RE.test(v))
  if (numeric.length === topK.length && distinct > 12) return { decision: 'drop', reasons: ['numeric_sequence_like'], values: [] }

  return { decision: 'keep', reasons: [], values: topK }
}

/** 批量分流，返回按决策分组的计数与明细。 */
export function triageAll(candidates, opts) {
  const dicts = candidates.filter((c) => c.kind === 'dict')
  const out = { keep: [], hold: [], drop: [] }
  for (const c of dicts) {
    const t = triageDict(c, opts)
    out[t.decision].push({ column: `${c.left.table}.${c.left.column}`, reasons: t.reasons, values: t.values })
  }
  return out
}
