import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sketch, resemblance, containment, seedFor } from '../src/minhash.js'
import { buildProfile, classifySkip, canonical } from '../src/profile.js'
import { generateCandidates, typesCompatible, nameSimilarity, commentRef } from '../src/candidates.js'

const range = (a, b) => Array.from({ length: b - a }, (_, i) => String(a + i))

test('minhash: identical sets have resemblance 1, disjoint sets near 0', () => {
  const k = 128
  const s1 = sketch(range(0, 500), k)
  const s2 = sketch(range(0, 500), k)
  assert.equal(resemblance(s1, s2), 1)
  const s3 = sketch(range(10000, 10500), k)
  assert.ok(resemblance(s1, s3) < 0.1)
})

test('minhash: estimates Jaccard within a reasonable error for half-overlapping sets', () => {
  // A = 0..999, B = 500..1499 → J = 500 / 1500 = 0.3333
  const k = 256
  const j = resemblance(sketch(range(0, 1000), k), sketch(range(500, 1500), k))
  assert.ok(Math.abs(j - 1 / 3) < 0.1, `estimate ${j} too far from 0.333`)
})

test('minhash: deterministic and empty input returns null', () => {
  assert.deepEqual(sketch(range(0, 50), 16), sketch(range(0, 50), 16))
  assert.equal(sketch([], 16), null)
  assert.equal(resemblance(null, sketch(['a'], 16)), null)
  assert.notEqual(seedFor(0), seedFor(1))
})

test('containment: derived from Jaccard and sizes', () => {
  // A 完全包含于 B：|A|=100, |B|=1000, I=100, J=100/1000=0.1
  const c = containment(0.1, 100, 1000)
  assert.ok(Math.abs(c.aInB - 1) < 1e-9)
  assert.ok(Math.abs(c.bInA - 0.1) < 1e-9)
  assert.deepEqual(containment(null, 1, 1), { aInB: null, bInA: null })
})

test('classifySkip: json/text/date/temporal and audit or tenant columns', () => {
  assert.equal(classifySkip({ name: 'x', dataType: 'json' }), 'json')
  assert.equal(classifySkip({ name: 'x', dataType: 'text' }), 'text_blob')
  assert.equal(classifySkip({ name: 'x', dataType: 'date' }), 'date')
  assert.equal(classifySkip({ name: 'x', dataType: 'datetime' }), 'temporal')
  assert.equal(classifySkip({ name: 'create_time', dataType: 'datetime' }), 'temporal')
  assert.equal(classifySkip({ name: 'tenant_id', dataType: 'bigint' }), 'audit_or_tenant')
  assert.equal(classifySkip({ name: 'company_id', dataType: 'bigint' }), null)
})

test('canonical: null stays null, others become strings', () => {
  assert.equal(canonical(null), null)
  assert.equal(canonical(undefined), null)
  assert.equal(canonical(12), '12')
  assert.equal(canonical(12n), '12')
})

test('buildProfile: counts, shape, topK, sketch, and high-default exclusion for non-dict columns', () => {
  // 1000 行非字典列；'DEFAULT' 占 60%（高频默认值，应被剔除），其余 300 个不同值
  const values = []
  for (let i = 0; i < 600; i++) values.push('DEFAULT')
  for (let i = 0; i < 300; i++) values.push(`v${i}`)
  for (let i = 0; i < 100; i++) values.push(null)
  const p = buildProfile({
    table: 't', column: { name: 'phone', dataType: 'varchar' }, values,
    rowCount: 1000, sampleRows: values.length, k: 64, dictDistinctMax: 32, highDefaultRatio: 0.05,
  })
  assert.equal(p.nullCount, 100)
  assert.equal(p.distinctCount, 301)
  assert.equal(p.isDictLike, false)
  assert.ok(p.excludedDefaults.includes('DEFAULT'))
  assert.equal(p.topK[0].value, 'DEFAULT')
  assert.equal(p.minhash.length, 64)
  assert.equal(p.skipReason, null)
})

