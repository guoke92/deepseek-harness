import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatLogEntry, parseLogEntry } from '../src/index.js'

const iso = '2026-10-16T10:00:00+08:00'

test('log line round-trips through formatLogEntry and parseLogEntry', () => {
  const f = formatLogEntry({ at: iso, type: 'publish', ref: 'entity/ca_fee_order', summary: 'v1 confidence 0.9' })
  assert.equal(f.ok, true)
  assert.equal(f.line, `## [${iso}] publish | entity/ca_fee_order | v1 confidence 0.9`)
  const p = parseLogEntry(f.line)
  assert.equal(p.ok, true)
  assert.deepEqual(p.entry, { at: iso, type: 'publish', ref: 'entity/ca_fee_order', summary: 'v1 confidence 0.9' })
})

test('log rejects unknown types, pipes in refs, multi-line summaries and non-ISO times', () => {
  assert.equal(formatLogEntry({ at: iso, type: 'nope', ref: 'r', summary: 's' }).ok, false)
  assert.equal(formatLogEntry({ at: iso, type: 'publish', ref: 'a|b', summary: 's' }).ok, false)
  assert.equal(formatLogEntry({ at: iso, type: 'publish', ref: 'r', summary: 'a\nb' }).ok, false)
  assert.equal(formatLogEntry({ at: '2026-10-16', type: 'publish', ref: 'r', summary: 's' }).ok, false)
  assert.equal(parseLogEntry('not a log line').ok, false)
  assert.equal(parseLogEntry('## [bad] publish | r | s').ok, false)
})
