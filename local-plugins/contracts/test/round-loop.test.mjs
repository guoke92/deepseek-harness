import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  decideRoundStop, validateCompletenessVerdict, validateExtractBundle, validateCompileJudgement,
  mergeExtractDelta, countExtractAdditions, businessCandidateKey, groundingId,
} from '../src/index.js'

test('decideRoundStop completes on model complete without error gaps', () => {
  const out = decideRoundStop({
    roundIndex: 1,
    maxRounds: 3,
    verdict: { complete: true, score: 1, gaps: [] },
    additions: 2,
    previousAdditions: null,
  })
  assert.equal(out.stop, true)
  assert.equal(out.status, 'complete')
})

test('decideRoundStop stops at max rounds as done_partial', () => {
  const out = decideRoundStop({
    roundIndex: 3,
    maxRounds: 3,
    verdict: { complete: false, score: 0.4, gaps: [{ kind: 'other', detail: 'more', severity: 'warning' }] },
    additions: 1,
    previousAdditions: 1,
  })
  assert.equal(out.stop, true)
  assert.equal(out.status, 'done_partial')
  assert.equal(out.reason, 'max_rounds')
})

test('decideRoundStop stops after two zero-delta rounds', () => {
  const out = decideRoundStop({
    roundIndex: 2,
    maxRounds: 5,
    verdict: { complete: false, score: 0.5, gaps: [] },
    additions: 0,
    previousAdditions: 0,
  })
  assert.equal(out.stop, true)
  assert.equal(out.reason, 'zero_delta')
})

test('decideRoundStop treats abstain as complete', () => {
  const out = decideRoundStop({
    roundIndex: 1,
    maxRounds: 3,
    verdict: { complete: false, score: 0.2, gaps: [], abstainReasons: ['insufficient evidence'] },
    additions: 0,
    previousAdditions: null,
  })
  assert.equal(out.stop, true)
  assert.equal(out.status, 'complete')
  assert.equal(out.reason, 'model_abstain')
})

test('extract bundle merge and addition counts', () => {
  const base = { schemaVersion: 1, nodes: [{ id: 'a', kind: 'concept', title: 'A', support: 'direct', confidence: 0.5, evidenceAnchors: [{ ref: 't' }] }], links: [] }
  const next = mergeExtractDelta(base, {
    nodes: [{ id: 'b', kind: 'concept', title: 'B', support: 'indirect', confidence: 0.6, evidenceAnchors: [{ ref: 't' }] }],
    links: [{ id: 'l1', fromRef: 'a', toRef: 'b', predicate: 'related', support: 'indirect', confidence: 0.5, evidenceAnchors: [{ ref: 't' }] }],
  })
  assert.equal(next.nodes.length, 2)
  assert.equal(countExtractAdditions(base, next).total, 2)
  assert.equal(validateExtractBundle({ ...next, completeness: { complete: false, score: 0.5, gaps: [] } }).ok, true)
})

test('compile judgement rejects page body and accepts ground', () => {
  assert.equal(validateCompileJudgement({
    action: 'upsert_canonical',
    confidence: 0.9,
    body: '# no',
    evidenceAnchors: [{ ref: 'c' }],
    object: { kind: 'concept', title: 'X' },
  }).ok, false)
  assert.equal(validateCompileJudgement({
    action: 'ground',
    confidence: 0.8,
    bizId: 'biz_1',
    techId: 'tech_1',
    predicate: 'grounds',
    evidenceAnchors: [{ assertionKey: 'column:x' }],
  }).ok, true)
  assert.equal(groundingId('biz_1', 'grounds', 'tech_1'), 'gnd:biz_1:grounds:tech_1')
  assert.ok(businessCandidateKey('kb', 'concept', '订单状态').includes('订单状态'))
})

test('completeness verdict validation', () => {
  assert.equal(validateCompletenessVerdict({ complete: true, score: 1, gaps: [] }).ok, true)
  assert.equal(validateCompletenessVerdict({ complete: true, score: 2, gaps: [] }).ok, false)
})
