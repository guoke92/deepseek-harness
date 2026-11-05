/**
 * 一张表的值域、字典标记和可关联字段。阈值只在这里。
 * 输入是已经采样的行，不访问数据库。
 */
import { sketch, resemblance, containment } from './minhash.js'

export const RELATION_RULES = Object.freeze({
  minRows: 20,
  minDistinct: 20,
  fkContainment: 0.9,
  keyUniqueness: 0.9,
  fkTargetMinDistinct: 100,
  reviewContainment: 0.5,
  overlapMinDistinct: 50,
  dictMinNonNull: 20,
  valueListMax: 200,
})

const LARGE_TYPE = /(text|clob|blob|bytea|binary|json)/i
const TIME_TYPE = /^(timestamp|datetime|date|time|year|interval)/i
const NUMERIC_TYPE = /^(tinyint|smallint|mediumint|int|integer|bigint|decimal|numeric|float|double|real|number|money)/i
const SENSITIVE_NAME = /(password|passwd|pwd|secret|token|phone|mobile|id_card|idcard|ssn|bank|card_no|email)/i
const AMOUNT_NAME = /(amount|price|amt|money|balance|cost|_fee$|^fee$)/i
const CERT_TEXT = /(证书|证件|证号|cert_no|license|credit_code|统一社会)/i
const AUDIT_NAME = /^(create|update|created|updated|modify|modified)_(by|user|name|id)$/i
const VERSION_NAME = /^(version|row_version|revision)$/i
const ACTOR_COMMENT = /创建人|更新人|修改人|操作人/
const VERSION_COMMENT = /乐观锁/

/**
 * 由采样行生成列事实，以及参与两两关联的草图。
 * @param {object} meta groupTableMeta 的一项，并带 rowCount
 * @param {{rows: object[], sampleMode: string}} sample
 * @param {{dictDistinctMax?: number, minhashK?: number}} policy
 */
export function buildTableFacts(meta, sample, policy = {}) {
  const rows = sample.rows ?? []
  const dictDistinctMax = policy.dictDistinctMax ?? 32
  const minhashK = policy.minhashK ?? 128
  const built = meta.columns.map((column) => buildColumn(meta, column, rows, { dictDistinctMax, minhashK }))
  return {
    meta,
    columns: built.map((item) => item.column),
    keys: built.map((item) => item.key).filter(Boolean),
    terms: [],
    sampleMode: sample.sampleMode,
    sampleRows: rows.length,
  }
}

/**
 * 可关联字段两两计算 Jaccard，再由两侧包含率决定方向。
 * 两边都叫 id 的列不配对。已经声明的外键不重复推断。
 * @param {object[]} keys buildTableFacts 收集的草图
 * @param {{fromTable: string, fromColumn: string, toTable: string, toColumn: string}[]} [declared]
 */
export function discoverRelations(keys, declared = []) {
  const found = []
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const left = keys[i]
      const right = keys[j]
      if (sameTable(left.table, right.table)) continue
      if (sampleRows(left) < RELATION_RULES.minRows || sampleRows(right) < RELATION_RULES.minRows) continue
      if (left.partial || right.partial) continue
      if (left.bareId && right.bareId) continue
      if (isDeclared(declared, left, right)) continue
      const jaccard = jaccardOf(left, right)
      const relation = judgeRelation(left, right, jaccard)
      if (relation) found.push(relation)
    }
  }
  found.sort((a, b) => relationKey(a).localeCompare(relationKey(b)))
  return found
}

/**
 * 用给定的 Jaccard 判断一对字段。测试和 discoverRelations 共用。
 * @param {object} left
 * @param {object} right
 * @param {number|null} jaccard
 */
/**
 * 用精确命中数判断一对字段。hits 是两侧不同值的交集大小。
 * 采样不完整的一侧不在这里比较，由采集时的回表查询补上。
 * @param {object} left
 * @param {object} right
 * @param {number} hits
 * @param {object[]} [declared]
 */
