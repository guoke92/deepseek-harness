import { test } from 'node:test'
import assert from 'node:assert/strict'
import { materialFromProfile } from '../src/deliver.js'
import { describeProfile } from '../src/pipeline.js'
import { validateMaterialInput } from '@local/contracts'
import { triageDict } from '../src/dict-triage.js'

const profile = {
  table: 'ca_fee_order', column: 'order_status', rowCount: 50, nullCount: 0, distinctCount: 2,
  distinctApprox: false, isDictLike: true, skipReason: null, excludedDefaults: [],
  topK: [{ value: 'PAID', count: 30 }, { value: 'CLOSED', count: 20 }], dataType: 'varchar',
}

test('a profile becomes a valid db material with a stable source reference and no credentials', () => {
  const m = materialFromProfile(profile, 3)
  assert.equal(m.sourceRef, 'db:ds3/ca_fee_order.order_status')
  assert.equal(m.datasourceId, 3)
  assert.equal(validateMaterialInput(m).ok, true)
  assert.match(m.content, /行数 50/)
  assert.match(m.content, /低基数，候选字典/)
})

test('description lists at most five frequent values and marks skipped relations', () => {
  const many = { ...profile, topK: Array.from({ length: 8 }, (_, i) => ({ value: `V${i}`, count: 1 })), skipReason: 'json', isDictLike: false }
  const text = describeProfile(many)
  assert.match(text, /V4/)
  assert.doesNotMatch(text, /V5/)
  assert.match(text, /跳过关联（json）/)
})

test('approximate distinct counts are marked', () => {
  assert.match(describeProfile({ ...profile, distinctApprox: true }), /不同值 2（近似）/)
})

test('dict triage keeps a short-code column and holds a single-value column', () => {
  const keep = triageDict({ left: { table: 't', column: 'order_status' }, evidence: { topK: [{ value: 'PAID' }, { value: 'CLOSED' }], distinctCount: 2 } }, {})
  assert.equal(keep.decision, 'keep')
  const hold = triageDict({ left: { table: 't', column: 'flag_x' }, evidence: { topK: [{ value: 'Y' }], distinctCount: 1 } }, {})
  assert.equal(hold.decision, 'hold')
  const drop = triageDict({ left: { table: 't', column: 'customer_id' }, evidence: { topK: [{ value: '1' }], distinctCount: 1 } }, {})
  assert.equal(drop.decision, 'drop')
})

test('a skipped low-cardinality column is not described as a dictionary candidate', () => {
  const text = describeProfile({ ...profile, isDictLike: true, skipReason: 'temporal', topK: [{ value: '2026-10-14', count: 50 }] })
  assert.match(text, /跳过关联（temporal）/)
  assert.doesNotMatch(text, /候选字典/)
})
