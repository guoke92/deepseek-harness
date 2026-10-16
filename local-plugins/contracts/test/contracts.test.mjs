import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as c from '../src/index.js'
import { material, decisionNew, decisionUpdate, decisionDelete, page, iso, sha, memoryItem, policyOverride } from './fixtures.mjs'

const ok = (r) => assert.equal(r.ok, true, r.errors.join('; '))
const bad = (r) => assert.equal(r.ok, false, 'expected rejection')
const withMat = (patch) => ({ ...material, ...patch })
const withDec = (patch) => ({ ...decisionNew, ...patch })

test('slug and [[link]] parsing accept only one-level lowercase slugs', () => {
  ok(c.validateSlug('index'))
  ok(c.validateSlug('entity/ca_fee_order'))
  bad(c.validateSlug('../etc/passwd'))
  bad(c.validateSlug('Entity/Upper'))
  bad(c.validateSlug('a/b/c'))
  bad(c.validateSlug(''))
  bad(c.validateSlug('x'.repeat(121)))
  const links = c.parseWikiLinks('见 [[entity/a]] 与 [[entity/a]]、[[concept/b]]，坏的 [[Bad Name]]')
  assert.deepEqual(links.slugs, ['entity/a', 'concept/b'])
  assert.deepEqual(links.invalid, ['Bad Name'])
  bad(c.validateBodyLinks('# x [[Bad Name]]'))
  ok(c.validateBodyLinks('# x [[entity/a]]'))
  ok(c.validateBodyLinks(null))
})

test('RawMaterial: id format, sourceType enum, datasource requirement and hash consistency', () => {
  const m = { ...material, contentHash: c.contentHashOf(material.content) }
  ok(c.validateRawMaterial(m))
  bad(c.validateRawMaterial({ ...m, id: 'x1' }))
  bad(c.validateRawMaterial({ ...m, sourceType: 'web' }))
  bad(c.validateRawMaterial({ ...m, datasourceId: null }))
  ok(c.validateRawMaterial({ ...m, sourceType: 'conversation', datasourceId: null, sourceRef: 'conversation:conv_1' }))
  bad(c.validateRawMaterial({ ...m, createdAt: '2026-10-16' }))
  bad(c.validateRawMaterial({ ...m, contentHash: sha }))
  bad(c.validateRawMaterial({ ...m, contentHash: 'XYZ' }))
})

test('RawMaterial status and decisionId move together', () => {
  const m = { ...material, contentHash: c.contentHashOf(material.content) }
  ok(c.validateRawMaterial({ ...m, status: 'decided', decisionId: 'dec_1' }))
  bad(c.validateRawMaterial({ ...m, status: 'decided', decisionId: null }))
  bad(c.validateRawMaterial({ ...m, status: 'captured', decisionId: 'dec_1' }))
  ok(c.validateRawMaterial({ ...m, status: 'failed', failureReason: 'schema invalid twice' }))
  bad(c.validateRawMaterial({ ...m, status: 'failed' }))
  bad(c.validateRawMaterial({ ...m, status: 'captured', failureReason: 'stale' }))
})

test('RawMaterial state transitions: captured→decided|failed, failed→captured, decided is terminal', () => {
  ok(c.validateMaterialTransition('captured', 'decided'))
  ok(c.validateMaterialTransition('captured', 'failed'))
  ok(c.validateMaterialTransition('failed', 'captured'))
  bad(c.validateMaterialTransition('decided', 'captured'))
  bad(c.validateMaterialTransition('failed', 'decided'))
  bad(c.validateMaterialTransition('captured', 'bogus'))
})

test('material input rejects credentials in evidence and oversized content', () => {
  ok(c.validateMaterialInput(material))
  bad(c.validateMaterialInput(withMat({ evidence: { dsn: 'postgres://u:p@h/db' } })))
  bad(c.validateMaterialInput(withMat({ evidence: { nested: [{ password: 'x' }] } })))
  bad(c.validateMaterialInput(withMat({ content: '' })))
  bad(c.validateMaterialInput(withMat({ content: 'x'.repeat(c.MAX_CONTENT_CHARS + 1) })))
  bad(c.validateMaterialInput(withMat({ sourceRef: '' })))
})