export function judgeOverlap(left, right, hits, declared = []) {
  if (sameTable(left.table, right.table)) return null
  if (sampleRows(left) < RELATION_RULES.minRows || sampleRows(right) < RELATION_RULES.minRows) return null
  if (left.bareId && right.bareId) return null
  if (isDeclared(declared, left, right)) return null
  const inter = Math.max(0, Math.min(Number(hits) || 0, left.distinct, right.distinct))
  const denom = left.distinct + right.distinct - inter
  const jaccard = denom <= 0 ? 0 : inter / denom
  return judgeRelation(left, right, jaccard)
}

export function judgeRelation(left, right, jaccard) {
  if (jaccard == null) return null
  const cover = containment(jaccard, left.distinct, right.distinct)
  const leftInRight = cover.aInB ?? 0
  const rightInLeft = cover.bInA ?? 0
  if (
    leftInRight >= RELATION_RULES.fkContainment
    && rightInLeft >= RELATION_RULES.fkContainment
    && left.distinct >= RELATION_RULES.overlapMinDistinct
    && right.distinct >= RELATION_RULES.overlapMinDistinct
  ) {
    return relationOf(left, right, leftInRight, rightInLeft, jaccard, 'overlap', 'accepted')
  }
  if (leftInRight >= RELATION_RULES.fkContainment && isKey(right)) {
    return relationOf(left, right, leftInRight, rightInLeft, jaccard, 'directed', 'accepted')
  }
  if (rightInLeft >= RELATION_RULES.fkContainment && isKey(left)) {
    return relationOf(right, left, rightInLeft, leftInRight, jaccard, 'directed', 'accepted')
  }
  const maxCover = Math.max(leftInRight, rightInLeft)
  if (maxCover < RELATION_RULES.reviewContainment) return null
  const held = leftInRight >= rightInLeft
    ? relationOf(left, right, leftInRight, rightInLeft, jaccard, 'directed', 'review')
    : relationOf(right, left, rightInLeft, leftInRight, jaccard, 'directed', 'review')
  const note = reviewHold(left, right, leftInRight, rightInLeft)
  held.hold = note.hold
  held.holdText = note.holdText
  return held
}

/**
 * 把一张表的事实和全库关系收成 db.table 证据。
 * @param {object} partial buildTableFacts 的结果
 * @param {object[]} relations
 * @param {object[]} foreignKeys 绝对形式的声明外键
 */
export function evidenceFor(partial, relations, foreignKeys) {
  const table = partial.meta.tableKey
  return {
    kind: 'db.table',
    table,
    comment: partial.meta.comment ?? null,
    rowCount: partial.meta.rowCount ?? 0,
    sampleRows: partial.sampleRows,
    sampleMode: partial.sampleMode,
    primaryKey: partial.meta.primaryKey ?? [],
    indexes: partial.meta.indexes ?? [],
    declaredForeignKeys: foreignKeys.filter((fk) => sameTable(fk.fromTable, table) || sameTable(fk.toTable, table)),
    columns: partial.columns.map((column) => ({ ...column, sampleRows: partial.sampleRows })),
    relations: relations.filter((rel) => sameTable(rel.fromTable, table) || sameTable(rel.toTable, table)),
    terms: partial.terms,
  }
}

/**
 * 把各表声明的外键收成绝对端点，供关系和证据过滤。
 * @param {object[]} partials
 */
export function declaredEndpoints(partials) {
  const foreignKeys = []
  const pairs = []
  for (const partial of partials) {
    for (const fk of partial.meta.foreignKeys ?? []) {
      foreignKeys.push({
        fromTable: partial.meta.tableKey,
        fromColumns: fk.columns,
        toTable: fk.refTable,
        toColumns: fk.refColumns,
      })
      fk.columns.forEach((column, index) => {
        pairs.push({
          fromTable: partial.meta.tableKey,
          fromColumn: column,
          toTable: fk.refTable,
          toColumn: fk.refColumns[index],
        })
      })
    }
  }
  return { foreignKeys, pairs }
}

