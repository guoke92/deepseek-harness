import { test } from 'node:test'
import assert from 'node:assert/strict'
import { assertSupportedJsonSchema } from '../../../packages/core/tools/lib/index.js'
import { TOOL_SPECS, listToolsForModel, toDshSchema, validateToolArgs } from '../src/tools.js'

test('every model-exposed tool parameter schema is accepted by DSH', () => {
  for (const t of listToolsForModel()) {
    assert.doesNotThrow(() => assertSupportedJsonSchema(t.parameters), `tool ${t.name} rejected`)
  }
})

test('deposit_confirmed (not exposed) is also a valid DSH schema', () => {
  assert.doesNotThrow(() => assertSupportedJsonSchema(toDshSchema(TOOL_SPECS.deposit_confirmed.parameters)))
})

test('toDshSchema drops unsupported keywords and moves their meaning into description', () => {
  const out = toDshSchema({ type: 'integer', minimum: 1, maximum: 50, description: '每页条数' })
  assert.equal(out.type, 'integer')
  assert.equal(out.minimum, undefined)
  assert.equal(out.maximum, undefined)
  assert.match(out.description, /每页条数/)
  assert.match(out.description, /不小于 1/)
  assert.match(out.description, /不大于 50/)
})

test('toDshSchema keeps enum, required and additionalProperties', () => {
  const out = toDshSchema({
    type: 'object',
    properties: { mode: { type: 'string', enum: ['a', 'b'] } },
    required: ['mode'],
    additionalProperties: false,
  })
  assert.deepEqual(out.properties.mode.enum, ['a', 'b'])
  assert.deepEqual(out.required, ['mode'])
  assert.equal(out.additionalProperties, false)
})

test('local validation still enforces the full schema after the DSH projection', () => {
  // 投影后的 schema 放宽了关键字，但本地校验仍拒绝越界参数
  assert.equal(validateToolArgs('wiki_search', { query: 'x', limit: 0 }).ok, false)
  assert.equal(validateToolArgs('execute_readonly', { dsId: 0, sql: 'select 1' }).ok, false)
  assert.equal(validateToolArgs('wiki_get_page', { id: '../x' }).ok, false)
})
