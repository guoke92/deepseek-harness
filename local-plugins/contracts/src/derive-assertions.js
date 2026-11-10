/**
 * 原料断言读取：显式 assertions，否则按证据种类派生。
 */
import { buildDbAssertions, validateAssertions } from './assertions.js'
import { DB_EVIDENCE_KIND } from './db-document.js'
import { buildCodeAssertions, CODE_EVIDENCE_KIND } from './project-code.js'
import { buildDocAssertions, DOC_EVIDENCE_KIND } from './project-doc.js'

export const CODE_ASSERTION_KINDS = Object.freeze([
  'module', 'enum', 'mapping', 'transition', 'api',
])
export const DOC_ASSERTION_KINDS = Object.freeze([
  'artifact', 'definition', 'processStep', 'policyDraft', 'scenario',
])
export const DB_ASSERTION_KINDS = Object.freeze([
  'table', 'column', 'primaryKey', 'index', 'foreignKey', 'tableProfile',
  'columnProfile', 'assocCandidate', 'termHint',
])

/**
 * @param {object[]} assertions
 * @param {readonly string[]} allowed
 */
export function validateAssertionKinds(assertions, allowed) {
  const set = new Set(allowed)
  const errors = []
  for (const item of assertions ?? []) {
    if (item?.kind && !set.has(item.kind)) errors.push(`assertion.kind ${item.kind} is not allowed`)
  }
  return { ok: errors.length === 0, errors }
}

/**
 * 原料上的断言：显式 assertions，否则从证据派生。
 * @param {object} material
 */
export function assertionsOf(material) {
  if (Array.isArray(material?.assertions) && material.assertions.length > 0) {
    const checked = validateAssertions(material.assertions)
    if (!checked.ok) throw new Error(checked.errors.join('; '))
    return {
      emphasis: material.emphasis ?? 'custom',
      assertions: material.assertions,
      structureHash: material.structureHash ?? null,
      profileHash: material.profileHash ?? null,
    }
  }
  const kind = material?.evidence?.kind
  if (kind === DB_EVIDENCE_KIND) return buildDbAssertions(material.evidence)
  if (kind === CODE_EVIDENCE_KIND) return buildCodeAssertions(material.evidence)
  if (kind === DOC_EVIDENCE_KIND) return buildDocAssertions(material.evidence)
  return { emphasis: null, assertions: [], structureHash: null, profileHash: null }
}
