/**
 * 校验辅助：每个 validateXxx 返回 { ok, errors }。
 * 所有 validate 函数只做结构与规则校验，不做 IO。
 */

export const SCHEMA_VERSION = 1

export const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
export const isInt = (v, min = 0, max = Number.MAX_SAFE_INTEGER) =>
  Number.isInteger(v) && v >= min && v <= max
export const isUnit = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1
export const isStr = (v) => typeof v === 'string' && v.length > 0
export const isStrArr = (v) => Array.isArray(v) && v.every((x) => typeof x === 'string')
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/
export const isIso = (v) => typeof v === 'string' && ISO_RE.test(v) && !Number.isNaN(Date.parse(v))

export const finish = (errors) => ({ ok: errors.length === 0, errors })

export function checkVersion(o, errors) {
  if (o.schemaVersion !== SCHEMA_VERSION) errors.push(`schemaVersion must be ${SCHEMA_VERSION}`)
}

export function checkEnum(value, list, name, errors) {
  if (!list.includes(value)) errors.push(`${name} must be one of: ${list.join(', ')}`)
}
