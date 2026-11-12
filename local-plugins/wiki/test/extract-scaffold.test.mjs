import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildDbAssertions, validateExtractBundle } from '../../contracts/src/index.js'
import {
  buildExtractScaffoldDelta, buildScaffoldedExtractBundle, shouldSkipExtractScaffold,
} from '../src/extract-scaffold.js'

function material() {
  const evidence = {
    kind: 'db.table',
    table: 'ca_fee_order',
    comment: '年费订单',
    rowCount: 6,
    sampleRows: 6,
    sampleMode: 'latest-by-primary-key',
    primaryKey: ['id'],
    indexes: [],
    declaredForeignKeys: [],
    columns: [
      {
        name: 'id', dataType: 'bigint', nullable: false, defaultValue: null, comment: '主键',
        role: 'identifier', nullCount: 0, nonNullCount: 6, distinctCount: 6, distinctApprox: false,
        sampleRows: 6, domain: { kind: 'range', min: '1', max: '6' }, dictionary: false,
      },
      {
        name: 'order_status', dataType: 'varchar(16)', nullable: false, defaultValue: null, comment: '订单状态',
        role: 'enum', nullCount: 0, nonNullCount: 6, distinctCount: 2, distinctApprox: false, sampleRows: 6,
        domain: { kind: 'values', values: [{ value: 'PAID', count: 4, share: 0.667 }] },
        dictionary: true,
      },
      {
        name: 'annual_fee', dataType: 'decimal(10,2)', nullable: true, defaultValue: null, comment: '年费',
        role: 'measure', nullCount: 0, nonNullCount: 6, distinctCount: 6, distinctApprox: false, sampleRows: 6,
        domain: { kind: 'range', min: '1.50', max: '6.50' }, dictionary: false,
      },
    ],
    relations: [{
      kind: 'directed', fromTable: 'ca_fee_order', fromColumn: 'company_id', toTable: 'ca_fee_company', toColumn: 'id',
      containment: 0.98, reverseContainment: 0.4, jaccard: 0.37, fromDistinct: 40, toDistinct: 100, toUniqueness: 1,
      verdict: 'accepted',
    }],
    terms: [],
  }
  const built = buildDbAssertions(evidence)
  return {
    id: 'raw_abc123',
    structureHash: built.structureHash,
    profileHash: built.profileHash,
    assertions: built.assertions,
    evidence,
  }
}

test('buildExtractScaffoldDelta creates domain, role, concept, metric, and relation link', () => {
  const { nodes, links } = buildExtractScaffoldDelta(material())
  assert.ok(nodes.some((n) => n.kind === 'domain' && n.title === '年费订单'))
  assert.ok(nodes.some((n) => n.kind === 'role' && n.id.includes('.id')))
  assert.ok(nodes.some((n) => n.kind === 'concept' && n.title === '订单状态'))
  assert.ok(nodes.some((n) => n.kind === 'metric' && n.title === '年费'))
  assert.equal(links.length, 1)
  assert.equal(links[0].support, 'direct')
  for (const node of nodes) {
    assert.ok(node.evidenceAnchors?.length)
  }
})

test('buildScaffoldedExtractBundle seals with no_model and validates', () => {
  const bundle = buildScaffoldedExtractBundle(material())
  assert.ok(bundle)
  assert.equal(bundle.sealed, true)
  assert.ok(bundle.completeness.abstainReasons.includes('no_model'))
  assert.match(bundle.completeness.gaps[0].detail, /rule_scaffold/)
  assert.equal(validateExtractBundle(bundle).ok, true)
})

test('shouldSkipExtractScaffold preserves model seals', () => {
  const base = material()
  assert.equal(shouldSkipExtractScaffold(base), false)
  assert.equal(shouldSkipExtractScaffold({
    ...base,
    extractBundle: {
      sealed: true,
      completeness: { complete: true, score: 1, gaps: [], abstainReasons: [] },
    },
  }), true)
  assert.equal(shouldSkipExtractScaffold({
    ...base,
    extractBundle: {
      sealed: true,
      completeness: { complete: false, score: 0, gaps: [], abstainReasons: ['no_model'] },
    },
  }), false)
})
