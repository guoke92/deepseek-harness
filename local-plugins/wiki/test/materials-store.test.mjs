import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createMaterialStore, createMemoryTable } from '../src/materials-store.js'
import { createSerialQueue } from '../src/queue.js'

let seq = 0
const deps = (table = createMemoryTable()) => ({
  table,
  now: () => '2026-10-16T10:00:00+08:00',
  newId: () => `raw_test${String(++seq).padStart(4, '0')}`,
})

const input = {
  sourceType: 'db',
  sourceRef: 'postgres:ds3/public.ca_fee_order.order_status',
  datasourceId: 3,
  content: '字段 order_status 取值 PAID、CLOSED',
  evidence: { distinctCount: 2 },
}

test('same source is captured once; a changed content updates that material', async () => {
  const store = createMaterialStore(deps())
  const a = await store.capture(input)
  const b = await store.capture(input)
  assert.equal(a.created, true)
  assert.equal(b.created, false)
  assert.equal(a.id, b.id)
  const c = await store.capture({ ...input, content: input.content + '，新增 X' })
  assert.equal(c.created, false)
  assert.equal(c.id, a.id)
  assert.equal(store.list().length, 1)
  assert.equal(store.get(a.id).status, 'captured')
  assert.match(store.get(a.id).content, /新增 X/)
})

test('an invalid input is rejected before anything is written', async () => {
  const table = createMemoryTable()
  const store = createMaterialStore(deps(table))
  await assert.rejects(store.capture({ ...input, datasourceId: null }), /invalid material/)
  await assert.rejects(store.capture({ ...input, evidence: { password: 'x' } }), /credentials/)
  assert.equal(store.list().length, 0)
})

test('captured → decided moves status and decisionId together', async () => {
  const store = createMaterialStore(deps())
  const { id } = await store.capture(input)
  assert.equal(store.pending().length, 1)
  const decided = await store.transition(id, 'decided', { decisionId: 'dec_1' })
  assert.equal(decided.status, 'decided')
  assert.equal(decided.decisionId, 'dec_1')
  assert.equal(store.pending().length, 0)
  await assert.rejects(store.transition(id, 'captured'), /not allowed/)
})

test('a failed decision keeps the material and its reason; only failed → captured replays it', async () => {
  const store = createMaterialStore(deps())
  const { id } = await store.capture(input)
  const failed = await store.transition(id, 'failed', { failureReason: 'schema invalid twice' })
  assert.equal(failed.status, 'failed')
  assert.equal(failed.failureReason, 'schema invalid twice')
  assert.equal(failed.decisionId, null)
  assert.equal(store.pending().length, 0)
  const replay = await store.transition(id, 'captured')
  assert.equal(replay.status, 'captured')
  assert.equal(replay.failureReason, undefined)
  assert.equal(store.pending().length, 1)
})

test('removing a material frees its idempotency key', async () => {
  const store = createMaterialStore(deps())
  const { id } = await store.capture(input)
  assert.equal(await store.remove(id), true)
  assert.equal(store.get(id), undefined)
  const again = await store.capture(input)
  assert.equal(again.created, true)
  assert.notEqual(again.id, id)
})

test('re-capturing a decided material returns the existing id and does not reopen it', async () => {
  const store = createMaterialStore(deps())
  const { id } = await store.capture(input)
  await store.transition(id, 'decided', { decisionId: 'dec_1' })
  const again = await store.capture(input)
  assert.equal(again.id, id)
  assert.equal(store.get(id).status, 'decided')
})

test('a changed recapture of a decided material reopens the same row', async () => {
  const store = createMaterialStore(deps())
  const { id } = await store.capture(input)
  await store.transition(id, 'decided', { decisionId: 'dec_1' })
  const again = await store.capture({ ...input, content: '字段已变化' })
  assert.equal(again.id, id)
  assert.equal(again.created, false)
  assert.equal(store.get(id).status, 'captured')
  assert.equal(store.get(id).decisionId, null)
  assert.equal(store.list().length, 1)
})

test('reconcile keeps the earliest id and the latest content', async () => {
  const { contentHashOf } = await import('@local/contracts')
  const table = createMemoryTable()
  const older = {
    schemaVersion: 1,
    id: 'raw_older1',
    sourceType: 'db',
    sourceRef: input.sourceRef,
    datasourceId: 3,
    content: input.content,
    contentHash: contentHashOf(input.content),
    evidence: { distinctCount: 2 },
    status: 'decided',
    decisionId: 'dec_1',
    createdAt: '2026-10-16T10:00:00+08:00',
  }
  const newerContent = '第二次采集'
  const newer = {
    ...older,
    id: 'raw_newer1',
    content: newerContent,
    contentHash: contentHashOf(newerContent),
    evidence: { distinctCount: 3 },
    status: 'captured',
    decisionId: null,
    createdAt: '2026-10-22T13:41:00+08:00',
  }
  await table.insert(older)
  await table.insert(newer)
  const store = createMaterialStore(deps(table))
  await store.reconcile()
  assert.equal(store.list().length, 1)
  assert.equal(store.get('raw_older1').content, newerContent)
  assert.equal(store.get('raw_older1').status, 'captured')
  assert.equal(store.get('raw_newer1'), undefined)
})

test('concurrent captures of the same material create exactly one record', async () => {
  const store = createMaterialStore(deps())
  const results = await Promise.all(Array.from({ length: 20 }, () => store.capture(input)))
  assert.equal(results.filter((r) => r.created).length, 1)
  assert.equal(new Set(results.map((r) => r.id)).size, 1)
  assert.equal(store.list().length, 1)
})

test('a rejected job in the single-writer queue does not block later jobs', async () => {
  const q = createSerialQueue()
  const order = []
  const first = q.run(async () => { order.push('a'); throw new Error('boom') })
  const second = q.run(async () => { order.push('b'); return 'ok' })
  await assert.rejects(first, /boom/)
  assert.equal(await second, 'ok')
  assert.deepEqual(order, ['a', 'b'])
})

test('existing rows loaded at start are indexed by idempotency key', async () => {
  const table = createMemoryTable()
  const first = createMaterialStore(deps(table))
  const { id } = await first.capture(input)
  const restarted = createMaterialStore(deps(table))
  const again = await restarted.capture(input)
  assert.equal(again.id, id)
  assert.equal(again.created, false)
})

test('default ids always satisfy the material id contract, even across many draws', async () => {
  const { validateMaterialInput } = await import('@local/contracts')
  const store = createMaterialStore({ table: createMemoryTable(), now: () => '2026-10-16T10:00:00+08:00' })
  for (let i = 0; i < 200; i++) {
    const r = await store.capture({ ...input, content: `c${i}` })
    assert.match(r.id, /^raw_[0-9A-Za-z]{6,}$/)
  }
  assert.equal(validateMaterialInput(input).ok, true)
})
