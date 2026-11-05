import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dispatchDatasource } from '../src/panel.js'

function api() {
  const calls = []
  return {
    calls,
    list: async () => [],
    add: async (body) => body,
    update: async (id, patch) => { calls.push(['update', id, patch.name]); return { id, name: patch.name } },
    remove: async (id) => { calls.push(['remove', id]); return true },
    progress: async () => ({}),
    catalog: async (body) => { calls.push(['catalog', body.id ?? null, body.database ?? null, body.host ?? null]); return { groups: [] } },
    check: async (body) => { calls.push(['check', body.type, body.database]); return { ok: true } },
  }
}

test('update and remove pass the id through', async () => {
  const service = api()
  const updated = await dispatchDatasource(service, { op: 'update', id: 2, name: 'orders' })
  const removed = await dispatchDatasource(service, { op: 'remove', id: 2 })
  assert.equal(updated.name, 'orders')
  assert.equal(removed.removed, true)
  assert.deepEqual(service.calls, [['update', 2, 'orders'], ['remove', 2]])
})

test('catalog passes the datasource id', async () => {
  const service = api()
  await dispatchDatasource(service, { op: 'catalog', id: 4, database: 'billing' })
  assert.deepEqual(service.calls, [['catalog', 4, 'billing', null]])
  await assert.rejects(() => dispatchDatasource(service, { op: 'catalog' }), /id is required/)
})

test('catalog forwards an unsaved connection', async () => {
  const service = api()
  await dispatchDatasource(service, { op: 'catalog', type: 'mysql', host: 'db.internal', port: 3306, database: 'app', username: 'reader', password: 'secret' })
  assert.deepEqual(service.calls, [['catalog', null, 'app', 'db.internal']])
})

test('check forwards the connection fields', async () => {
  const service = api()
  const result = await dispatchDatasource(service, { op: 'check', type: 'mysql', database: 'billing' })
  assert.deepEqual(result, { ok: true })
  assert.deepEqual(service.calls, [['check', 'mysql', 'billing']])
})

test('update and remove require an id', async () => {
  const service = api()
  await assert.rejects(() => dispatchDatasource(service, { op: 'update', name: 'orders' }), /id is required/)
  await assert.rejects(() => dispatchDatasource(service, { op: 'remove' }), /id is required/)
})
