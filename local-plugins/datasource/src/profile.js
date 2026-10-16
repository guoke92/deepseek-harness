/**
 * 列统计剖析（论文第 2 节：行数、NULL 数、distinct 数、形状、top-k、MinHash）。
 * 纯函数：输入为已采样的列值数组与列元数据，输出符合 contracts.Profile 的对象。
 */
import { sketch } from './minhash.js'

const TEXT_TYPES = /(text|clob|blob|bytea|binary|longtext|mediumtext|tinytext)/i
const JSON_TYPES = /json/i
const DATE_TYPES = /^(date)$/i
const TEMPORAL_TYPES = /(datetime|timestamp|time|year|interval)/i
const AUDIT_OR_TENANT_NAME = /^(create|update)_(by|user|time|date)$|tenant|^version$|^(is_)?deleted?$|^del_flag$|^organization_id$/i

/** 按数据类型与列名判断是否跳过（不参与 MinHash 关联）。返回 skipReason 或 null。 */
export function classifySkip(column) {
  const type = String(column.dataType ?? column.type ?? '')
  if (JSON_TYPES.test(type)) return 'json'
  if (TEXT_TYPES.test(type)) return 'text_blob'
  if (DATE_TYPES.test(type)) return 'date'
  if (TEMPORAL_TYPES.test(type)) return 'temporal'
  if (AUDIT_OR_TENANT_NAME.test(String(column.name))) return 'audit_or_tenant'
  return null
}

/** 规范化为字符串，用于 distinct、topK 与 MinHash（null/undefined 不进入）。 */
export function canonical(v) {
  if (v === null || v === undefined) return null
  if (v instanceof Date) return v.toISOString()
  if (typeof v === 'bigint') return v.toString()
  if (Buffer.isBuffer(v)) return v.toString('hex')
  return String(v)
}

function charClasses(s) {
  const cls = new Set()
  for (const ch of s) {
    if (/[0-9]/.test(ch)) cls.add('digit')
    else if (/[A-Z]/.test(ch)) cls.add('upper')
    else if (/[a-z]/.test(ch)) cls.add('lower')
    else if (/[\u4e00-\u9fff]/.test(ch)) cls.add('cjk')
    else if (/\s/.test(ch)) cls.add('space')
    else cls.add('punct')
  }
  return cls
}

/** 形状：长度范围、字符类、常见两字符前缀（出现 >= 20% 且 >= 2 次）。 */
export function shapeOf(values) {
  let minLen = Infinity
  let maxLen = 0
  const alphabet = new Set()
  const prefixCount = new Map()
  for (const s of values) {
    minLen = Math.min(minLen, s.length)
    maxLen = Math.max(maxLen, s.length)
    for (const c of charClasses(s)) alphabet.add(c)
    if (s.length >= 2) prefixCount.set(s.slice(0, 2), (prefixCount.get(s.slice(0, 2)) ?? 0) + 1)
  }
  const n = values.length
  const commonPrefixes = [...prefixCount.entries()]
    .filter(([, c]) => c >= 2 && c / n >= 0.2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([p]) => p)
  return {
    maxLen: n === 0 ? 0 : maxLen,
    minLen: n === 0 ? 0 : minLen,
    alphabet: [...alphabet].sort(),
    commonPrefixes,
  }
}

function minMax(values) {
  if (values.length === 0) return { min: null, max: null }
  const allNum = values.every((s) => /^-?\d+(\.\d+)?$/.test(s))
  if (allNum) {
    // 不用 Math.min(...arr)：超长数组会栈溢出
    let min = Infinity
    let max = -Infinity
    for (const s of values) {
      const n = Number(s)
      if (n < min) min = n
      if (n > max) max = n
    }
    return { min, max }
  }
  const sorted = [...values].sort()
  return { min: sorted[0], max: sorted[sorted.length - 1] }
}

/**
 * 构建一列的剖析。
 * @param {object} args
 * @param {string} args.table
 * @param {{name:string,dataType?:string,comment?:string|null}} args.column
 * @param {Array<any>} args.values 采样值（含 null）
 * @param {number} args.rowCount 表的真实行数（COUNT(*)）
 * @param {number} args.sampleRows 采样上限
 * @param {number} args.k MinHash 长度
 * @param {number} args.dictDistinctMax 低基数阈值（超过即非字典）
 * @param {number} args.highDefaultRatio 高频默认值阈值（仅对非字典列生效）
 */
export function buildProfile({ table, column, values, rowCount, sampleRows, k = 128, dictDistinctMax = 32, highDefaultRatio = 0.05, topN = 10 }) {
  const skipReason = classifySkip(column)
  const nonNull = []
  let nullCount = 0
  for (const v of values) {
    const s = canonical(v)
    if (s === null) nullCount++
    else nonNull.push(s)
  }
  const sampled = rowCount > values.length
  const counts = new Map()
  for (const s of nonNull) counts.set(s, (counts.get(s) ?? 0) + 1)
  const distinct = [...counts.keys()]
  const topK = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .slice(0, topN)
    .map(([value, count]) => ({ value, count }))

  // 高频默认值：非低基数列中占比超过阈值的取值，从 MinHash 中剔除（不剔除整列）
  const isDictLike = distinct.length <= dictDistinctMax
  const excludedDefaults = []
  if (!isDictLike && nonNull.length > 0) {
    for (const [value, c] of counts) {
      if (c / nonNull.length > highDefaultRatio) excludedDefaults.push(value)
    }
  }
  const excluded = new Set(excludedDefaults)
  const minhashBase = distinct.filter((v) => !excluded.has(v))

  const { min, max } = minMax(distinct)
  return {
    table,
    column: column.name,
    rowCount,
    nullCount: Math.min(nullCount, rowCount),
    distinctCount: distinct.length,
    distinctApprox: sampled,
    min,
    max,
    shape: shapeOf(distinct),
    topK,
    minhash: skipReason ? null : sketch(minhashBase, k),
    skipReason,
    excludedDefaults,
    isDictLike,
    dataType: column.dataType ?? null,
    comment: column.comment ?? null,
    sampleRows,
  }
}
