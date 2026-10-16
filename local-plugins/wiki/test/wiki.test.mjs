import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyDecision, promoteDraft, revertTo, createWikiStore, createMemoryTable, graphOverview, graphExpand, deadLinks, runDecisionBatch, mergeItems, parseItems } from '../src/index.js'
import { contentHashOf } from '@local/contracts'

const iso = '2026-10-16T10:00:00+08:00'
let clock = 0
const now = () => new Date(Date.parse(iso) + clock++ * 1000).toISOString()

function world() {
  const pages = createMemoryTable()
  const proposals = createMemoryTable()
  const revisions = createMemoryTable()
  const logTable = createMemoryTable()
  const store = createWikiStore({ pages, proposals, revisions, logTable, now })
  const env = { pages: store.pages, proposals: store.proposals, revisions: store.revisions, log: store.log, now }
  return { store, env }
}

const newDec = (over = {}) => ({
  schemaVersion: 1, action: 'new', slug: 'entity/ca_fee_order', pageType: 'entity',
  confidence: 0.9, rationale: '注释覆盖率高', evidenceRefs: ['raw_abc123'],
  body: '# ca_fee_order\n\n订单表，见 [[concept/order_status]]。', ...over,
})

test('a review decision opens a proposal and does not create a page', () => {
  const { store, env } = world()
  const r = applyDecision(newDec({ review: { reasons: ['样本不足'] }, confidence: 0.4, body: '# ca_fee_order\n\n待核。' }), env)
  assert.equal(r.outcome, 'proposal')
  assert.equal(store.pages.get('entity/ca_fee_order'), undefined)
  const proposal = store.proposals.list()[0]
  assert.equal(proposal.kind, 'review')
  assert.equal(proposal.status, 'open')
})

test('high confidence new decision publishes version 1 and records links', () => {
  const { store, env } = world()
  const r = applyDecision(newDec(), env)
  assert.equal(r.outcome, 'published')
  const p = store.pages.get('entity/ca_fee_order')
  assert.equal(p.status, 'published')
  assert.equal(p.version, 1)
  assert.equal(p.draft, null)
  assert.deepEqual(p.links, ['concept/order_status'])
  assert.equal(p.title, 'ca_fee_order')
})

test('mid confidence new decision lands as a draft only; published content is not touched', () => {
  const { store, env } = world()
  const r = applyDecision(newDec({ confidence: 0.6 }), env)
  assert.equal(r.outcome, 'draft')
  const p = store.pages.get('entity/ca_fee_order')
  assert.equal(p.status, 'draft_only')
  assert.equal(p.published, null)
  assert.equal(p.version, 0)
})

test('low confidence decision is logged and writes nothing', () => {
  const { store, env } = world()
  const r = applyDecision(newDec({ confidence: 0.2 }), env)
  assert.equal(r.outcome, 'log')
  assert.equal(store.pages.get('entity/ca_fee_order'), undefined)
  assert.equal(store.logLines().length, 1)
})

test('a low-confidence update writes a draft while the published body keeps being served', () => {
  const { store, env } = world()
  applyDecision(newDec(), env)
  const before = store.pages.get('entity/ca_fee_order')
  const r = applyDecision({ schemaVersion: 1, action: 'update', slug: 'entity/ca_fee_order', confidence: 0.6, rationale: '补充', evidenceRefs: ['raw_bbbbbb'], body: null, patch: { upsert: { 'CLOSED': '已关闭' } } }, env)
  assert.equal(r.outcome, 'draft')
  const after = store.pages.get('entity/ca_fee_order')
  assert.equal(after.status, 'published_with_draft')
  assert.deepEqual(after.published, before.published)
  assert.match(after.draft.body, /CLOSED：已关闭/)
  assert.equal(store.pages.list().length, 1, 'draft and published share one record')
})

test('a high-confidence update publishes, bumps version and snapshots the previous published body', () => {
  const { store, env } = world()
  applyDecision(newDec(), env)
  const r = applyDecision({ schemaVersion: 1, action: 'update', slug: 'entity/ca_fee_order', confidence: 0.95, rationale: '确认', evidenceRefs: ['raw_bbbbbb'], body: null, patch: { upsert: { 'PAID': '已缴费' } } }, env)
  assert.equal(r.outcome, 'published')
  const p = store.pages.get('entity/ca_fee_order')
  assert.equal(p.version, 2)
  assert.equal(p.draft, null)
  assert.equal(store.revisions.get('entity/ca_fee_order', 1).body, '# ca_fee_order\n\n订单表，见 [[concept/order_status]]。')
})

