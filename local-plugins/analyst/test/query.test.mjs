import { test } from 'node:test'
import assert from 'node:assert/strict'
import { searchPages, buildValueIndex, checkLiterals, extractLiterals, tokenize, CALIBER_LABEL } from '../src/index.js'

const pages = [
  { id: 'tables/ca_fee_order', status: 'published', title: 'ca_fee_order', body: '# ca_fee_order\n\n手续费金额 amount，订单表。' },
  { id: 'dicts/ca_fee_order__order_status', status: 'draft', title: 'ca_fee_order.order_status', body: '取值：PAID 已缴费，PENDING 未缴费。' },
  { id: 'relations/a__b', status: 'draft', title: 'a ↔ b', body: '与手续费无关的关联。' },
]

test('tokenize: words and CJK bigrams', () => {
  const t = tokenize('手续费金额 amount')
  assert.ok(t.includes('手续'))
  assert.ok(t.includes('amount'))
})

test('searchPages: every hit carries a caliber label matching its status', () => {
  const hits = searchPages(pages, '手续费金额')
  assert.ok(hits.length >= 2)
  for (const h of hits) {
    assert.equal(h.caliber, CALIBER_LABEL[h.status])
  }
  assert.equal(hits[0].id, 'tables/ca_fee_order', 'published page with title+body match should rank first')
})

test('searchPages: includeDrafts=false returns only published pages', () => {
  const hits = searchPages(pages, '手续费', { includeDrafts: false })
  assert.ok(hits.length > 0)
  assert.ok(hits.every((h) => h.status === 'published'))
})

test('searchPages: empty or no-match query returns []', () => {
  assert.deepEqual(searchPages(pages, '   '), [])
  assert.deepEqual(searchPages(pages, 'zzzz_nomatch'), [])
})

test('searchPages: at equal score, published ranks before draft', () => {
  const eq = [
    { id: 'dicts/x__y', status: 'draft', title: 'token', body: 'token' },
    { id: 'dicts/x__z', status: 'published', title: 'token', body: 'token' },
  ]
  const hits = searchPages(eq, 'token')
  assert.equal(hits[0].status, 'published')
})

const profiles = [
  { table: 'ca_fee_order', column: 'order_status', topK: [{ value: 'PAID', count: 60 }, { value: 'CLOSED', count: 1158 }] },
  { table: 'ca_fee_order', column: 'company_name', topK: [{ value: '某公司', count: 3 }] },
]

test('buildValueIndex: maps each top value to the columns that contain it', () => {
  const idx = buildValueIndex(profiles)
  assert.deepEqual([...idx.get('PAID')], ['ca_fee_order.order_status'])
  assert.equal(idx.get('不存在'), undefined)
})

test('extractLiterals: single-quoted strings, with doubled-quote escapes', () => {
  assert.deepEqual(extractLiterals("WHERE a = 'PAID' AND b = 'O''Brien'"), ['PAID', "O'Brien"])
  assert.deepEqual(extractLiterals("SELECT 1 FROM t WHERE x = ''"), [])
})

test('checkLiterals: ok when the literal sits on a referenced field', () => {
  const idx = buildValueIndex(profiles)
  const r = checkLiterals({
    sql: "SELECT count(*) FROM ca_fee_order WHERE order_status = 'PAID'",
    referencedFields: ['ca_fee_order.order_status'],
    index: idx,
  })
  assert.deepEqual(r, [{ literal: 'PAID', status: 'ok', fields: ['ca_fee_order.order_status'] }])
})

test('checkLiterals: rewrite when the literal only appears on an unreferenced field', () => {
  const idx = buildValueIndex(profiles)
  const r = checkLiterals({
    sql: "SELECT count(*) FROM ca_fee_order WHERE company_name = 'PAID'",
    referencedFields: ['ca_fee_order.company_name'],
    index: idx,
  })
  assert.equal(r[0].status, 'rewrite')
  assert.deepEqual(r[0].fields, ['ca_fee_order.order_status'])
})

test('checkLiterals: unmatched is reported as such, not as a failure of existence', () => {
  const idx = buildValueIndex(profiles)
  const r = checkLiterals({
    sql: "SELECT 1 FROM ca_fee_order WHERE order_status = 'NOT_IN_TOPK'",
    referencedFields: ['ca_fee_order.order_status'],
    index: idx,
  })
  assert.equal(r[0].status, 'unmatched')
  assert.deepEqual(r[0].fields, [])
})