function buildColumn(meta, column, rows, { dictDistinctMax, minhashK }) {
  const raw = rows.map((row) => row[column.name])
  const role = columnRole(column, meta.primaryKey, raw)
  const nullCount = raw.filter((value) => canonical(value) == null).length
  const nonNullValues = []
  for (const value of raw) {
    const text = canonical(value)
    if (text != null) nonNullValues.push(text)
  }
  const nonNullCount = nonNullValues.length
  const rowCount = meta.rowCount ?? rows.length
  if (rowCount === 0) {
    return { column: fact(column, role === 'masked' ? 'masked' : role, nullCount, 0, 0, false, { kind: 'summary', note: 'empty' }, false, rows.length, true), key: null }
  }
  if (role === 'masked') {
    return {
      column: fact(column, role, nullCount, nonNullCount, 0, false, { kind: 'redacted' }, false, rows.length, false),
      key: null,
    }
  }
  if (role === 'large') {
    const maxLength = nonNullValues.reduce((max, value) => Math.max(max, value.length), 0)
    return {
      column: fact(column, role, nullCount, nonNullCount, 0, false, { kind: 'length', maxLength }, false, rows.length, false),
      key: null,
    }
  }
  const counts = new Map()
  for (const value of nonNullValues) counts.set(value, (counts.get(value) ?? 0) + 1)
  const distinctValues = [...counts.keys()]
  const distinctCount = distinctValues.length
  const distinctApprox = rowCount > rows.length
  const range = rangeOf(distinctValues)
  const repeats = nonNullCount > 0 && distinctCount * 2 <= nonNullCount
  const small = rowCount < RELATION_RULES.minRows || nonNullCount < RELATION_RULES.dictMinNonNull
  const audit = isAudit(column)
  const rowVersion = isRowVersion(column)
  let dictionary = !small && !audit && !rowVersion && isDictionary(column, role, distinctCount, distinctApprox, nonNullCount, distinctValues, dictDistinctMax, repeats)
  const nextRole = dictionary ? 'enum' : role
  let domain
  if (small) domain = { kind: 'summary', note: 'sample-small' }
  else if (audit || rowVersion) domain = actorDomain(column, rowVersion, range)
  else if (isCertificate(column)) domain = { kind: 'summary' }
  else if (nextRole === 'identifier' || role === 'time' || (role === 'measure' && !dictionary)) {
    domain = { kind: 'range', min: range.min, max: range.max }
  } else if (dictionary || listsValues(role, distinctCount, nonNullCount)) {
    domain = { kind: 'values', values: valueList(counts, nonNullCount) }
  } else {
    domain = { kind: 'summary' }
  }
  const eligible = !small && !audit && !rowVersion && role !== 'time' && distinctCount >= RELATION_RULES.minDistinct
  const mins = eligible ? sketch(distinctValues, minhashK) : null
  return {
    column: fact(column, nextRole, nullCount, nonNullCount, distinctCount, distinctApprox, domain, dictionary, rows.length, true),
    key: mins ? {
      table: meta.tableKey,
      column: column.name,
      distinct: distinctCount,
      nonNull: nonNullCount,
      rowCount,
      uniqueness: nonNullCount === 0 ? 0 : distinctCount / nonNullCount,
      bareId: column.name === 'id',
      partial: rowCount > rows.length,
      probe: role === 'identifier' || isCertificate(column),
      values: distinctValues,
      mins,
    } : null,
  }
}

function fact(column, role, nullCount, nonNullCount, distinctCount, distinctApprox, domain, dictionary, sampleRows, counted) {
  const sampled = Number(sampleRows) || 0
  return {
    name: column.name,
    dataType: column.dataType,
    nullable: column.nullable,
    defaultValue: column.defaultValue ?? null,
    comment: column.comment ?? null,
    role,
    nullCount,
    nonNullCount,
    distinctCount,
    distinctApprox,
    nullRate: sampled > 0 ? round4(nullCount / sampled) : null,
    cardinality: counted ? distinctCount : null,
    selectivity: counted && nonNullCount > 0 ? round4(distinctCount / nonNullCount) : null,
    domain,
    dictionary,
  }
}

