import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseExtractedMemories } from '../src/extract.js'

test('parseExtractedMemories keeps only known kinds', () => {
  const rows = parseExtractedMemories('note [{"kind":"fact","content":"公司在上海"},{"kind":"nope","content":"x"},{"kind":"task","content":"  "}]')
  assert.deepEqual(rows, [{ kind: 'fact', content: '公司在上海' }])
})

test('parseExtractedMemories returns nothing when the model output is not JSON', () => {
  assert.deepEqual(parseExtractedMemories('没有'), [])
})
