import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseJsonPayload, textFromStream } from '../src/model-complete.js'

test('textFromStream concatenates text deltas', async () => {
  async function* stream() {
    yield { type: 'text-delta', text: '{"ok":' }
    yield { type: 'text-delta', text: 'true}' }
    yield { type: 'finish', reason: 'stop' }
  }
  assert.equal(await textFromStream(stream()), '{"ok":true}')
})

test('parseJsonPayload picks the first object', () => {
  assert.deepEqual(parseJsonPayload('prefix {"a":1} trailing'), { a: 1 })
})
