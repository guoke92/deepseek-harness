/**
 * 长期记忆条目。按工作空间加人隔离（subjectId 只在存储层由调用者身份派生，不出现在工具参数里）。
 * kind：profile / preference / interest 为常驻；fact / task 为按问题召回。
 * pending 不进提示词；替代已生效条目时，旧条目保持 active，确认后才切换。
 * 拒绝写入留墓碑（指纹），同一主题键的新说法替代旧说法。
 */
import { MEMORY_KINDS, MEMORY_STATUS, MEMORY_ORIGINS } from './enums.js'
import { checkEnum, finish, isInt, isIso, isObj, isStr, isUnit } from './common.js'

export const MEMORY_CONTENT_MAX_CHARS = 300
export const MEMORY_TOPIC_MAX_CHARS = 80
export const MEMORY_DEFAULT_MAX_ITEMS = 200

/** 一条记忆（存储记录）。 */
export function validateMemoryItem(o) {
  if (!isObj(o)) return finish(['value must be an object'])
  const e = []
  if (!isStr(o.id)) e.push('id must be a non-empty string')
  if (!isStr(o.subjectId)) e.push('subjectId must be a non-empty string')
  checkEnum(o.kind, MEMORY_KINDS, 'kind', e)
  checkEnum(o.status, MEMORY_STATUS, 'status', e)
  checkEnum(o.origin, MEMORY_ORIGINS, 'origin', e)
  if (!isStr(o.content) || o.content.length > MEMORY_CONTENT_MAX_CHARS) {
    e.push(`content must be a non-empty string of at most ${MEMORY_CONTENT_MAX_CHARS} characters`)
  }
  if (typeof o.content === 'string' && /[\n\r]/.test(o.content)) e.push('content must be a single line')
  if (o.topic !== null && (!isStr(o.topic) || o.topic.length > MEMORY_TOPIC_MAX_CHARS)) {
    e.push('topic must be null or a non-empty string of at most 80 characters')
  }
  if (!isUnit(o.confidence)) e.push('confidence must be a number in [0, 1]')
  if (o.supersedes !== null && !isStr(o.supersedes)) e.push('supersedes must be null or an item id')
  if (o.sourceConversationId !== null && !isStr(o.sourceConversationId)) {
    e.push('sourceConversationId must be null or a conversation id')
  }
  if (!isIso(o.createdAt)) e.push('createdAt must be an ISO-8601 timestamp')
  if (o.status === 'pending' && o.origin === 'explicit') e.push('explicit memories are active on creation, never pending')
  if (o.status === 'pending' && o.origin === 'manual') e.push('manual memories are never pending')
  return finish(e)
}

/** 记忆主题键（同一主题的新说法替代旧说法）：去空白与大小写后的非空字符串。 */
export function normalizeTopicKey(topic) {
  return String(topic ?? '').normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ')
}

/** 不可变墓碑：拒绝写入的指纹，避免被反复提取。 */
export function validateMemoryTombstone(o) {
  if (!isObj(o)) return finish(['value must be an object'])
  const e = []
  if (!isStr(o.subjectId)) e.push('subjectId must be a non-empty string')
  if (!isStr(o.fingerprint)) e.push('fingerprint must be a non-empty string')
  if (!isIso(o.createdAt)) e.push('createdAt must be an ISO-8601 timestamp')
  return finish(e)
}

/** 替代关系：新条目替代旧条目时，旧条目必须仍为 active 且与新条目同 kind。 */
export function validateSupersede({ next, previous }) {
  const e = []
  if (!isObj(next) || !isObj(previous)) return finish(['next and previous must be objects'])
  if (previous.status !== 'active') e.push('only an active item can be superseded')
  if (next.kind !== previous.kind) e.push('supersede requires the same kind')
  if (next.subjectId !== previous.subjectId) e.push('supersede requires the same subject')
  return finish(e)
}

/** 每人活跃条目上限校验（默认 200，由 memory 插件配置覆盖）。 */
export function validateActiveCount(count, max = MEMORY_DEFAULT_MAX_ITEMS) {
  return finish(isInt(count, 0, max) ? [] : [`active memory count must be 0..${max}`])
}
