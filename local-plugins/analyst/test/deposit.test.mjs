import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toRawMaterial, depositBatch } from '../src/deposit.js'

const now = new Date('2026-10-15T11:00:00+08:00')

test('caliber_confirmed requires explicit user confirmation and non-empty text', () => {
  assert.equal(toRawMaterial({ kind: 'caliber_confirmed', text: '已关闭订单不计入手续费', userConfirmed: true }, { now, sessionId: 's1' }).ok, true)
  assert.equal(toRawMaterial({ kind: 'caliber_confirmed', text: '未经确认', userConfirmed: false }, { now }).ok, false)
  assert.equal(toRawMaterial({ kind: 'caliber_confirmed', text: '  ', userConfirmed: true }, { now }).ok, false)
})

test('sql_confirmed requires a successful SELECT, a datasource, and a single statement', () => {
  const ok = toRawMaterial({ kind: 'sql_confirmed', sql: 'SELECT company_id, count(*) FROM ca_fee_order GROUP BY 1', executed: true, rowCount: 5 }, { now, datasourceId: 3, sessionId: 's1' })
  assert.equal(ok.ok, true)
  assert.equal(ok.material.sourceType, 'sql')
  assert.equal(ok.material.datasourceId, 3)
  assert.equal(toRawMaterial({ kind: 'sql_confirmed', sql: 'SELECT 1', executed: false, rowCount: 1 }, { now, datasourceId: 3 }).ok, false)
  assert.equal(toRawMaterial({ kind: 'sql_confirmed', sql: 'DELETE FROM t', executed: true, rowCount: 1 }, { now, datasourceId: 3 }).ok, false)
  assert.equal(toRawMaterial({ kind: 'sql_confirmed', sql: 'SELECT 1; DROP TABLE t', executed: true, rowCount: 1 }, { now, datasourceId: 3 }).ok, false)
  assert.equal(toRawMaterial({ kind: 'sql_confirmed', sql: 'SELECT 1', executed: true, rowCount: -1 }, { now, datasourceId: 3 }).ok, false)
  assert.equal(toRawMaterial({ kind: 'sql_confirmed', sql: 'SELECT 1', executed: true, rowCount: 1 }, { now, datasourceId: null }).ok, false)
})

test('label_corrected requires table.column field, value and non-empty label', () => {
  const ok = toRawMaterial({ kind: 'label_corrected', field: 'ca_fee_order.order_status', value: 'PAIDING', label: '待支付' }, { now })
  assert.equal(ok.ok, true)
  assert.equal(toRawMaterial({ kind: 'label_corrected', field: 'order_status', value: 'PAID', label: '已缴费' }, { now }).ok, false)
  assert.equal(toRawMaterial({ kind: 'label_corrected', field: 'ca_fee_order.order_status', value: 'PAID', label: '' }, { now }).ok, false)
})

test('unsupported kinds and non-object events are rejected', () => {
  assert.equal(toRawMaterial({ kind: 'chitchat', text: 'hi' }, { now }).ok, false)
  assert.equal(toRawMaterial(null, { now }).ok, false)
})

test('deposit ids are stable for the same content, so repeats are duplicates', () => {
  const ev = { kind: 'label_corrected', field: 'ca_fee_order.order_status', value: 'PAIDING', label: '待支付' }
  const a = toRawMaterial(ev, { now, sessionId: 's1' }).material.id
  const b = toRawMaterial({ ...ev }, { now: new Date(now.getTime() + 5000), sessionId: 's2' }).material.id
  assert.equal(a, b)
})

test('depositBatch: de-duplicates within the batch and against existing ids', () => {
  const ev = { kind: 'label_corrected', field: 'ca_fee_order.order_status', value: 'PAIDING', label: '待支付' }
  const first = depositBatch([ev, ev, { kind: 'chitchat' }], { now })
  assert.equal(first.accepted.length, 1)
  assert.equal(first.rejected.length, 2)
  assert.ok(first.rejected.some((r) => r.reason === 'duplicate'))
  const again = depositBatch([ev], { now, existingIds: new Set([first.accepted[0].id]) })
  assert.equal(again.accepted.length, 0)
  assert.equal(again.rejected[0].reason, 'duplicate')
})

test('deposited materials pass the wiki raw-material contract', async () => {
  const { validateRawMaterial } = await import('@local/contracts')
  const r = toRawMaterial({ kind: 'caliber_confirmed', text: '口径', userConfirmed: true }, { now, sessionId: 's9' })
  assert.equal(validateRawMaterial(r.material).ok, true)
})