function columnRole(column, primaryKey, raw) {
  if (SENSITIVE_NAME.test(column.name)) return 'masked'
  const dataType = String(column.dataType ?? '')
  if (LARGE_TYPE.test(dataType) || declaredLength(dataType) > 128) return 'large'
  if (TIME_TYPE.test(dataType)) return 'time'
  const maxLen = raw.reduce((max, value) => {
    const text = canonical(value)
    return text == null ? max : Math.max(max, text.length)
  }, 0)
  if (column.name === 'id' || primaryKey.includes(column.name) || /_id$/i.test(column.name)) return 'identifier'
  if (NUMERIC_TYPE.test(dataType)) return 'measure'
  if (maxLen > 128) return 'large'
  return 'text'
}

function isDictionary(column, role, distinctCount, distinctApprox, nonNullCount, values, dictDistinctMax, repeats) {
  if (role === 'identifier' || role === 'time' || role === 'masked' || role === 'large') return false
  if (AMOUNT_NAME.test(column.name)) return false
  if (!closed(distinctCount, distinctApprox, nonNullCount, dictDistinctMax) || !repeats) return false
  return isLabelSet(values)
}

function closed(distinctCount, distinctApprox, nonNullCount, dictDistinctMax) {
  return distinctCount >= 2 && distinctCount <= dictDistinctMax && (!distinctApprox || nonNullCount >= distinctCount * 2)
}

function isCertificate(column) {
  const comment = String(column.comment ?? '')
  if (/_type$/i.test(column.name) || /类型/.test(column.name) || /类型/.test(comment)) return false
  return CERT_TEXT.test(column.name) || CERT_TEXT.test(comment)
}

function isAudit(column) {
  return AUDIT_NAME.test(column.name) || ACTOR_COMMENT.test(String(column.comment ?? ''))
}

function isRowVersion(column) {
  return VERSION_NAME.test(column.name) || VERSION_COMMENT.test(String(column.comment ?? ''))
}

function actorDomain(column, rowVersion, range) {
  if (rowVersion || /(_by|_id)$/i.test(column.name) || /id/i.test(String(column.comment ?? ''))) {
    return { kind: 'range', min: range.min, max: range.max }
  }
  return { kind: 'summary' }
}

function jaccardOf(left, right) {
  if (Array.isArray(left.values) && Array.isArray(right.values)) {
    const set = new Set(right.values)
    let inter = 0
    for (const value of left.values) if (set.has(value)) inter++
    const denom = left.values.length + right.values.length - inter
    return denom === 0 ? 0 : inter / denom
  }
  return resemblance(left.mins, right.mins)
}

function listsValues(role, distinctCount, nonNullCount) {
  if (role !== 'text') return false
  if (distinctCount < 2 || distinctCount > RELATION_RULES.valueListMax) return false
  if (nonNullCount === 0) return false
  return distinctCount / nonNullCount < 0.9
}

function sampleRows(side) {
  return side.rowCount ?? side.nonNull ?? 0
}

function isLabelSet(values) {
  if (values.some((value) => value.length > 40)) return false
  const codes = values.every((value) => /^[A-Za-z0-9_-]{1,32}$/.test(value))
  const labels = values.every((value) => value.length <= 40 && /[\u4e00-\u9fff]/.test(value))
  const short = values.every((value) => value.length <= 16)
  return codes || labels || short
}

function valueList(counts, nonNull) {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .map(([value, count]) => ({
      value,
      count,
      share: nonNull === 0 ? 0 : Math.round((count / nonNull) * 1e6) / 1e6,
    }))
}

