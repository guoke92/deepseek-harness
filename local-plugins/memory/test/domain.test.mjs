import { test } from 'node:test'
import assert from 'node:assert/strict'
import { memoryItemRecord, memoryTombstoneRecord, memoryDomainSpec } from '../src/domain.js'
import { createMemoryStore } from '../src/store.js'

function tables() {
  const mk = () => {
    const rows = new Map()
    return {
      get: (k) => rows.get(k),
      put: async (k, v) => { rows.set(k, structuredClone(v)) },
      entries: () => rows.entries(),
    }
  }
  return { items: mk(), tombstones: mk() }
}

test('domain spec declares zod schemas for both tables (not null)', () => {
  assert.equal(memoryDomainSpec.name, 'memory')
  assert.ok(memoryDomainSpec.tables.items.valueSchema)
  assert.ok(memoryDomainSpec.tables.tombstones.valueSchema)
})

test('every record the store writes passes the domain schema', async () => {
  const { items, tombstones } = tables()
  let t = 0
  const store = createMemoryStore({ items, tombstones, now: () => new Date(Date.parse('2026-10-16T10:00:00+08:00') + (t++) * 1000).toISOString() })
  const a = await store.add({ subjectId: 'profile:desktop', kind: 'preference', content: '金额单位统一为元', origin: 'explicit', topic: '金额单位' })
  const p = await store.add({ subjectId: 'profile:desktop', kind: 'profile', content: '可能是财务人员', origin: 'extracted' })
  await store.confirm(p.id)
  await store.add({ subjectId: 'profile:desktop', kind: 'profile', content: '新的说法', origin: 'explicit', topic: '金额单位' })
  const q = await store.add({ subjectId: 'profile:desktop', kind: 'interest', content: '关注医疗影像', origin: 'extracted' })
  await store.reject(q.id)
  for (const [, rec] of items.entries()) assert.ok(memoryItemRecord.safeParse(rec).success, `item ${rec.id} must match schema`)
  for (const [, rec] of tombstones.entries()) assert.ok(memoryTombstoneRecord.safeParse(rec).success)
  assert.ok(a.id)
})

test('a record with an unknown kind is rejected by the schema', () => {
  const bad = { id: 'x', subjectId: 's', kind: 'secret', content: 'c', origin: 'explicit', topic: null, confidence: 1, status: 'active', supersedes: null, fingerprint: 'f', createdAt: 'now', recalls: 0 }
  assert.equal(memoryItemRecord.safeParse(bad).success, false)
})