test('buildProfile: low-cardinality columns are dict-like and keep their values', () => {
  const values = ['PAID', 'PAID', 'PENDING', 'CLOSED', null]
  const p = buildProfile({
    table: 'ca_fee_order', column: { name: 'order_status', dataType: 'varchar' }, values,
    rowCount: 5, sampleRows: 5, k: 16, dictDistinctMax: 32, highDefaultRatio: 0.05,
  })
  assert.equal(p.isDictLike, true)
  assert.deepEqual(p.excludedDefaults, [])
  assert.equal(p.distinctCount, 3)
})

test('buildProfile: skipped columns carry no minhash; sampled distinct is approximate', () => {
  const p = buildProfile({
    table: 't', column: { name: 'payload', dataType: 'json' }, values: ['{"a":1}'],
    rowCount: 1, sampleRows: 1, k: 16, dictDistinctMax: 32, highDefaultRatio: 0.05,
  })
  assert.equal(p.skipReason, 'json')
  assert.equal(p.minhash, null)
  const q = buildProfile({
    table: 't', column: { name: 'code', dataType: 'varchar' }, values: ['a', 'b'],
    rowCount: 100000, sampleRows: 2, k: 16, dictDistinctMax: 32, highDefaultRatio: 0.05,
  })
  assert.equal(q.distinctApprox, true)
})

test('buildProfile: numeric min/max without spreading large arrays', () => {
  const values = Array.from({ length: 200000 }, (_, i) => String(i))
  const p = buildProfile({
    table: 't', column: { name: 'n', dataType: 'bigint' }, values,
    rowCount: 200000, sampleRows: 200000, k: 8, dictDistinctMax: 32, highDefaultRatio: 0.05,
  })
  assert.equal(p.min, 0)
  assert.equal(p.max, 199999)
})

test('typesCompatible: numeric vs numeric, text vs text, and bigint vs varchar', () => {
  assert.equal(typesCompatible({ dataType: 'bigint' }, { dataType: 'int' }), true)
  assert.equal(typesCompatible({ dataType: 'varchar' }, { dataType: 'text' }), true)
  assert.equal(typesCompatible({ dataType: 'bigint' }, { dataType: 'varchar' }), true)
  assert.equal(typesCompatible({ dataType: 'numeric' }, { dataType: 'varchar' }), true)
  assert.equal(typesCompatible({ dataType: 'date' }, { dataType: 'bigint' }), false)
})

test('nameSimilarity and commentRef', () => {
  assert.equal(nameSimilarity({ table: 'a', column: 'x' }, { table: 'b', column: 'x' }).score, 1)
  assert.equal(nameSimilarity({ table: 'order', column: 'id' }, { table: 'fee', column: 'order_id' }).score, 0.8)
  assert.equal(nameSimilarity({ table: 'a', column: 'p' }, { table: 'b', column: 'q' }).score, 0)
  assert.deepEqual(commentRef('关联 schools#CDSCode 的代码'), { table: 'schools', column: 'CDSCode' })
  assert.equal(commentRef('无引用'), null)
})

test('generateCandidates: value overlap plus name gives name_match; overlap-only gives unknown; name-only is dropped', () => {
  const k = 128
  const shared = range(0, 400)
  const mk = (table, column, dataType, vals) => buildProfile({
    table, column: { name: column, dataType }, values: vals, rowCount: vals.length, sampleRows: vals.length,
    k, dictDistinctMax: 32, highDefaultRatio: 0.05,
  })
  const profiles = [
    mk('fee_order', 'company_id', 'bigint', shared),
    mk('company', 'id', 'bigint', shared.concat(range(400, 420))),
    mk('other', 'weird_col', 'bigint', shared.concat(range(900, 920))),
    mk('noise', 'company_id', 'bigint', range(5000, 5300)),
  ]
  const cands = generateCandidates(profiles, { minOverlap: 0.2, dictDistinctMax: 32 })
  const joins = cands.filter((c) => c.kind === 'join')
  const fc = joins.find((c) => c.left.table === 'fee_order' && c.right.table === 'company')
  assert.ok(fc, 'expected fee_order ↔ company')
  assert.equal(fc.authenticity, 'name_match')
  assert.ok(fc.evidence.overlapEstimate > 0.5)
  const weird = joins.find((c) => [c.left.table, c.right.table].includes('other'))
  assert.ok(weird, 'overlap-only pair should be kept')
  assert.equal(weird.authenticity, 'unknown')
  assert.equal(joins.find((c) => [c.left.table, c.right.table].includes('noise')), undefined)
})