function rangeOf(values) {
  if (values.length === 0) return { min: null, max: null }
  if (values.every((value) => /^-?\d+$/.test(value))) {
    let min = values[0]
    let max = values[0]
    for (const value of values) {
      if (cmpInt(value, min) < 0) min = value
      if (cmpInt(value, max) > 0) max = value
    }
    return { min, max }
  }
  const sorted = [...values].sort()
  return { min: sorted[0], max: sorted[sorted.length - 1] }
}

function cmpInt(left, right) {
  const a = BigInt(left)
  const b = BigInt(right)
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

function declaredLength(dataType) {
  const match = /(?:var)?char\((\d+)\)/i.exec(String(dataType))
  return match ? Number(match[1]) : 0
}

function canonical(value) {
  if (value === null || value === undefined) return null
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'bigint') return value.toString()
  return String(value)
}

function reviewHold(left, right, leftInRight, rightInLeft) {
  const mutual = leftInRight >= RELATION_RULES.fkContainment && rightInLeft >= RELATION_RULES.fkContainment
  if (mutual) {
    return {
      hold: 'overlap-small',
      holdText: `两边包含率都达到 ${pct(RELATION_RULES.fkContainment)}，取值几乎重合。不同值 ${left.distinct} 和 ${right.distinct} 少于 ${RELATION_RULES.overlapMinDistinct}，不能自动当成同一集合。集合越小，越可能只是碰巧接近。`,
    }
  }
  const forward = leftInRight >= rightInLeft
  const source = forward ? left : right
  const target = forward ? right : left
  const cover = forward ? leftInRight : rightInLeft
  if (cover >= RELATION_RULES.fkContainment) {
    return {
      hold: 'not-a-key',
      holdText: `${source.table}.${source.column} 的取值有 ${pct(cover)} 落在 ${target.table}.${target.column} 里，但后者唯一性 ${round4(target.uniqueness ?? 0)}、不同值 ${target.distinct}，达不到外键目标。外键目标要唯一性至少 ${RELATION_RULES.keyUniqueness}，且不同值至少 ${RELATION_RULES.fkTargetMinDistinct}。`,
    }
  }
  return {
    hold: 'partial',
    holdText: `最高包含率 ${pct(Math.max(leftInRight, rightInLeft))}，高于复核线 ${pct(RELATION_RULES.reviewContainment)}，低于自动发布的 ${pct(RELATION_RULES.fkContainment)}。`,
  }
}

function pct(share) {
  return `${(Number(share) * 100).toFixed(0)}%`
}

function isKey(side) {
  return side.uniqueness >= RELATION_RULES.keyUniqueness && side.distinct >= RELATION_RULES.fkTargetMinDistinct
}

function relationOf(from, to, containmentRate, reverse, jaccard, kind, verdict) {
  const relation = {
    kind,
    fromTable: from.table,
    fromColumn: from.column,
    toTable: to.table,
    toColumn: to.column,
    containment: round4(containmentRate),
    reverseContainment: round4(reverse),
    jaccard: round4(jaccard),
    fromDistinct: from.distinct,
    toDistinct: to.distinct,
    fromUniqueness: round4(from.uniqueness ?? 0),
    toUniqueness: round4(to.uniqueness),
    fromRows: Number.isFinite(from.rowCount) ? from.rowCount : null,
    toRows: Number.isFinite(to.rowCount) ? to.rowCount : null,
    verdict,
  }
  return relation
}

function isDeclared(declared, left, right) {
  return declared.some((pair) => (
    (sameTable(pair.fromTable, left.table) && pair.fromColumn === left.column && sameTable(pair.toTable, right.table) && pair.toColumn === right.column)
    || (sameTable(pair.fromTable, right.table) && pair.fromColumn === right.column && sameTable(pair.toTable, left.table) && pair.toColumn === left.column)
  ))
}

function sameTable(left, right) {
  return left === right || String(left).endsWith(`.${right}`) || String(right).endsWith(`.${left}`)
}

function relationKey(rel) {
  return `${rel.fromTable}.${rel.fromColumn}->${rel.toTable}.${rel.toColumn}`
}

function round4(value) {
  return Math.round(value * 10000) / 10000
}