test('materialIdempotencyKey is stable for the same source and content hash', () => {
  const a = c.materialIdempotencyKey({ sourceType: 'db', sourceRef: 'x', contentHash: sha })
  const b = c.materialIdempotencyKey({ sourceType: 'db', sourceRef: 'x', contentHash: sha })
  const d = c.materialIdempotencyKey({ sourceType: 'db', sourceRef: 'x', contentHash: 'b'.repeat(64) })
  assert.equal(a, b)
  assert.notEqual(a, d)
})

test('Decision new needs body, slug and pageType; must not carry a patch', () => {
  ok(c.validateDecision(decisionNew))
  bad(c.validateDecision(withDec({ body: null })))
  bad(c.validateDecision(withDec({ body: '' })))
  bad(c.validateDecision(withDec({ pageType: undefined })))
  bad(c.validateDecision(withDec({ pageType: 'synthesis-but-bogus' })))
  bad(c.validateDecision(withDec({ pageType: 'synthesis' })))
  bad(c.validateDecision(withDec({ pageType: 'comparison' })))
  ok(c.validateDecision(withDec({ pageType: 'summary', slug: 'summary/ds3' })))
  bad(c.validateDecision(withDec({ patch: { upsert: { A: 'b' } } })))
  bad(c.validateDecision(withDec({ slug: '../x' })))
  bad(c.validateDecision(withDec({ body: '# bad link [[Oops Name]]' })))
})

test('Decision update: exactly one of body or patch; patch must change at least one item', () => {
  ok(c.validateDecision(decisionUpdate))
  bad(c.validateDecision({ ...decisionUpdate, body: '# 整页替换' }))
  bad(c.validateDecision({ ...decisionUpdate, patch: null }))
  bad(c.validateDecision({ ...decisionUpdate, patch: { upsert: {} } }))
  ok(c.validateDecision({ ...decisionUpdate, patch: { remove: ['CLOSED'] } }))
  bad(c.validateDecision({ ...decisionUpdate, patch: { upsert: { 'A：B': 'x' } } }))
  bad(c.validateDecision({ ...decisionUpdate, patch: { upsert: { K: 'a\nb' } } }))
  ok(c.validateDecision({ ...decisionUpdate, body: '# 正文更新', patch: null }))
})

test('Decision delete carries neither body nor patch', () => {
  ok(c.validateDecision(decisionDelete))
  bad(c.validateDecision({ ...decisionDelete, body: '# x' }))
  bad(c.validateDecision({ ...decisionDelete, patch: { remove: ['A'] } }))
})

test('Decision confidence, rationale and evidence bounds', () => {
  bad(c.validateDecision(withDec({ confidence: 1.2 })))
  bad(c.validateDecision(withDec({ confidence: -0.1 })))
  bad(c.validateDecision(withDec({ rationale: 'x'.repeat(c.MAX_RATIONALE_CHARS + 1) })))
  bad(c.validateDecision(withDec({ evidenceRefs: [] })))
  bad(c.validateDecision(withDec({ evidenceRefs: [''] })))
  bad(c.validateDecision(withDec({ schemaVersion: 2 })))
})

test('Decision review info only on new decisions; routeDecision thresholds', () => {
  ok(c.validateDecision(withDec({ review: { reasons: ['non_code_shape_values'] } })))
  bad(c.validateDecision({ ...decisionUpdate, review: { reasons: ['x'] } }))
  bad(c.validateDecision(withDec({ review: { reasons: [] } })))
  const t = { autoPublishThreshold: 0.85, draftThreshold: 0.5 }
  assert.equal(c.routeDecision({ action: 'new', confidence: 0.9 }, t), 'publish')
  assert.equal(c.routeDecision({ action: 'new', confidence: 0.85 }, t), 'publish')
  assert.equal(c.routeDecision({ action: 'new', confidence: 0.6 }, t), 'draft')
  assert.equal(c.routeDecision({ action: 'new', confidence: 0.2 }, t), 'log')
  assert.equal(c.routeDecision({ action: 'delete', confidence: 0.99 }, t), 'proposal')
})

