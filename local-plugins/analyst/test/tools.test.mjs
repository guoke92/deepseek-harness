import { test } from 'node:test'
import assert from 'node:assert/strict'
import { TOOL_SPECS, validateToolArgs, listToolsForModel, createToolRunner, validateAgainst } from '../src/tools.js'
import { buildValueIndex } from '../src/index.js'

test('tool names are unprefixed and every spec has a parameters object', () => {
  for (const [name, s] of Object.entries(TOOL_SPECS)) {
    assert.ok(!name.startsWith('sq_'))
    assert.equal(s.parameters.type, 'object')
    assert.equal(s.parameters.additionalProperties, false)
  }
})

test('deposit_confirmed is not exposed to the model; others are', () => {
  const names = listToolsForModel().map((t) => t.name)
  assert.ok(!names.includes('deposit_confirmed'))
  assert.ok(names.includes('execute_readonly'))
  assert.ok(names.includes('wiki_search'))
})

test('validateToolArgs: required, unknown keys, type, range and pattern checks', () => {
  assert.equal(validateToolArgs('wiki_search', { query: '手续费' }).ok, true)
  assert.equal(validateToolArgs('wiki_search', {}).ok, false)
  assert.equal(validateToolArgs('wiki_search', { query: 'x', extra: 1 }).ok, false)
  assert.equal(validateToolArgs('wiki_search', { query: 'x', limit: 0 }).ok, false)
  assert.equal(validateToolArgs('wiki_search', { query: 'x', limit: 2.5 }).ok, false)
  assert.equal(validateToolArgs('wiki_get_page', { id: '../../etc' }).ok, false)
  assert.equal(validateToolArgs('wiki_get_page', { id: 'tables/ca_fee_order' }).ok, true)
  assert.equal(validateToolArgs('dict_translate', { field: 'order_status' }).ok, false)
  assert.equal(validateToolArgs('dict_translate', { field: 'ca_fee_order.order_status' }).ok, true)
  assert.equal(validateToolArgs('nope', {}).ok, false)
})

test('validateAgainst: array items and nested object checks report the path', () => {
  const errs = validateAgainst(TOOL_SPECS.literal_check.parameters, { dsId: 1, sql: 'select 1', referencedFields: ['bad field'] })
  assert.ok(errs.some((e) => e.startsWith('args.referencedFields[0]')))
})

function runner(extra = {}) {
  const rows = [{ order_status: 'PAID', n: 60 }]
  const idx = buildValueIndex([{ table: 'ca_fee_order', column: 'order_status', topK: [{ value: 'PAID', count: 60 }] }])
  return createToolRunner({
    handlers: {
      valueIndex: () => idx,
      execute_readonly: async (a) => ({ ok: true, rows, rowCount: rows.length, sql: a.sql }),
      wiki_search: async () => ({ hits: [] }),
      deposit_confirmed: async () => ({ accepted: 1 }),
      ...extra,
    },
  })
}

test('runner: model cannot call a non-exposed tool; the UI caller can', async () => {
  const r = runner()
  const denied = await r.call('deposit_confirmed', { event: {} })
  assert.match(denied.error, /not available to model/)
  const ok = await r.call('deposit_confirmed', { event: {} }, { caller: 'ui' })
  assert.equal(ok.accepted, 1)
})

test('runner: execute_readonly without referencedFields is refused before running', async () => {
  let ran = false
  const r = runner({ execute_readonly: async () => { ran = true; return { ok: true } } })
  const out = await r.call('execute_readonly', { dsId: 3, sql: "SELECT 1 FROM ca_fee_order WHERE order_status = 'PAID'" })
  assert.match(out.error, /referencedFields is required/)
  assert.equal(ran, false)
})

test('runner: a literal that only matches an unreferenced field blocks execution', async () => {
  let ran = false
  const r = runner({ execute_readonly: async () => { ran = true; return { ok: true } } })
  const out = await r.call('execute_readonly', {
    dsId: 3,
    sql: "SELECT count(*) FROM ca_fee_order WHERE company_name = 'PAID'",
    referencedFields: ['ca_fee_order.company_name'],
  })
  assert.equal(out.error, 'literal_rewrite_required')
  assert.equal(ran, false)
})

test('runner: a referenced literal passes and returns the literal check alongside rows', async () => {
  const r = runner()
  const out = await r.call('execute_readonly', {
    dsId: 3,
    sql: "SELECT count(*) FROM ca_fee_order WHERE order_status = 'PAID'",
    referencedFields: ['ca_fee_order.order_status'],
  })
  assert.equal(out.ok, true)
  assert.equal(out.literals[0].status, 'ok')
})

test('runner: invalid arguments are returned as structured errors, handler errors are contained', async () => {
  const r = runner({ wiki_search: async () => { throw new Error('index unavailable') } })
  const bad = await r.call('wiki_search', { limit: 3 })
  assert.equal(bad.error, 'invalid arguments')
  assert.ok(bad.details.length > 0)
  const boom = await r.call('wiki_search', { query: 'x' })
  assert.equal(boom.error, 'index unavailable')
})

test('runner: a tool without a wired handler is reported, not silently skipped', async () => {
  const r = createToolRunner({ handlers: {} })
  const out = await r.call('wiki_search', { query: 'x' })
  assert.match(out.error, /not wired/)
})
