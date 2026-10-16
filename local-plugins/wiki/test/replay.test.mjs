import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createWikiService } from '../src/index.js'
import { createMemoryTable } from '../src/index.js'

/** 内存版 storage domain：与 storage-domain 的 table 接口一致（get/put/delete/entries）。 */
function memoryDomain() {
  const tables = new Map()
  return {
    table(name) {
      if (!tables.has(name)) tables.set(name, createMemoryTable())
      return tables.get(name)
    },
  }
}

let tick = 0
const now = () => new Date(Date.parse('2026-10-16T10:00:00+08:00') + (tick++) * 1000).toISOString()

/** 固定原料（与 corpus 的 materials 形状一致）及对应的确定性决策替身。 */
const FIXED_MATERIALS = [
  { id: 'raw_fix0001', sourceRef: 'postgres:ds3/public.ca_fee_order', content: '表 ca_fee_order 订单表，注释覆盖率高。' },
  { id: 'raw_fix0002', sourceRef: 'postgres:ds3/public.ca_fee_order.order_status', content: '字段 order_status 取值 PAID、CLOSED，低基数。' },
  { id: 'raw_fix0003', sourceRef: 'postgres:ds3/public.cust_account_info', content: '表 cust_account_info 客户账户。' },
  { id: 'raw_fix0004', sourceRef: 'postgres:ds3/public.legacy_import', content: '表 legacy_import 已下线。' },
]

/** 确定性替身：按原料 id 给出固定决策（置信度由固定表决定，不是启发式）。 */
const SCRIPTED = {
  raw_fix0001: [{ schemaVersion: 1, action: 'new', slug: 'entity/ca_fee_order', pageType: 'entity', confidence: 0.92, rationale: '注释覆盖', evidenceRefs: ['raw_fix0001'], body: '# ca_fee_order\n\n订单表，客户见 [[entity/cust_account_info]]。' }],
  raw_fix0002: [{ schemaVersion: 1, action: 'new', slug: 'concept/order_status', pageType: 'concept', confidence: 0.6, rationale: '低基数码表，待确认', evidenceRefs: ['raw_fix0002'], body: '# order_status\n\n## 条目\n- PAID：已缴费' }],
  raw_fix0003: [{ schemaVersion: 1, action: 'new', slug: 'entity/cust_account_info', pageType: 'entity', confidence: 0.9, rationale: '客户表', evidenceRefs: ['raw_fix0003'], body: '# cust_account_info\n\n客户账户。' }],
  raw_fix0004: [{ schemaVersion: 1, action: 'delete', slug: 'entity/legacy_import', confidence: 0.95, rationale: '源表已下线', evidenceRefs: ['raw_fix0004'], body: null }],
}

const decide = async ([material]) => SCRIPTED[material.id] ?? []

async function replay() {
  const svc = createWikiService({ domain: memoryDomain(), now })
  const materials = FIXED_MATERIALS.map((m) => ({ ...m, status: 'captured' }))
  const transitions = []
  const result = await svc.decideMaterials(materials, {
    decide,
    context: () => ({}),
    materials: { transition: async (id, to, extra) => transitions.push({ id, to, extra }) },
  })
  return { svc, result, transitions }
}

test('replay of fixed materials: high confidence publishes, mid confidence drafts, delete proposes', async () => {
  const { svc, result } = await replay()
  assert.equal(result.decided, 4)
  assert.equal(result.failed, 0)
  assert.equal(svc.page('entity/ca_fee_order').status, 'published')
  assert.equal(svc.page('concept/order_status').status, 'draft_only', 'confidence 0.6 is between thresholds')
  assert.equal(svc.page('concept/order_status').published, null)
  assert.equal(svc.page('entity/cust_account_info').status, 'published')
  assert.equal(svc.page('entity/legacy_import'), undefined)
  const props = svc.proposals()
  assert.equal(props.length, 1)
  assert.equal(props[0].slug, 'entity/legacy_import')
})