test('WikiPage: published content and draft are fields of one record, status must agree', () => {
  ok(c.validateWikiPage(page))
  ok(c.validateWikiPage({ ...page, status: 'published_with_draft', draft: { ...page.published, body: '# 草稿 [[concept/order_status]]' } }))
  bad(c.validateWikiPage({ ...page, status: 'published_with_draft', draft: null }))
  bad(c.validateWikiPage({ ...page, status: 'published', draft: page.published }))
  bad(c.validateWikiPage({ ...page, status: 'draft_only', published: page.published, draft: null }))
  ok(c.validateWikiPage({ ...page, status: 'draft_only', version: 0, published: null, draft: page.published }))
  bad(c.validateWikiPage({ ...page, status: 'draft_only', version: 0, published: null, draft: null }))
  bad(c.validateWikiPage({ ...page, version: 0 }))
  bad(c.validateWikiPage({ ...page, slug: 'Entity/CA' }))
  bad(c.validateWikiPage({ ...page, pageType: 'synthesis-typo' }))
  bad(c.validateWikiPage({ ...page, links: ['Bad Name'] }))
  bad(c.validateWikiPage({ ...page, published: { ...page.published, body: '' } }))
  bad(c.validateWikiPage({ ...page, published: { ...page.published, confidence: 2 } }))
  bad(c.validateWikiPage({ ...page, published: { ...page.published, editSource: 'bot' } }))
})

test('WikiPage allows hand-written synthesis and comparison types; pipeline types are the four automatic ones', () => {
  ok(c.validateWikiPage({ ...page, pageType: 'synthesis' }))
  ok(c.validateWikiPage({ ...page, pageType: 'comparison' }))
  ok(c.validateWikiPage({ ...page, pageType: 'index', slug: 'index' }))
  ok(c.validateWikiPage({ ...page, pageType: 'summary', slug: 'summary/ds3' }))
  ok(c.validateWikiPage({ ...page, pageType: 'concept', slug: 'concept/order_status' }))
  assert.deepEqual(c.PIPELINE_PAGE_TYPES, ['entity', 'concept', 'summary', 'index'])
})

test('PageRevision: positive version, known source, full snapshot required', () => {
  const rev = { schemaVersion: 1, slug: page.slug, version: 1, source: 'pipeline', snapshot: page.published, createdAt: iso }
  ok(c.validatePageRevision(rev))
  bad(c.validatePageRevision({ ...rev, version: 0 }))
  bad(c.validatePageRevision({ ...rev, source: 'bot' }))
  bad(c.validatePageRevision({ ...rev, snapshot: { summary: 'only' } }))
  ok(c.validatePageRevision({ ...rev, source: 'revert' }))
})

test('DeleteProposal and ReviewProposal shapes', () => {
  const dp = { schemaVersion: 1, id: 'dp_1', slug: 'summary/legacy_import', reason: '源表已下线', decisionId: 'dec_1', createdAt: iso, status: 'open' }
  ok(c.validateDeleteProposal(dp))
  bad(c.validateDeleteProposal({ ...dp, status: 'deleted' }))
  bad(c.validateDeleteProposal({ ...dp, slug: '../x' }))
  const rp = { schemaVersion: 1, kind: 'review', id: 'rv_1', slug: 'dicts/ca_fee_order__order_status', reasons: ['single_value_maybe_pollution'], decisionId: 'dec_2', createdAt: iso, status: 'open' }
  ok(c.validateReviewProposal(rp))
  bad(c.validateReviewProposal({ ...rp, kind: 'delete' }))
  bad(c.validateReviewProposal({ ...rp, reasons: [] }))
})

