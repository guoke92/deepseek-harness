import { test } from 'node:test'
import assert from 'node:assert/strict'
import { collectTables, createWikiService } from '../src/service.js'
import { baseRecord } from '../src/domain.js'
import { createMemoryTable, createWikiStore } from '../src/store.js'
import { applyDecisions } from '../src/apply.js'
import { dispatchWiki } from '../src/panel.js'

function domain() {
  const tables = new Map()
  return {
    table(name) {
      if (!tables.has(name)) tables.set(name, createMemoryTable())
      return tables.get(name)
    },
  }
}

test('a knowledge base binds selected datasources and hides the others', async () => {
  const svc = createWikiService({ domain: domain() })
  const base = await svc.bases.create({ name: '订单', description: '费用' })
  await svc.bases.bind(base.id, 1)
  const bound = svc.requireBound(base.id, 1)
  assert.deepEqual(bound.datasourceIds, [1])
  assert.throws(() => svc.requireBound(base.id, 2), /not bound/)
  const unbound = await svc.bases.unbind(base.id, 1)
  assert.deepEqual(unbound.datasourceIds, [])
})

test('legacy pages and materials become one default knowledge base', async () => {
  const svc = createWikiService({ domain: domain() })
  await svc.materials.capture({
    sourceType: 'db', sourceRef: 'db:ds1/ca_fee_order.amount', datasourceId: 1,
    content: '金额列', evidence: {},
  })
  await svc.decide({
    schemaVersion: 1, action: 'new', slug: 'concept/amount', pageType: 'concept',
    confidence: 0.9, rationale: '已测量', evidenceRefs: [svc.materials.list()[0].id],
    body: '# amount\n\n金额列。',
  }, { source: 'user', decisionId: 'dec_legacy' })
  const base = await svc.adoptLegacy()
  assert.equal(base.name, '默认知识库')
  assert.deepEqual(base.datasourceIds, [1])
  assert.equal(svc.materials.list()[0].knowledgeBaseId, base.id)
  assert.equal(svc.pages(base.id)[0].slug, 'concept/amount')
  assert.equal(await svc.adoptLegacy(), null)
})

test('compile stays inside the selected knowledge base', async () => {
  const svc = createWikiService({ domain: domain() })
  const orders = await svc.bases.create({ name: '订单' })
  const customers = await svc.bases.create({ name: '客户' })
  const table = {
    kind: 'db.table', table: 'orders', comment: null, rowCount: 2, sampleRows: 2, sampleMode: 'physical-prefix',
    primaryKey: ['id'], indexes: [], declaredForeignKeys: [], relations: [], terms: [],
    columns: [{
      name: 'amount', dataType: 'decimal(10,2)', nullable: true, defaultValue: null, comment: '金额',
      role: 'measure', nullCount: 0, nonNullCount: 2, distinctCount: 2, distinctApprox: false, sampleRows: 2,
      domain: { kind: 'range', min: '1', max: '2' }, dictionary: false,
    }],
  }
  await svc.materials.capture({
    sourceType: 'db', sourceRef: 'db:ds1/orders', datasourceId: 1, knowledgeBaseId: orders.id,
    content: '订单金额', evidence: table,
  })
  await svc.materials.capture({
    sourceType: 'db', sourceRef: 'db:ds1/orders', datasourceId: 1, knowledgeBaseId: customers.id,
    content: '客户侧订单', evidence: table,
  })
  const result = await svc.compile({ knowledgeBaseId: orders.id })
  assert.equal(result.decided, 1)
  assert.equal(svc.pages(orders.id).length, 1)
  assert.equal(svc.pages(customers.id).length, 0)
  assert.equal(svc.listMaterials(customers.id)[0].status, 'captured')
  const second = await svc.compile({ knowledgeBaseId: customers.id })
  assert.equal(second.decided, 1)
  assert.equal(svc.pages(orders.id).length, 1)
  assert.equal(svc.pages(customers.id).length, 1)
  const slug = svc.pages(orders.id)[0].slug
  assert.equal(svc.pages(customers.id)[0].slug, slug)
  assert.equal(svc.page(slug, orders.id).knowledgeBaseId, orders.id)
  assert.equal(svc.page(slug, customers.id).knowledgeBaseId, customers.id)
})

test('a rejected decision in a batch writes no page', () => {
  const store = createWikiStore({
    pages: createMemoryTable(),
    proposals: createMemoryTable(),
    revisions: createMemoryTable(),
    logTable: createMemoryTable(),
    now: () => '2026-01-01T00:00:00.000Z',
  })
  const env = {
    pages: store.pages,
    proposals: store.proposals,
    revisions: store.revisions,
    log: store.log,
    now: () => '2026-01-01T00:00:00.000Z',
    knowledgeBaseId: 'kb_a',
  }
  const result = applyDecisions([
    {
      schemaVersion: 1, action: 'new', slug: 'entity/orders', pageType: 'entity',
      confidence: 0.95, rationale: '表', evidenceRefs: ['m1'], body: '# orders\n\n订单。',
    },
    {
      schemaVersion: 1, action: 'new', slug: 'Not A Slug', pageType: 'entity',
      confidence: 0.95, rationale: '坏', evidenceRefs: ['m1'], body: '# x\n\n坏。',
    },
  ], env)
  assert.equal(result.rejected.outcome, 'rejected')
  assert.equal(store.pages.list().length, 0)
  assert.equal(store.proposals.list().length, 0)
})