test('replay is deterministic: the same materials give the same pages and the same log', async () => {
  const a = await replay()
  tick = 0
  const b = await replay()
  assert.deepEqual(a.svc.pages().map((p) => [p.slug, p.status, p.version]), b.svc.pages().map((p) => [p.slug, p.status, p.version]))
  assert.deepEqual(a.svc.store.logLines().map((l) => l.replace(/^## \[[^\]]+\] /, '')), b.svc.store.logLines().map((l) => l.replace(/^## \[[^\]]+\] /, '')))
})

test('every replayed page is listed once in the outline and the outline count matches the pages', async () => {
  const { svc } = await replay()
  const outline = svc.outline().split('\n')
  assert.equal(outline.length, svc.pages().length)
  assert.equal(new Set(outline).size, outline.length)
})

test('links are resolved: the entity page links to the customer page, and the graph has that edge', async () => {
  const { svc } = await replay()
  assert.deepEqual(svc.page('entity/ca_fee_order').links, ['entity/cust_account_info'])
  const g = svc.graph()
  assert.ok(g.edges.some((e) => e.source === 'entity/ca_fee_order' && e.target === 'entity/cust_account_info' && e.kind === 'link'))
  assert.equal(svc.lint().deadLinks.length, 0)
})

test('a dead link is reported by lint and never written as a published page', async () => {
  const svc = createWikiService({ domain: memoryDomain(), now })
  const captured = await svc.materials.capture({
    sourceType: 'doc', sourceRef: 'doc:dead-link', datasourceId: null, content: '含死链的原料', evidence: {},
  })
  await svc.decide({ schemaVersion: 1, action: 'new', slug: 'entity/x', pageType: 'entity', confidence: 0.95, rationale: '含死链', evidenceRefs: [captured.id], body: '# x\n\n见 [[entity/none]]' })
  assert.deepEqual(svc.lint().deadLinks, [{ from: 'entity/x', to: 'entity/none' }])
})

test('a draft is searchable with an explicit flag, and published text stays visible to search', async () => {
  const { svc } = await replay()
  const hits = svc.search('订单表').map((h) => h.slug)
  assert.ok(hits.includes('entity/ca_fee_order'))
  const draftOnly = svc.search('PAID', { includeDrafts: true }).map((h) => h.slug)
  assert.ok(draftOnly.includes('concept/order_status'))
  assert.deepEqual(svc.search('PAID', { includeDrafts: false }).map((h) => h.slug), [])
})

test('expanding from a centre page stops at the requested depth', async () => {
  const { svc } = await replay()
  const ex = svc.expand('entity/ca_fee_order', { depth: 1 })
  const ids = ex.nodes.map((n) => n.id).sort()
  assert.deepEqual(ids, ['entity/ca_fee_order', 'entity/cust_account_info'])
})

test('a schema-invalid replay material fails with its reason and stays replayable', async () => {
  const svc = createWikiService({ domain: memoryDomain(), now })
  const transitions = []
  const r = await svc.decideMaterials([{ id: 'raw_bad0001', status: 'captured' }], {
    decide: async () => [{ action: 'new', slug: 'BAD NAME' }],
    context: () => ({}),
    materials: { transition: async (id, to, extra) => transitions.push({ id, to, extra }) },
  })
  assert.equal(r.failed, 1)
  assert.equal(transitions[0].to, 'failed')
  assert.match(transitions[0].extra.failureReason, /schema invalid/)
  assert.equal(svc.pages().length, 0)
})

test('promote and revert through the service keep versions consistent', async () => {
  const { svc } = await replay()
  const promoted = await svc.promote('concept/order_status')
  assert.equal(promoted.ok, true)
  assert.equal(svc.page('concept/order_status').status, 'published')
  const reverted = await svc.revert('concept/order_status', 1)
  assert.equal(reverted.ok, false, 'there is no earlier published version to revert to yet')
})

test('a proposal can be resolved once it is accepted or rejected', async () => {
  const { svc } = await replay()
  const id = svc.proposals()[0].id
  assert.equal((await svc.resolveProposal(id, 'accepted')).status, 'accepted')
  await assert.rejects(svc.resolveProposal(id, 'deleted'), /accepted or rejected/)
  await assert.rejects(svc.resolveProposal('nope', 'accepted'), /not found/)
})
