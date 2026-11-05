/**
 * log.md 单行格式：`## [时间] 类型 | 引用 | 摘要`。时间为 ISO-8601（带偏移）。
 */
import { checkEnum, isIso, isStr } from './common.js'

export const LOG_TYPES = Object.freeze(['ingest', 'decide', 'publish', 'draft', 'propose', 'lint', 'query-writeback', 'revert'])

const LOG_RE = /^## \[([^\]]+)\] ([a-z-]+) \| ([^|\n]+?) \| (.+)$/

/** 生成一行日志。 */
export function formatLogEntry({ at, type, ref, summary }) {
  const e = []
  if (!isIso(at)) e.push('at must be an ISO-8601 timestamp')
  checkEnum(type, LOG_TYPES, 'type', e)
  if (!isStr(ref) || /[|\n]/.test(ref)) e.push('ref must be non-empty and contain no | or newline')
  if (!isStr(summary) || /\n/.test(summary)) e.push('summary must be a single non-empty line')
  if (e.length > 0) return { ok: false, errors: e, line: null }
  return { ok: true, errors: [], line: `## [${at}] ${type} | ${ref} | ${summary}` }
}

/** 解析一行日志；格式不符则 ok=false。 */
export function parseLogEntry(line) {
  const m = typeof line === 'string' ? LOG_RE.exec(line) : null
  if (!m) return { ok: false, errors: ['line does not match the log format'], entry: null }
  const [, at, type, ref, summary] = m
  const e = []
  if (!isIso(at)) e.push('timestamp is not ISO-8601')
  checkEnum(type, LOG_TYPES, 'type', e)
  if (e.length > 0) return { ok: false, errors: e, entry: null }
  return { ok: true, errors: [], entry: { at, type, ref, summary } }
}
