/**
 * 原料（corpus 产出，只追加）。一条原料对应一次投递；同一来源与内容哈希再次投递返回已有 id。
 * status 与 decisionId 必须在同一笔存储更新中写入：captured → decided | failed，failed 可重置为 captured 重放。
 */
import { createHash } from 'node:crypto'
import { SOURCE_TYPES, MATERIAL_STATUS } from './enums.js'
import { checkVersion, checkEnum, finish, isIso, isInt, isObj, isStr } from './common.js'

export const MATERIAL_ID_RE = /^raw_[0-9A-Za-z]{6,}$/
export const MAX_CONTENT_CHARS = 200000
const CREDENTIAL_KEY_RE = /^(password|passwd|pwd|secret|token|api[_-]?key|dsn|credential|authorization)$/i

/** 证据中不得出现凭据字段名，递归检查。 */
export function findCredentialKeys(value, path = '') {
  const hits = []
  if (Array.isArray(value)) {
    value.forEach((v, i) => hits.push(...findCredentialKeys(v, `${path}[${i}]`)))
  } else if (isObj(value)) {
    for (const [k, v] of Object.entries(value)) {
      const where = path ? `${path}.${k}` : k
      if (CREDENTIAL_KEY_RE.test(k)) hits.push(where)
      hits.push(...findCredentialKeys(v, where))
    }
  }
  return hits
}

/** 内容哈希（sha256 十六进制）。 */
export function contentHashOf(content) {
  return createHash('sha256').update(String(content), 'utf8').digest('hex')
}

/** 幂等键：同一知识库、同一来源引用与同一内容哈希视为同一条原料。 */
export function materialIdempotencyKey({ knowledgeBaseId = '', sourceType, sourceRef, contentHash }) {
  return `${knowledgeBaseId}\u0000${sourceType}\u0000${sourceRef}\u0000${contentHash}`
}

/** 投递入参：采集器交给 corpus 的内容，尚未分配 id。 */
export function validateMaterialInput(o) {
  if (!isObj(o)) return finish(['value must be an object'])
  const e = []
  checkEnum(o.sourceType, SOURCE_TYPES, 'sourceType', e)
  if (!isStr(o.sourceRef) || o.sourceRef.length > 300) e.push('sourceRef must be a non-empty string of at most 300 characters')
  if (o.datasourceId !== null && !isInt(o.datasourceId, 1)) e.push('datasourceId must be null or a positive integer')
  if (o.sourceType === 'db' && o.datasourceId === null) e.push('db materials must reference a datasourceId')
  if (typeof o.content !== 'string' || o.content.length === 0) e.push('content must be a non-empty string')
  else if (o.content.length > MAX_CONTENT_CHARS) e.push(`content must be at most ${MAX_CONTENT_CHARS} characters`)
  if (!isObj(o.evidence)) e.push('evidence must be an object')
  else for (const hit of findCredentialKeys(o.evidence)) e.push(`evidence must not carry credentials: ${hit}`)
  return finish(e)
}

/** 存储中的原料记录。 */
export function validateRawMaterial(o) {
  if (!isObj(o)) return finish(['value must be an object'])
  const e = []
  checkVersion(o, e)
  if (typeof o.id !== 'string' || !MATERIAL_ID_RE.test(o.id)) e.push('id must look like raw_<id>')
  e.push(...validateMaterialInput(o).errors)
  if (typeof o.contentHash !== 'string' || !/^[0-9a-f]{64}$/.test(o.contentHash)) {
    e.push('contentHash must be a sha256 hex string')
  } else if (typeof o.content === 'string' && o.contentHash !== contentHashOf(o.content)) {
    e.push('contentHash does not match content')
  }
  checkEnum(o.status, MATERIAL_STATUS, 'status', e)
  const hasDecision = typeof o.decisionId === 'string' && o.decisionId.length > 0
  if (o.decisionId !== null && !hasDecision) e.push('decisionId must be null or a non-empty string')
  if (o.status === 'decided' && !hasDecision) e.push('decided materials need decisionId')
  if (o.status === 'captured' && o.decisionId !== null) e.push('captured materials must not have decisionId')
  if (o.status === 'failed') {
    if (!isStr(o.failureReason)) e.push('failed materials need failureReason')
  } else if (o.failureReason !== undefined && o.failureReason !== null) {
    e.push('only failed materials carry failureReason')
  }
  if (!isIso(o.createdAt)) e.push('createdAt must be an ISO-8601 timestamp')
  if (o.knowledgeBaseId !== undefined && !isStr(o.knowledgeBaseId)) e.push('knowledgeBaseId must be a non-empty string')
  return finish(e)
}

const TRANSITIONS = Object.freeze({
  captured: Object.freeze(['decided', 'failed']),
  failed: Object.freeze(['captured']),
  decided: Object.freeze([]),
})

/** 原料状态迁移。decided 为终态；failed 只能重置为 captured 重放。 */
export function validateMaterialTransition(from, to) {
  const e = []
  checkEnum(from, MATERIAL_STATUS, 'from', e)
  checkEnum(to, MATERIAL_STATUS, 'to', e)
  if (e.length === 0 && !(TRANSITIONS[from] ?? []).includes(to)) e.push(`transition ${from} -> ${to} is not allowed`)
  return finish(e)
}
