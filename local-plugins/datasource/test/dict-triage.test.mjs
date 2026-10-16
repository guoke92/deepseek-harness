import { test } from 'node:test'
import assert from 'node:assert/strict'
import { triageDict, triageAll } from '../src/dict-triage.js'

const cand = (column, topK, distinct = topK.length, extra = {}) => ({
  schemaVersion: 1,
  kind: 'dict',
  left: { table: 't', column },
  right: null,
  evidence: { distinctCount: distinct, topK: topK.map((v) => ({ value: v, count: 1 })), commentRef: null, ...extra },
  authenticity: 'unknown',
  priority: 'primary',
  status: 'candidate',
})

test('keep: short codes with a bounded number of distinct values', () => {
  const t = triageDict(cand('order_status', ['PAID', 'CLOSED', 'PENDING']))
  assert.equal(t.decision, 'keep')
})

test('keep: yes/no flags such as Y and N', () => {
  assert.equal(triageDict(cand('enable', ['Y', 'N'])).decision, 'keep')
})

test('drop: reference, id and serial-number columns regardless of values', () => {
  assert.equal(triageDict(cand('company_id', ['1', '2', '3'])).decision, 'drop')
  assert.equal(triageDict(cand('order_no', ['A', 'B'])).decision, 'drop')
  assert.equal(triageDict(cand('ref_status', ['PAID', 'CLOSED'])).decision, 'drop')
})

test('drop: comment-referenced columns', () => {
  const t = triageDict(cand('code', ['A', 'B'], 2, { commentRef: 'schools#code' }))
  assert.equal(t.decision, 'drop')
  assert.ok(t.reasons.includes('comment_ref'))
})

test('drop: temporal values and uuid or hash samples', () => {
  assert.equal(triageDict(cand('flag', ['2026-10-15', '2026-10-14'])).decision, 'drop')
  assert.equal(triageDict(cand('token', ['3f2504e0-4f89-11d3-9a0c-0305e82c3301', 'a'])).decision, 'drop')
  assert.equal(triageDict(cand('hash', ['0123456789abcdef0123', 'fedcba9876543210fedc'])).decision, 'drop')
})

test('drop: long free text', () => {
  const long = 'x'.repeat(60)
  const t = triageDict(cand('remark', [long, 'short']))
  assert.equal(t.decision, 'drop')
  assert.ok(t.reasons.includes('long_text_values'))
})

test('hold: single observed value is treated as possible pollution, not a code table', () => {
  const t = triageDict(cand('status', ['PAID'], 1))
  assert.equal(t.decision, 'hold')
  assert.deepEqual(t.reasons, ['single_value_maybe_pollution'])
})

test('hold: mixed-case or sentence-like values need review', () => {
  assert.equal(triageDict(cand('kind', ['Paid Order', 'Closed Order'])).decision, 'hold')
})

test('drop: numeric sequence-like values with many distinct entries', () => {
  const vals = Array.from({ length: 20 }, (_, i) => String(i + 1))
  assert.equal(triageDict(cand('seq', vals, 20)).decision, 'drop')
})

test('drop: more distinct values than the dict threshold', () => {
  const vals = Array.from({ length: 40 }, (_, i) => `C${i}`)
  assert.equal(triageDict(cand('code', vals, 40), { dictDistinctMax: 32 }).decision, 'drop')
})

test('triageAll groups only dict candidates', () => {
  const out = triageAll([
    cand('order_status', ['PAID', 'CLOSED']),
    cand('company_id', ['1', '2']),
    { kind: 'join', left: { table: 'a', column: 'x' }, right: { table: 'b', column: 'y' } },
  ])
  assert.equal(out.keep.length, 1)
  assert.equal(out.drop.length, 1)
  assert.equal(out.hold.length, 0)
})