test('new on an existing page and update on a missing page are rejected, not silently merged', () => {
  const { env } = world()
  applyDecision(newDec(), env)
  assert.equal(applyDecision(newDec(), env).outcome, 'rejected')
  assert.equal(applyDecision({ ...newDec(), action: 'update', body: null, patch: { upsert: { A: 'b' } }, slug: 'concept/none' }, env).outcome, 'rejected')
})

test('delete decisions only create a delete proposal, the page stays published', () => {
  const { store, env } = world()
  applyDecision(newDec(), env)
  const r = applyDecision({ schemaVersion: 1, action: 'delete', slug: 'entity/ca_fee_order', confidence: 0.99, rationale: '源表已下线', evidenceRefs: ['raw_abc123'], body: null }, { ...env, decisionId: 'dec_1' })
  assert.equal(r.outcome, 'proposal')
  assert.equal(store.pages.get('entity/ca_fee_order').status, 'published')
  const props = store.proposals.list()
  assert.equal(props.length, 1)
  assert.equal(props[0].kind, 'delete')
  assert.equal(props[0].status, 'open')
})

test('promote draft overwrites published content, bumps version and keeps history', () => {
  const { store, env } = world()
  applyDecision(newDec(), env)
  applyDecision({ schemaVersion: 1, action: 'update', slug: 'entity/ca_fee_order', confidence: 0.6, rationale: '草稿', evidenceRefs: ['raw_bbbbbb'], body: null, patch: { upsert: { CLOSED: '已关闭' } } }, env)
  const r = promoteDraft('entity/ca_fee_order', env)
  assert.equal(r.ok, true)
  const p = store.pages.get('entity/ca_fee_order')
  assert.equal(p.status, 'published')
  assert.equal(p.version, 2)
  assert.match(p.published.body, /CLOSED：已关闭/)
  assert.equal(p.draft, null)
  assert.equal(store.revisions.list('entity/ca_fee_order').length, 1)
})

test('revert writes the old snapshot as a new version and keeps every earlier version', () => {
  const { store, env } = world()
  applyDecision(newDec(), env)
  applyDecision({ schemaVersion: 1, action: 'update', slug: 'entity/ca_fee_order', confidence: 0.95, rationale: '确认', evidenceRefs: ['raw_bbbbbb'], body: null, patch: { upsert: { PAID: '已缴费' } } }, env)
  const r = revertTo('entity/ca_fee_order', 1, env)
  assert.equal(r.ok, true)
  const p = store.pages.get('entity/ca_fee_order')
  assert.equal(p.version, 3)
  assert.equal(p.published.editSource, 'revert')
  assert.doesNotMatch(p.published.body, /PAID/)
  assert.equal(store.revisions.list('entity/ca_fee_order').length, 2)
})

test('a missing page or version refuses revert and promotion', () => {
  const { env } = world()
  assert.equal(revertTo('entity/none', 1, env).ok, false)
  assert.equal(promoteDraft('entity/none', env).ok, false)
})