test('generateCandidates: dict candidates for low-cardinality columns, skipped columns excluded', () => {
  const dict = buildProfile({
    table: 'ca_fee_order', column: { name: 'order_status', dataType: 'varchar' },
    values: ['PAID', 'CLOSED', 'PENDING'], rowCount: 3, sampleRows: 3, k: 16, dictDistinctMax: 32, highDefaultRatio: 0.05,
  })
  const js = buildProfile({
    table: 'ca_fee_order', column: { name: 'payload', dataType: 'json' }, values: ['{}'],
    rowCount: 1, sampleRows: 1, k: 16, dictDistinctMax: 32, highDefaultRatio: 0.05,
  })
  const cands = generateCandidates([dict, js], { dictDistinctMax: 32 })
  assert.equal(cands.filter((c) => c.kind === 'dict').length, 1)
  assert.equal(cands.filter((c) => c.kind === 'join').length, 0)
})

test('generateCandidates: comment table#column becomes a comment_fk join with priority primary', () => {
  const a = buildProfile({
    table: 'frpm', column: { name: 'CDSCode', dataType: 'varchar', comment: 'see schools#CDSCode' },
    values: ['a', 'b'], rowCount: 2, sampleRows: 2, k: 16, dictDistinctMax: 32, highDefaultRatio: 0.05,
  })
  const b = buildProfile({
    table: 'schools', column: { name: 'CDSCode', dataType: 'varchar' },
    values: ['a', 'b'], rowCount: 2, sampleRows: 2, k: 16, dictDistinctMax: 32, highDefaultRatio: 0.05,
  })
  const cands = generateCandidates([a, b], { dictDistinctMax: 32 })
  const fk = cands.find((c) => c.authenticity === 'comment_fk')
  assert.ok(fk)
  assert.equal(fk.right.table, 'schools')
})

test('generateCandidates: low-cardinality (dict-like) columns never form value-overlap joins', () => {
  const statusVals = ['0', '1', '2']
  const a = buildProfile({ table: 'x', column: { name: 'status', dataType: 'int' }, values: statusVals, rowCount: 3, sampleRows: 3, k: 32, dictDistinctMax: 32, highDefaultRatio: 0.05 })
  const b = buildProfile({ table: 'y', column: { name: 'flag', dataType: 'int' }, values: statusVals, rowCount: 3, sampleRows: 3, k: 32, dictDistinctMax: 32, highDefaultRatio: 0.05 })
  const cands = generateCandidates([a, b], { dictDistinctMax: 32 })
  assert.equal(cands.filter((c) => c.kind === 'join').length, 0)
  assert.equal(cands.filter((c) => c.kind === 'dict').length, 2)
})

test('generateCandidates: same-table value overlap is downgraded to unknown/secondary, never name_match', () => {
  const vals = range(0, 300)
  const a = buildProfile({ table: 'cust', column: { name: 'code', dataType: 'varchar' }, values: vals, rowCount: 300, sampleRows: 300, k: 64, dictDistinctMax: 32, highDefaultRatio: 0.05 })
  const b = buildProfile({ table: 'cust', column: { name: 'name', dataType: 'varchar' }, values: vals, rowCount: 300, sampleRows: 300, k: 64, dictDistinctMax: 32, highDefaultRatio: 0.05 })
  const cands = generateCandidates([a, b], { dictDistinctMax: 32 })
  const j = cands.find((c) => c.kind === 'join')
  assert.ok(j)
  assert.equal(j.authenticity, 'unknown')
  assert.equal(j.priority, 'secondary')
  assert.equal(j.evidence.sameTable, true)
})
