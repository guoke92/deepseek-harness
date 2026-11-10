/**
 * 类型化原料断言与结构/观测指纹。
 * 粗加工写入 assertions；精加工只读断言（无断言时可从 db.table 证据派生）。
 */
import { createHash } from 'node:crypto'
import { finish, isObj, isStr } from './common.js'
import { DB_EVIDENCE_KIND, validateDbTableEvidence } from './db-document.js'

export const ASSERTION_STANCES = Object.freeze([
  'suggested', 'observed', 'inferred', 'proposed', 'accepted', 'rejected', 'superseded',
])

export const DB_EMPHASIS = Object.freeze(['db.schema', 'db.profile', 'db.relation'])

/** @param {unknown} value */
export function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  const keys = Object.keys(value).sort()
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`
}

/** @param {unknown} value */
export function hashStable(value) {
  return createHash('sha256').update(stableStringify(value), 'utf8').digest('hex')
}

/**
 * 校验单条断言头。
 * @param {object} assertion
 */
export function validateAssertion(assertion) {
  if (!isObj(assertion)) return finish(['assertion must be an object'])
  const e = []
  if (!isStr(assertion.key)) e.push('assertion.key must be a non-empty string')
  if (!isStr(assertion.kind)) e.push('assertion.kind must be a non-empty string')
  if (!ASSERTION_STANCES.includes(assertion.stance)) e.push(`assertion.stance must be one of ${ASSERTION_STANCES.join(', ')}`)
  if (!isObj(assertion.payload)) e.push('assertion.payload must be an object')
  return finish(e)
}

/**
 * 校验断言数组。
 * @param {unknown} assertions
 */
export function validateAssertions(assertions) {
  if (assertions === undefined || assertions === null) return finish([])
  if (!Array.isArray(assertions)) return finish(['assertions must be an array'])
  const e = []
  const keys = new Set()
  for (const item of assertions) {
    const one = validateAssertion(item)
    e.push(...one.errors)
    if (isStr(item?.key)) {
      if (keys.has(item.key)) e.push(`duplicate assertion key ${item.key}`)
      keys.add(item.key)
    }
  }
  return finish(e)
}

/**
 * 由 db.table 证据派生粗加工断言与双指纹。
 * @param {object} evidence
 * @returns {{emphasis: string, assertions: object[], structureHash: string, profileHash: string}}
 */
export function buildDbAssertions(evidence) {
  const checked = validateDbTableEvidence(evidence)
  if (!checked.ok) throw new Error(checked.errors.join('; '))
  if (evidence.kind !== DB_EVIDENCE_KIND) throw new Error(`evidence.kind must be ${DB_EVIDENCE_KIND}`)

  const schema = []
  schema.push({
    key: 'table',
    kind: 'table',
    stance: 'observed',
    payload: { name: evidence.table, comment: evidence.comment ?? null },
  })
  for (const column of evidence.columns) {
    schema.push({
      key: `col:${column.name}`,
      kind: 'column',
      stance: 'observed',
      payload: {
        name: column.name,
        dataType: column.dataType,
        nullable: column.nullable,
        defaultValue: column.defaultValue ?? null,
        comment: column.comment ?? null,
      },
    })
  }
  if (evidence.primaryKey?.length) {
    schema.push({
      key: 'pk',
      kind: 'primaryKey',
      stance: 'observed',
      payload: { columns: [...evidence.primaryKey] },
    })
  }
  for (const index of evidence.indexes ?? []) {
    schema.push({
      key: `idx:${index.name}`,
      kind: 'index',
      stance: 'observed',
      payload: { name: index.name, unique: Boolean(index.unique), columns: [...index.columns] },
    })
  }
  for (const fk of evidence.declaredForeignKeys ?? []) {
    const id = `${fk.fromColumns.join(',')}>${fk.toTable}.${fk.toColumns.join(',')}`
    schema.push({
      key: `fk:${id}`,
      kind: 'foreignKey',
      stance: 'observed',
      payload: { ...fk },
    })
  }

  const profile = [{
    key: 'tableProfile',
    kind: 'tableProfile',
    stance: 'observed',
    payload: {
      rowCount: evidence.rowCount,
      sampleMode: evidence.sampleMode ?? null,
      sampleRows: evidence.sampleRows ?? null,
    },
  }]
  for (const column of evidence.columns) {
    profile.push({
      key: `prof:${column.name}`,
      kind: 'columnProfile',
      stance: 'observed',
      payload: {
        column: column.name,
        role: column.role,
        nullRate: column.nullRate ?? null,
        nullCount: column.nullCount ?? null,
        nonNullCount: column.nonNullCount ?? null,
        cardinality: column.cardinality ?? column.distinctCount ?? null,
        selectivity: column.selectivity ?? null,
        distinctApprox: column.distinctApprox ?? false,
        domain: column.domain ?? null,
        dictionary: Boolean(column.dictionary),
      },
    })
  }

  const relation = []
  for (const rel of evidence.relations ?? []) {
    const id = `${rel.fromTable}.${rel.fromColumn}->${rel.toTable}.${rel.toColumn}`
    relation.push({
      key: `assoc:${id}`,
      kind: 'assocCandidate',
      stance: rel.verdict === 'accepted' ? 'observed' : 'inferred',
      payload: { ...rel },
    })
  }
  for (const term of evidence.terms ?? []) {
    relation.push({
      key: `term:${term.term}:${term.column}`,
      kind: 'termHint',
      stance: 'proposed',
      payload: { term: term.term, column: term.column },
    })
  }

  const assertions = [...schema, ...profile, ...relation]
  return {
    emphasis: 'db.schema+db.profile+db.relation',
    assertions,
    structureHash: hashStable(schema),
    profileHash: hashStable(profile),
  }
}