test('Memory item: single line, kind/status/origin enums, pending never explicit or manual', () => {
  ok(c.validateMemoryItem(memoryItem))
  bad(c.validateMemoryItem({ ...memoryItem, kind: 'secret' }))
  bad(c.validateMemoryItem({ ...memoryItem, content: '第一行\n第二行' }))
  bad(c.validateMemoryItem({ ...memoryItem, content: 'x'.repeat(c.MEMORY_CONTENT_MAX_CHARS + 1) }))
  bad(c.validateMemoryItem({ ...memoryItem, status: 'pending', origin: 'explicit' }))
  bad(c.validateMemoryItem({ ...memoryItem, status: 'pending', origin: 'manual' }))
  ok(c.validateMemoryItem({ ...memoryItem, status: 'pending', origin: 'extracted', confidence: 0.6 }))
  bad(c.validateMemoryItem({ ...memoryItem, confidence: 1.5 }))
  bad(c.validateMemoryItem({ ...memoryItem, subjectId: '' }))
})

test('Memory supersede: only active items, same kind and subject; topic normalization', () => {
  const prev = { ...memoryItem, id: 'mem_old', content: '住在上海' }
  const next = { ...memoryItem, id: 'mem_new', content: '住在北京' }
  ok(c.validateSupersede({ next, previous: prev }))
  bad(c.validateSupersede({ next, previous: { ...prev, status: 'superseded' } }))
  bad(c.validateSupersede({ next: { ...next, kind: 'fact' }, previous: prev }))
  bad(c.validateSupersede({ next: { ...next, subjectId: 'other' }, previous: prev }))
  assert.equal(c.normalizeTopicKey('  回答  语言 '), '回答 语言')
  assert.equal(c.normalizeTopicKey('Answer Language'), 'answer language')
})

test('Memory tombstone and active-count cap', () => {
  ok(c.validateMemoryTombstone({ subjectId: 'tenant:1|user:alice', fingerprint: 'f'.repeat(16), createdAt: iso }))
  bad(c.validateMemoryTombstone({ subjectId: 'x', fingerprint: '', createdAt: iso }))
  ok(c.validateActiveCount(200))
  bad(c.validateActiveCount(201))
  ok(c.validateActiveCount(5, 10))
})

test('policy: defaults validate; mergePolicy applies only differences', () => {
  ok(c.validatePolicy(c.defaultPolicy()))
  const merged = c.mergePolicy(policyOverride)
  ok(merged)
  assert.equal(merged.policy.query.output.chart, 'off')
  assert.equal(merged.policy.memory.autoExtract, true)
  assert.equal(merged.policy.query.safety.maxRows, 200)
  assert.equal(c.defaultPolicy().query.output.chart, 'auto')
})

test('policy merge rejects unknown keys, wrong types, safety loosening and inverted thresholds', () => {
  bad(c.mergePolicy({ query: { safety: { readonly: false } } }))
  bad(c.mergePolicy({ query: { safety: { maxRows: 5000 } } }))
  bad(c.mergePolicy({ query: { output: { chart: 'pie' } } }))
  bad(c.mergePolicy({ query: { bogus: 1 } }))
  bad(c.mergePolicy({ wiki: { autoPublishThreshold: 0.3, draftThreshold: 0.6 } }))
  bad(c.mergePolicy({ memory: { maxActiveItems: 0 } }))
  bad(c.mergePolicy({ memory: { enabled: 'yes' } }))
  bad(c.mergePolicy('not-an-object'))
})

test('validatePolicyScope accepts global or datasource:<id> only', () => {
  ok(c.validatePolicyScope('global'))
  ok(c.validatePolicyScope('datasource:3'))
  bad(c.validatePolicyScope('datasource:0'))
  bad(c.validatePolicyScope('datasource:abc'))
  bad(c.validatePolicyScope('tenant:1'))
})

test('enum exports include both the pipeline and hand-written page types', () => {
  assert.deepEqual(c.PAGE_TYPES, ['entity', 'concept', 'summary', 'index', 'synthesis', 'comparison'])
  assert.deepEqual(c.SOURCE_TYPES, ['db', 'code', 'sql', 'doc', 'conversation'])
})