test('panel summary counts only the bound base', async () => {
  const svc = createWikiService({ domain: domain() })
  const api = {
    bases: () => svc.bases.list(),
    pages: (id) => svc.pages(id),
    listMaterials: (id) => svc.listMaterials(id),
    createBase: (input) => svc.bases.create(input),
    updateBase: (id, patch) => svc.bases.update(id, patch),
    removeBase: (id) => svc.bases.remove(id),
    bindDatasource: (id, datasourceId) => svc.bases.bind(id, datasourceId),
    unbindDatasource: (id, datasourceId) => svc.bases.unbind(id, datasourceId),
  }
  await dispatchWiki(api, { op: 'baseCreate', name: '订单' })
  const listed = await dispatchWiki(api, { op: 'bases' })
  assert.equal(listed.bases.length, 1)
  assert.equal(listed.bases[0].pageCount, 0)
  const bound = await dispatchWiki(api, { op: 'bind', id: listed.bases[0].id, datasourceId: 3 })
  assert.deepEqual(bound.base.datasourceIds, [3])
})

test('accepting a relation review publishes its page', async () => {
  const svc = createWikiService({ domain: domain() })
  await svc.materials.capture({
    sourceType: 'db', sourceRef: 'db:ds1/orders', datasourceId: 1,
    content: '订单', evidence: {},
  })
  const materialId = svc.materials.list()[0].id
  const slug = 'concept/orders_project_company_link'
  const body = '# orders.project_id → company.id\n\n关联。\n'
  const decided = await svc.decide({
    schemaVersion: 1, action: 'new', slug, pageType: 'concept',
    confidence: 0.6, rationale: '包含率未达到外键阈值', evidenceRefs: [materialId], body,
    review: {
      reasons: ['采样'],
      brief: '## 要判断的事\n\n请确认是不是同一个编号',
      publish: {
        schemaVersion: 1, action: 'new', slug, pageType: 'concept',
        confidence: 0.95, rationale: '包含率未达到外键阈值', evidenceRefs: [materialId], body,
      },
    },
  }, { source: 'pipeline', decisionId: 'dec_review' })
  assert.equal(decided.outcome, 'proposal')
  assert.equal(svc.pages().length, 0)
  const proposal = svc.proposals().find((item) => item.slug === slug)
  assert.match(proposal.brief, /要判断的事/)
  const accepted = await svc.resolveProposal(proposal.id, 'accepted')
  assert.equal(accepted.status, 'accepted')
  assert.equal(svc.pages()[0].slug, slug)
  assert.match(svc.pages()[0].published.body, /关联/)
})

test('collect outcome stays on the knowledge base and leaves the binding', async () => {
  const svc = createWikiService({ domain: domain() })
  const base = await svc.bases.create({ name: '订单' })
  await svc.bases.bind(base.id, 3)
  const noted = await svc.bases.noteCollect(base.id, 3, { state: 'done', error: null })
  assert.equal(noted.collects['3'].state, 'done')
  const scoped = await svc.bases.setScope(base.id, 3, ['app.orders'])
  assert.equal(scoped.collects['3'].state, 'done')
  const cleared = await svc.bases.unbind(base.id, 3)
  assert.equal(cleared.collects['3'], undefined)
})

test('scope is stored on the binding and cleared when unbound', async () => {
  const svc = createWikiService({ domain: domain() })
  const base = await svc.bases.create({ name: '订单' })
  await assert.rejects(() => svc.bases.setScope(base.id, 2, ['app.orders']), /not bound/)
  await svc.bases.bind(base.id, 2)
  const scoped = await svc.bases.setScope(base.id, 2, ['app.orders', 'app.orders', 'bad name'])
  assert.deepEqual(scoped.scopes['2'].tables, ['app.orders'])
  assert.deepEqual(collectTables(scoped, 2, null), ['app.orders'])
  assert.deepEqual(collectTables(scoped, 2, ['billing.invoices']), ['billing.invoices'])
  const cleared = await svc.bases.unbind(base.id, 2)
  assert.equal(cleared.scopes['2'], undefined)
  assert.equal(collectTables(cleared, 2, null), null)
  assert.deepEqual(collectTables(cleared, 2, null, ['app.keep']), ['app.keep'])
  assert.equal(collectTables(cleared, 2, null, []), null)
  assert.deepEqual(collectTables(scoped, 2, null, ['other.t']), ['app.orders'])
})

test('a knowledge base can be the default and the focused base independently of table count', async () => {
  const svc = createWikiService({ domain: domain() })
  const first = await svc.bases.create({ name: '订单' })
  assert.equal(first.isDefault, true)
  assert.equal(first.focused, true)
  assert.equal(baseRecord.parse(first).isDefault, true)
  const second = await svc.bases.create({ name: '客户' })
  assert.equal(second.isDefault, undefined)
  const marked = await svc.bases.setDefault(second.id)
  assert.equal(marked.isDefault, true)
  assert.equal(svc.bases.get(first.id).isDefault, undefined)
  assert.equal(svc.resolveBase().id, first.id)
  await svc.bases.setFocus(second.id)
  assert.equal(svc.resolveBase().id, second.id)
  assert.equal(svc.resolveBase(first.id).id, first.id)
  const many = Array.from({ length: 401 }, (_, index) => `app.t${index}`)
  await svc.bases.bind(first.id, 2)
  const wide = await svc.bases.setScope(first.id, 2, many)
  assert.equal(wide.scopes['2'].tables.length, 401)
  assert.equal(baseRecord.parse(wide).scopes['2'].tables.length, 401)
  assert.equal(svc.bases.get(first.id).isDefault, undefined)
})