test('log lines follow the log.md format and every decision is logged', () => {
  const { store, env } = world()
  applyDecision(newDec(), env)
  const lines = store.logLines()
  assert.equal(lines.length, 1)
  assert.match(lines[0], /^## \[.+\] publish \| entity\/ca_fee_order \| /)
})

test('items merge keeps unmentioned entries and text outside the items section', () => {
  const body = '# 字段\n\n说明段。\n\n## 条目\n- PAID：已缴费\n- CLOSED：已关闭\n\n尾注。'
  const out = mergeItems(body, { upsert: { PAID: '已付款', NEW: '新码' }, remove: ['CLOSED'] })
  const { prelude, items, tail } = parseItems(out)
  assert.equal(prelude, '# 字段\n\n说明段。')
  assert.deepEqual([...items.entries()], [['PAID', '已付款'], ['NEW', '新码']])
  assert.deepEqual(tail, ['尾注。'])
})

test('items merge keeps the position of an overwritten key', () => {
  const out = mergeItems('## 条目\n- A：1\n- B：2\n- C：3', { upsert: { B: '二' } })
  assert.deepEqual([...parseItems(out).items.keys()], ['A', 'B', 'C'])
  assert.equal(parseItems(out).items.get('B'), '二')
})

test('link read model: dead links and graph overview with trace edges between summary and entity pages', () => {
  const pages = [
    { slug: 'summary/ds3', pageType: 'summary', title: 'ds3', status: 'published', published: { body: '见 [[entity/a]] 与 [[entity/missing]]', sources: ['raw_1'] } },
    { slug: 'entity/a', pageType: 'entity', title: 'a', status: 'published', published: { body: '指向 [[concept/c]]', sources: ['raw_1'] } },
    { slug: 'concept/c', pageType: 'concept', title: 'c', status: 'published', published: { body: '无链接', sources: [] } },
  ]
  assert.deepEqual(deadLinks(pages), [{ from: 'summary/ds3', to: 'entity/missing' }])
  const g = graphOverview(pages)
  assert.equal(g.nodes.length, 3)
  assert.ok(g.edges.some((e) => e.kind === 'link' && e.source === 'summary/ds3' && e.target === 'entity/a'))
  assert.ok(g.edges.some((e) => e.kind === 'trace' && e.source === 'summary/ds3' && e.target === 'entity/a'))
  const ex = graphExpand(pages, 'concept/c', { depth: 1 })
  assert.deepEqual(ex.nodes.map((n) => n.id).sort(), ['concept/c', 'entity/a'])
  assert.equal(graphExpand(pages, 'nope').nodes.length, 0)
})

test('expansion respects node cap and reports truncation', () => {
  const pages = Array.from({ length: 6 }, (_, i) => ({
    slug: `concept/n${i}`, pageType: 'concept', title: `n${i}`, status: 'published',
    published: { body: i < 5 ? `[[concept/n${i + 1}]]` : '', sources: [] },
  }))
  const ex = graphExpand(pages, 'concept/n0', { depth: 3, maxNodes: 3 })
  assert.equal(ex.nodes.length, 3)
  assert.equal(ex.truncated, true)
})

test('decision batch: valid decisions are applied and the material moves to decided', async () => {
  const { store, env } = world()
  const materialsRecs = new Map([['raw_abc123', { id: 'raw_abc123', status: 'captured' }]])
  const transitions = []
  const materials = {
    transition: async (id, to, extra) => { transitions.push({ id, to, extra }); materialsRecs.get(id).status = to },
  }
  const r = await runDecisionBatch([{ id: 'raw_abc123', status: 'captured' }], {
    decide: async () => [newDec()],
    context: () => ({}),
    materials,
    env,
  })
  assert.equal(r.decided, 1)
  assert.equal(transitions[0].to, 'decided')
  assert.equal(transitions[0].extra.decisionId, 'dec_raw_abc123')
  assert.equal(store.pages.get('entity/ca_fee_order').status, 'published')
})

test('schema-invalid output is retried once, then the material fails with its reason and is replayable', async () => {
  const { store, env } = world()
  const transitions = []
  const materials = { transition: async (id, to, extra) => transitions.push({ id, to, extra }) }
  let calls = 0
  const r = await runDecisionBatch([{ id: 'raw_bad111', status: 'captured' }], {
    decide: async () => { calls++; return [{ action: 'new', slug: 'Bad Name' }] },
    context: () => ({}),
    materials,
    env,
  })
  assert.equal(calls, 2)
  assert.equal(r.failed, 1)
  assert.equal(transitions[0].to, 'failed')
  assert.match(transitions[0].extra.failureReason, /schema invalid/)
  assert.equal(store.pages.list().length, 0)
})

test('a thrown decide call counts as an attempt and does not leave a half-written page', async () => {
  const { store, env } = world()
  const transitions = []
  const materials = { transition: async (id, to, extra) => transitions.push({ id, to, extra }) }
  const r = await runDecisionBatch([{ id: 'raw_err222', status: 'captured' }], {
    decide: async () => { throw new Error('model down') },
    context: () => ({}),
    materials,
    env,
  })
  assert.equal(r.failed, 1)
  assert.match(transitions[0].extra.failureReason, /model down/)
  assert.equal(store.pages.list().length, 0)
})

test('replay of the same fixed material produces the same page content hash', async () => {
  const run = async () => {
    const { store, env } = world()
    const materials = { transition: async () => {} }
    await runDecisionBatch([{ id: 'raw_fixed1', status: 'captured' }], { decide: async () => [newDec()], context: () => ({}), materials, env })
    return contentHashOf(store.pages.get('entity/ca_fee_order').published.body)
  }
  assert.equal(await run(), await run())
})

test('a heading-only body still gets a non-empty summary and publishes', () => {
  const { store, env } = world()
  const r = applyDecision(newDec({ body: '# 只有标题' }), env)
  assert.equal(r.outcome, 'published')
  assert.equal(store.pages.get('entity/ca_fee_order').published.summary, '只有标题')
})
