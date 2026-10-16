import { test } from 'node:test'
import assert from 'node:assert/strict'
import { apply } from '../src/entry-v2.js'
import { createMemoryTable } from '../src/index.js'

function stubCtx() {
  const registered = []
  const tables = new Map()
  const table = (n) => {
    if (!tables.has(n)) tables.set(n, createMemoryTable())
    return tables.get(n)
  }
  return {
    registered,
    logger: { error: () => {} },
    effect: (fn) => fn,
    provide: () => () => {},
    get: () => undefined,
    storageDomain: { open: async () => ({ table, close: async () => {} }) },
    tools: { register: (def) => { registered.push(def); return () => {} } },
  }
}
const exec = (ctx, name, args) => ctx.registered.find((t) => t.name === name).execute(args)
const dec = (over = {}) => ({ schemaVersion: 1, action: 'new', slug: 'entity/ca_fee_order', pageType: 'entity', confidence: 0.92, rationale: '注释覆盖', evidenceRefs: ['raw_abc123'], body: '# ca_fee_order\n\n订单表。', ...over })

async function withMaterial(ctx) {
  const { ready } = apply(ctx)
  const svc = await ready
  const captured = await svc.materials.capture({
    sourceType: 'db', sourceRef: 'db:ds1/ca_fee_order.amount', datasourceId: 1,
    content: 'ca_fee_order.amount', evidence: {},
  })
  return captured.id
}

test('the model sees wiki read tools, material tools, collect, and one gated decision writer', () => {
  const ctx = stubCtx()
  apply(ctx)
  const names = ctx.registered.map((t) => t.name).sort()
  assert.deepEqual(names, [
    'wiki_apply_decision', 'wiki_collect', 'wiki_compile', 'wiki_get_material', 'wiki_graph_expand',
    'wiki_list_materials', 'wiki_outline', 'wiki_read_page', 'wiki_search',
  ])
})

test('apply_decision rejects evidence that is not a stored material', async () => {
  const ctx = stubCtx()
  apply(ctx)
  const out = JSON.parse(await exec(ctx, 'wiki_apply_decision', { decision: dec() }))
  assert.equal(out.outcome, 'rejected')
  assert.match(out.reason, /unknown evidence refs: raw_abc123/)
  assert.equal(JSON.parse(await exec(ctx, 'wiki_outline', {})), '')
})

test('apply_decision rejects an invalid decision and writes nothing', async () => {
  const ctx = stubCtx()
  apply(ctx)
  const out = JSON.parse(await exec(ctx, 'wiki_apply_decision', { decision: dec({ slug: 'Bad Name' }) }))
  assert.match(out.error, /decision invalid/)
  assert.equal(JSON.parse(await exec(ctx, 'wiki_outline', {})), '')
})

test('a high-confidence model decision publishes and becomes readable', async () => {
  const ctx = stubCtx()
  const id = await withMaterial(ctx)
  const r = JSON.parse(await exec(ctx, 'wiki_apply_decision', { decision: dec({ evidenceRefs: [id] }) }))
  assert.equal(r.outcome, 'published')
  const page = JSON.parse(await exec(ctx, 'wiki_read_page', { slug: 'entity/ca_fee_order' }))
  assert.equal(page.status, 'published')
  assert.equal(page.version, 1)
})

test('a mid-confidence model decision lands as a draft only', async () => {
  const ctx = stubCtx()
  const id = await withMaterial(ctx)
  const r = JSON.parse(await exec(ctx, 'wiki_apply_decision', { decision: dec({ confidence: 0.6, evidenceRefs: [id] }) }))
  assert.equal(r.outcome, 'draft')
  const page = JSON.parse(await exec(ctx, 'wiki_read_page', { slug: 'entity/ca_fee_order' }))
  assert.equal(page.status, 'draft_only')
})

test('accepting a delete proposal does not remove the page', async () => {
  const ctx = stubCtx()
  const { ready } = apply(ctx)
  const svc = await ready
  const captured = await svc.materials.capture({
    sourceType: 'db', sourceRef: 'db:ds1/ca_fee_order.amount', datasourceId: 1,
    content: 'ca_fee_order.amount', evidence: {},
  })
  await exec(ctx, 'wiki_apply_decision', { decision: dec({ evidenceRefs: [captured.id] }) })
  await exec(ctx, 'wiki_apply_decision', { decision: { schemaVersion: 1, action: 'delete', slug: 'entity/ca_fee_order', confidence: 0.95, rationale: '下线', evidenceRefs: [captured.id], body: null } })
  const proposal = (await svc.proposals()).find((item) => item.kind === 'delete')
  await svc.resolveProposal(proposal.id, 'accepted')
  assert.equal(JSON.parse(await exec(ctx, 'wiki_read_page', { slug: 'entity/ca_fee_order' })).status, 'published')
  assert.equal((await svc.proposals()).find((item) => item.id === proposal.id).status, 'accepted')
})

test('a model delete decision creates a proposal and never removes the page', async () => {
  const ctx = stubCtx()
  const id = await withMaterial(ctx)
  await exec(ctx, 'wiki_apply_decision', { decision: dec({ evidenceRefs: [id] }) })
  const d = JSON.parse(await exec(ctx, 'wiki_apply_decision', { decision: { schemaVersion: 1, action: 'delete', slug: 'entity/ca_fee_order', confidence: 0.95, rationale: '下线', evidenceRefs: [id], body: null } }))
  assert.equal(d.outcome, 'proposal')
  assert.equal(JSON.parse(await exec(ctx, 'wiki_read_page', { slug: 'entity/ca_fee_order' })).status, 'published')
})
