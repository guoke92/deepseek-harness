import { test } from 'node:test'
import assert from 'node:assert/strict'
import { collectTables, createWikiService } from '../src/service.js'
import { createMemoryTable } from '../src/store.js'
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
  await svc.materials.capture({
    sourceType: 'db', sourceRef: 'db:ds1/orders.amount', datasourceId: 1, knowledgeBaseId: orders.id,
    content: '订单金额', evidence: {},
  })
  await svc.materials.capture({
    sourceType: 'db', sourceRef: 'db:ds1/orders.amount', datasourceId: 1, knowledgeBaseId: customers.id,
    content: '订单金额', evidence: {},
  })
  const result = await svc.compile(async (batch) => [{
    schemaVersion: 1, action: 'new', slug: 'concept/orders_amount', pageType: 'concept',
    confidence: 0.9, rationale: '已测量', evidenceRefs: [batch[0].id], body: '# orders amount\n\n金额。',
  }], { knowledgeBaseId: orders.id })
  assert.equal(result.decided, 1)
  assert.equal(svc.pages(orders.id).length, 1)
  assert.equal(svc.pages(customers.id).length, 0)
  assert.equal(svc.listMaterials(customers.id)[0].status, 'captured')
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
})
