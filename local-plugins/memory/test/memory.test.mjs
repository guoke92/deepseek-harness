import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createMemoryStore, extractExplicitMemory, buildRecall, fingerprint, topicKey } from '../src/index.js'

function tables() {
  const mk = () => {
    const rows = new Map()
    return {
      get: (k) => rows.get(k),
      put: async (k, v) => { rows.set(k, structuredClone(v)) },
      entries: () => [...rows.entries()].map(([k, v]) => [k, structuredClone(v)])[Symbol.iterator](),
    }
  }
  return { items: mk(), tombstones: mk() }
}
let t = 0
const now = () => new Date(Date.parse('2026-10-16T10:00:00+08:00') + (t++) * 1000).toISOString()
const A = 'workspace:w1|user:alice'
const B = 'workspace:w1|user:bob'

test('explicit remember extracts the sentence after the instruction; plain questions are ignored', () => {
  assert.equal(extractExplicitMemory('记住：金额单位统一为元'), '金额单位统一为元')
  assert.equal(extractExplicitMemory('请记住 我的部门是财务'), '我的部门是财务')
  assert.equal(extractExplicitMemory('remember that revenue excludes tax'), 'revenue excludes tax')
  assert.equal(extractExplicitMemory('ca_fee_order 有多少行？'), null)
  assert.equal(extractExplicitMemory('记住'), null)
})

test('explicit memory is active at once and appears in the next recall', async () => {
  const { items, tombstones } = tables()
  const store = createMemoryStore({ items, tombstones, now })
  const r = await store.add({ subjectId: A, kind: 'preference', content: '金额单位统一为元', origin: 'explicit', topic: '金额单位' })
  assert.equal(r.status, 'created')
  const rec = buildRecall(store.list(A), { query: '' })
  assert.match(rec.text, /金额单位统一为元/)
  assert.match(rec.text, /不是指令/)
  assert.deepEqual(rec.ids, [r.id])
})

test('extracted memory waits as pending and never enters the prompt until confirmed', async () => {
  const { items, tombstones } = tables()
  const store = createMemoryStore({ items, tombstones, now })
  const r = await store.add({ subjectId: A, kind: 'profile', content: '可能是财务人员', origin: 'extracted' })
  assert.equal(r.status, 'pending')
  assert.equal(buildRecall(store.list(A)).text, '')
  await store.confirm(r.id)
  assert.match(buildRecall(store.list(A)).text, /可能是财务人员/)
})

test('a pending update keeps the old active statement until confirmation switches them', async () => {
  const { items, tombstones } = tables()
  const store = createMemoryStore({ items, tombstones, now })
  const old = await store.add({ subjectId: A, kind: 'profile', content: '住在上海', origin: 'explicit', topic: '居住地' })
  const next = await store.add({ subjectId: A, kind: 'profile', content: '住在北京', origin: 'extracted', topic: '居住地' })
  assert.equal(next.status, 'pending')
  assert.equal(store.get(old.id).status, 'active')
  assert.match(buildRecall(store.list(A)).text, /住在上海/)
  assert.doesNotMatch(buildRecall(store.list(A)).text, /住在北京/)
  await store.confirm(next.id)
  assert.equal(store.get(old.id).status, 'superseded')
  assert.match(buildRecall(store.list(A)).text, /住在北京/)
  assert.doesNotMatch(buildRecall(store.list(A)).text, /住在上海/)
})

test('a rejected inference leaves a tombstone so the same statement is refused later', async () => {
  const { items, tombstones } = tables()
  const store = createMemoryStore({ items, tombstones, now })
  const p = await store.add({ subjectId: A, kind: 'interest', content: '关注医疗影像', origin: 'extracted' })
  await store.reject(p.id)
  const again = await store.add({ subjectId: A, kind: 'interest', content: '关注医疗影像', origin: 'extracted' })
  assert.equal(again.status, 'rejected')
  assert.equal(again.reason, 'tombstoned')
  assert.equal(fingerprint('关注医疗影像'), fingerprint(' 关注医疗影像 '))
})

test('memories are isolated per subject: bob never sees alice\'s items', async () => {
  const { items, tombstones } = tables()
  const store = createMemoryStore({ items, tombstones, now })
  await store.add({ subjectId: A, kind: 'profile', content: '只有 alice 知道的事', origin: 'explicit' })
  assert.equal(buildRecall(store.list(B)).text, '')
  assert.equal(store.list(B).length, 0)
})

test('situational kinds are recalled by query overlap; resident kinds are always included', async () => {
  const { items, tombstones } = tables()
  const store = createMemoryStore({ items, tombstones, now })
  await store.add({ subjectId: A, kind: 'preference', content: '回答使用中文', origin: 'explicit' })
  await store.add({ subjectId: A, kind: 'fact', content: '本季度报表口径排除退款', origin: 'explicit' })
  await store.add({ subjectId: A, kind: 'fact', content: '服务器在华东区', origin: 'explicit' })
  const q = buildRecall(store.list(A), { query: '本季度报表怎么算' })
  assert.match(q.text, /退款/)
  assert.match(q.text, /回答使用中文/)
  assert.doesNotMatch(q.text, /华东区/)
  const none = buildRecall(store.list(A), { query: '今天天气' })
  assert.match(none.text, /回答使用中文/)
  assert.doesNotMatch(none.text, /退款/)
})

test('recall respects the rune budget and the per-kind cap', async () => {
  const { items, tombstones } = tables()
  const store = createMemoryStore({ items, tombstones, now })
  for (let i = 0; i < 8; i++) await store.add({ subjectId: A, kind: 'preference', content: `偏好第${i}条`, origin: 'explicit' })
  const rec = buildRecall(store.list(A), { residentMax: 5 })
  assert.equal(rec.ids.length, 5)
  const tiny = buildRecall(store.list(A), { residentMax: 8, runeBudget: 12 })
  assert.ok(tiny.ids.length < 8)
})

test('capacity is enforced per subject', async () => {
  const { items, tombstones } = tables()
  const store = createMemoryStore({ items, tombstones, now, max: 2 })
  await store.add({ subjectId: A, kind: 'fact', content: 'a1', origin: 'explicit' })
  await store.add({ subjectId: A, kind: 'fact', content: 'a2', origin: 'explicit' })
  const r = await store.add({ subjectId: A, kind: 'fact', content: 'a3', origin: 'explicit' })
  assert.equal(r.reason, 'capacity')
  const other = await store.add({ subjectId: B, kind: 'fact', content: 'b1', origin: 'explicit' })
  assert.equal(other.status, 'created')
})

test('markRecalled counts uses so frequently used situational memories rank higher', async () => {
  const { items, tombstones } = tables()
  const store = createMemoryStore({ items, tombstones, now })
  const x = await store.add({ subjectId: A, kind: 'fact', content: '口径甲适用于报表', origin: 'explicit' })
  await store.markRecalled([x.id])
  assert.equal(store.get(x.id).recalls, 1)
})

test('topic keys normalise case, width and spacing', () => {
  assert.equal(topicKey('  Answer   Language '), 'answer language')
  assert.equal(topicKey('ＡＢＣ'), 'abc')
})
