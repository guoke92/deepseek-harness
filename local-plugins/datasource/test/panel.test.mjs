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
    catalog: async (id, opts) => { calls.push(['catalog', id, opts.database ?? null]); return { groups: [] } },
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
  assert.deepEqual(service.calls, [['catalog', 4, 'billing']])
  await assert.rejects(() => dispatchDatasource(service, { op: 'catalog' }), /id is required/)
})

test('update and remove require an id', async () => {
  const service = api()
  await assert.rejects(() => dispatchDatasource(service, { op: 'update', name: 'orders' }), /id is required/)
  await assert.rejects(() => dispatchDatasource(service, { op: 'remove' }), /id is required/)
})
