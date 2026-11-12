import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildDbAssertions } from '../../contracts/src/index.js'
import { createWikiService } from '../src/service.js'
import { createMemoryTable } from '../src/store.js'
import {
  commitExtractDelta, sealExtractBundle, sealNoModelExtract,
} from '../src/pipeline-ops.js'

function domain() {
  const tables = new Map()
  return {
    table(name) {
      if (!tables.has(name)) tables.set(name, createMemoryTable())
      return tables.get(name)
    },
  }
}

function evidence() {
  return {
    kind: 'db.table',
    table: 'ca_fee_order',
    comment: '年费订单',
    rowCount: 2,
    sampleRows: 2,
    sampleMode: 'physical-prefix',
    primaryKey: ['id'],
    indexes: [],
    declaredForeignKeys: [],
    columns: [{
      name: 'order_status', dataType: 'varchar(16)', nullable: false, defaultValue: null, comment: '订单状态',
      role: 'enum', nullCount: 0, nonNullCount: 2, distinctCount: 2, distinctApprox: false, sampleRows: 2,
      domain: { kind: 'values', values: [{ value: 'PAID', count: 1, share: 0.5 }, { value: 'CLOSED', count: 1, share: 0.5 }] },
      dictionary: true,
    }],
    relations: [],
    terms: [{ term: '订单状态', column: 'order_status' }],
  }
}

test('commitExtractDelta merges validated nodes and sealExtractBundle seals', () => {
  const material = {
    id: 'raw_abc123',
    structureHash: 'a'.repeat(64),
    profileHash: 'b'.repeat(64),
    assertions: [{ kind: 'column', key: 'column:order_status', payload: { name: 'order_status' } }],
    evidence: { kind: 'db.table', table: 'ca_fee_order' },
  }
  const { bundle, addedNodes } = commitExtractDelta(material, {
    nodes: [{
      id: 'ext_status',
      kind: 'concept',
      title: '订单状态',
      support: 'direct',
      confidence: 0.9,
      evidenceAnchors: [{ assertionKey: 'column:order_status' }],
    }],
    roundIndex: 1,
    completeness: { complete: false, score: 0.4, gaps: [] },
  })
  assert.equal(addedNodes, 1)
  assert.equal(bundle.nodes.length, 1)
  const sealed = sealExtractBundle({ ...material, extractBundle: bundle }, {
    complete: true, score: 0.95, gaps: [],
  })
  assert.equal(sealed.sealed, true)
  assert.equal(sealed.completeness.complete, true)
})

test('sealNoModelExtract marks abstainReasons', () => {
  const sealed = sealNoModelExtract({
    id: 'raw_abc123',
    structureHash: 'a'.repeat(64),
    profileHash: 'b'.repeat(64),
    assertions: [],
    evidence: { table: 't' },
  })
  assert.equal(sealed.sealed, true)
  assert.ok(sealed.completeness.abstainReasons.includes('no_model'))
})

test('service projectTechnical and applyJudgements write without host corroborate loop', async () => {
  const svc = createWikiService({ domain: domain() })
  const base = await svc.bases.create({ name: '演示库', description: '', datasourceIds: [1] })
  const built = buildDbAssertions(evidence())
  const captured = await svc.materials.capture({
    sourceType: 'db',
    sourceRef: 'db:ds1/ca_fee_order',
    datasourceId: 1,
    knowledgeBaseId: base.id,
    content: '表文档',
    evidence: evidence(),
    ...built,
  })
  await svc.commitExtract(captured.id, {
    nodes: [{
      id: 'ext_order_status',
      kind: 'concept',
      title: '订单状态',
      support: 'direct',
      confidence: 0.9,
      evidenceAnchors: [{ assertionKey: 'column:order_status', materialId: captured.id }],
    }],
  })
  await svc.sealExtract(captured.id, { complete: true, score: 1, gaps: [] })
  const projected = await svc.projectTechnical({ knowledgeBaseId: base.id })
  assert.equal(projected.decided, 1)
  assert.equal(svc.materials.get(captured.id).status, 'decided')
  const applied = await svc.applyJudgements(base.id, [{
    action: 'upsert_canonical',
    confidence: 0.9,
    evidenceAnchors: [{ assertionKey: 'column:order_status', materialId: captured.id }],
    object: { kind: 'concept', title: '订单状态', support: 'direct' },
  }])
  assert.equal(applied.applied, 1)
  assert.ok(svc.listCanonical(base.id).some((row) => row.title === '订单状态'))
})

test('reject extract commit without valid anchors still requires contract shape', () => {
  assert.throws(() => sealExtractBundle({
    id: 'raw_abc123',
    structureHash: 'a'.repeat(64),
    profileHash: 'b'.repeat(64),
    assertions: [],
    evidence: {},
  }, { complete: true }), /completeness invalid/)
})
