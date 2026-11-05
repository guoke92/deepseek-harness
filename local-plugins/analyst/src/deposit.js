/**
 * 沉淀投递（P3）：把问数对话中产生的确认信息，转换为 wiki 的原料（RawMaterial）。
 * 纯函数，不做 IO。去重与拒绝规则在这里完成，落库由 wiki 的 ingest 负责。
 *
 * 只接受三类事件（其他一律拒绝，避免把闲聊或未确认内容当作口径）：
 *   - caliber_confirmed：用户明确确认的口径（需要 userConfirmed=true）
 *   - sql_confirmed：用户确认可用的 SQL 及其执行成功的证据（需要 executed=true 且 rowCount 为非负整数）
 *   - label_corrected：用户纠正的字典标签（需要 field、value、label，且 label 非空）
 *
 * 去重键：事件类型 + 规范化内容的哈希。同一内容多次确认只产生一条原料。
 */
import { createHash } from 'node:crypto'
import { contentHashOf, validateRawMaterial } from '@local/contracts'

export const DEPOSIT_KINDS = Object.freeze(['caliber_confirmed', 'sql_confirmed', 'label_corrected'])

const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim()

function fingerprint(kind, key) {
  return createHash('sha256').update(`${kind}\u0000${key}`).digest('hex').slice(0, 16)
}

/**
 * 把一个确认事件转换为原料。不合法返回 { ok:false, reason }。
 * @param {object} ev
 * @param {{now?: Date, datasourceId?: number|null, sessionId?: string}} ctx
 */
export function toRawMaterial(ev, { now = new Date(), datasourceId = null, sessionId = 'unknown' } = {}) {
  if (!ev || typeof ev !== 'object') return { ok: false, reason: 'event must be an object' }
  if (!DEPOSIT_KINDS.includes(ev.kind)) return { ok: false, reason: `unsupported kind: ${ev.kind}` }

  let content
  let key
  let sourceType
  let evidence
  if (ev.kind === 'caliber_confirmed') {
    if (ev.userConfirmed !== true) return { ok: false, reason: 'caliber must be confirmed by the user' }
    if (!norm(ev.text)) return { ok: false, reason: 'caliber text is empty' }
    content = `口径确认：${norm(ev.text)}`
    key = norm(ev.text)
    sourceType = 'conversation'
    evidence = { kind: ev.kind, sessionId, userConfirmed: true }
  } else if (ev.kind === 'sql_confirmed') {
    if (ev.executed !== true) return { ok: false, reason: 'sql must have been executed successfully' }
    if (!Number.isInteger(ev.rowCount) || ev.rowCount < 0) return { ok: false, reason: 'rowCount must be a non-negative integer' }
    const sql = norm(ev.sql)
    if (!sql || !/^(select|with)\b/i.test(sql)) return { ok: false, reason: 'only SELECT/WITH SQL can be deposited' }
    if (sql.includes(';')) return { ok: false, reason: 'multi-statement SQL is not deposited' }
    content = `已确认 SQL（返回 ${ev.rowCount} 行）：${sql}`
    key = sql
    sourceType = 'sql'
    evidence = { kind: ev.kind, sessionId, rowCount: ev.rowCount, sql }
  } else {
    const field = norm(ev.field)
    const value = norm(ev.value)
    const label = norm(ev.label)
    if (!field || !/^[A-Za-z_][\w]*\.[A-Za-z_][\w]*$/.test(field)) return { ok: false, reason: 'field must be table.column' }
    if (!value) return { ok: false, reason: 'value is empty' }
    if (!label) return { ok: false, reason: 'label is empty' }
    content = `字典标签纠正：${field} ${value} = ${label}`
    key = `${field}\u0001${value}\u0001${label}`
    sourceType = 'conversation'
    evidence = { kind: ev.kind, sessionId, field, value, label }
  }

  const id = `raw_dep${fingerprint(ev.kind, key)}`
  const material = {
    schemaVersion: 1,
    id,
    sourceType,
    sourceRef: `deposit:${ev.kind}:${fingerprint(ev.kind, key)}`,
    datasourceId: sourceType === 'sql' ? datasourceId : (datasourceId ?? null),
    content,
    contentHash: contentHashOf(content),
    evidence,
    status: 'captured',
    decisionId: null,
    createdAt: now.toISOString(),
  }
  // 对话与 SQL 原料不要求数据源（SQL 原料若无数据源则不合法，按契约拒绝）
  if (material.sourceType === 'sql' && material.datasourceId === null) {
    return { ok: false, reason: 'sql deposits need a datasourceId' }
  }
  const v = validateRawMaterial(material)
  if (!v.ok) return { ok: false, reason: v.errors.join('; ') }
  return { ok: true, material }
}

/**
 * 批量转换并去重（同一批内相同 id 只保留一条）。
 * 已存在于 wiki 原料库的 id 由调用方传入 existingIds 过滤。
 */
export function depositBatch(events, { existingIds = new Set(), now, datasourceId, sessionId } = {}) {
  const seen = new Set()
  const accepted = []
  const rejected = []
  for (const ev of events) {
    const r = toRawMaterial(ev, { now, datasourceId, sessionId })
    if (!r.ok) {
      rejected.push({ kind: ev?.kind ?? null, reason: r.reason })
      continue
    }
    const id = r.material.id
    if (seen.has(id) || existingIds.has(id)) {
      rejected.push({ kind: ev.kind, reason: 'duplicate' })
      continue
    }
    seen.add(id)
    accepted.push(r.material)
  }
  return { accepted, rejected }
}
