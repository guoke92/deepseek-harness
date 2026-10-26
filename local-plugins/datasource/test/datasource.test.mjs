import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sketch, resemblance, containment, seedFor } from '../src/minhash.js'

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
