import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  validateDbTableEvidence, dbDocumentGaps, renderDbTable, renderDictionary, compileDbDocument, relationBasis,
} from '../src/db-document.js'

const evidence = {
  kind: 'db.table',
  table: 'ca_fee_order',
  comment: '年费订单',
  rowCount: 6,
  sampleRows: 6,
  sampleMode: 'latest-by-primary-key',
  primaryKey: ['id'],
  indexes: [{ name: 'idx_company', unique: false, columns: ['company_id'] }],
  declaredForeignKeys: [],
  columns: [
    {
      name: 'id', dataType: 'bigint', nullable: false, defaultValue: null, comment: '主键',
      role: 'identifier', nullCount: 0, nonNullCount: 6, distinctCount: 6, distinctApprox: false,
      sampleRows: 6, domain: { kind: 'range', min: '9000000000000000101', max: '9000000000000000106' }, dictionary: false,
    },
    {
      name: 'order_status', dataType: 'varchar(16)', nullable: false, defaultValue: null, comment: '订单状态',
      role: 'enum', nullCount: 0, nonNullCount: 6, distinctCount: 2, distinctApprox: false, sampleRows: 6,
      domain: { kind: 'values', values: [{ value: 'PAID', count: 4, share: 0.667 }, { value: 'CLOSED', count: 2, share: 0.333 }] },
      dictionary: true,
    },
    {
      name: 'annual_fee', dataType: 'decimal(10,2)', nullable: true, defaultValue: null, comment: '年费',
      role: 'measure', nullCount: 0, nonNullCount: 6, distinctCount: 6, distinctApprox: false, sampleRows: 6,
      domain: { kind: 'range', min: '1.50', max: '6.50' }, dictionary: false,
    },
    {
      name: 'mobile', dataType: 'varchar(20)', nullable: true, defaultValue: null, comment: '手机',
      role: 'masked', nullCount: 1, nonNullCount: 5, distinctCount: 0, distinctApprox: false, sampleRows: 6,
      domain: { kind: 'redacted' }, dictionary: false,
    },
  ],
  relations: [{
    kind: 'directed', fromTable: 'ca_fee_order', fromColumn: 'company_id', toTable: 'ca_fee_company', toColumn: 'id',
    containment: 0.98, reverseContainment: 0.4, jaccard: 0.37, fromDistinct: 40, toDistinct: 100, toUniqueness: 1,
    verdict: 'accepted',
  }],
  terms: [{ term: '订单状态', column: 'order_status' }, { term: '年费', column: 'annual_fee' }],
}

test('table document keeps every column, comment and measured range', () => {
  assert.equal(validateDbTableEvidence(evidence).ok, true)
  const body = renderDbTable(evidence)
  assert.deepEqual(dbDocumentGaps(body, evidence), [])
  assert.match(body, /表总行数 6。/)
  assert.match(body, /采样行数 6，方式：主键倒序/)
  assert.match(body, /\| 空值率 \| 基数 \| 区分度 \|/)
  assert.match(body, /\| id \| bigint \|/)
  assert.match(body, /主键/)
  assert.match(body, /订单状态/)
  assert.match(body, /年费/)
  assert.match(body, /1\.50 \.\. 6\.50/)
  assert.match(body, /\[\[concept\/ca_fee_order_order_status\]\]/)
  assert.match(body, /company_id → ca_fee_company\.id/)
  assert.match(body, /\| 基数 \| 40 \| 100 \|/)
  assert.match(body, /0\.37（39\/101）/)
  assert.doesNotMatch(body, /PAID/)
  assert.doesNotMatch(body, /## 术语/)
  assert.doesNotMatch(body, /9000000000000000103/)
  assert.doesNotMatch(body, /13800138000/)
  assert.doesNotMatch(body, /高频值/)
  const dict = renderDictionary(evidence, evidence.columns[1])
  assert.match(dict, /^# 订单状态\n/)
  assert.match(dict, /\| PAID \| 4 \| 66\.7% \|/)
})

test('containment is |A∩B| / |A| for the column in that cell', () => {
  const text = relationBasis({
    fromTable: 'ca_fee_company', fromColumn: 'source_project_id',
    toTable: 'ca_fee_order', toColumn: 'project_id',
    fromDistinct: 41, toDistinct: 42,
    containment: 1, reverseContainment: 41 / 42, jaccard: 41 / 42,
  })
  assert.match(text, /包含率 \\|A∩B\\|\/\\|A\\|/)
  assert.match(text, /100\.0%（41\/41）/)
  assert.match(text, /97\.6%（41\/42）/)
  assert.match(text, /0\.98（41\/42）/)
})

test('a stripped column fails the completeness check', () => {
  const body = renderDbTable(evidence).split('\n').filter((line) => !line.startsWith('| annual_fee |')).join('\n')
  assert.ok(dbDocumentGaps(body, evidence).includes('column annual_fee'))
})

test('compile publishes the measured pages and holds a weak relation for review', () => {
  const review = {
    ...evidence,
    relations: [
      ...evidence.relations,
      {
        kind: 'directed', fromTable: 'ca_fee_order', fromColumn: 'project_id', toTable: 'project', toColumn: 'id',
        containment: 0.6, reverseContainment: 0.1, jaccard: 0.16, fromDistinct: 30, toDistinct: 100, toUniqueness: 1,
        verdict: 'review', reason: '包含率 60.0%，未达到外键阈值',
      },
    ],
  }
  const decisions = compileDbDocument({ id: 'raw_abc123', evidence: review }, { hasPage: () => false, knowledgeBaseId: 'kb_demo' })
  const slugs = decisions.map((item) => item.slug)
  assert.ok(slugs.includes('entity/ca_fee_order'))
  assert.ok(slugs.includes('concept/ca_fee_order_order_status'))
  assert.ok(slugs.includes('relation/ca_fee_order_company_id_ca_fee_company_id_link'))
  assert.equal(decisions.find((item) => item.slug.includes('company_id')).pageType, 'relation')
  const held = decisions.find((item) => item.slug.includes('project_id'))
  assert.equal(held.review.reasons[0].includes('\n'), false)
  assert.match(held.review.reasons[0], /基数 30/)
  assert.match(held.review.brief, /0\.16（18\/112）/)
  assert.match(held.review.brief, /要判断的事/)
  assert.match(held.review.brief, /接受会把这层关联写成一页/)
  assert.equal(held.review.publish.slug, held.slug)
  assert.equal(held.review.publish.confidence, 0.95)
  assert.equal(held.review.objectId, 'tech_rel:kb_demo:ca_fee_order.project_id->project.id')
  assert.match(held.body, /\| 区分度 \| — \| 1\.00 \|/)
  assert.equal(decisions.find((item) => item.slug === 'entity/ca_fee_order').confidence, 0.95)
  const dict = decisions.find((item) => item.slug === 'concept/ca_fee_order_order_status')
  assert.match(dict.body, /^# 订单状态\n/)
  const again = compileDbDocument({ id: 'raw_abc123', evidence }, { hasPage: (slug) => slug === 'entity/ca_fee_order' })
  assert.equal(again.find((item) => item.slug === 'entity/ca_fee_order').action, 'update')
})

test('time relations and an open review are not compiled again', () => {
  const timed = {
    ...evidence,
    columns: [
      ...evidence.columns,
      {
        name: 'create_time', dataType: 'datetime', nullable: false, defaultValue: null, comment: '创建时间',
        role: 'time', nullCount: 0, nonNullCount: 6, distinctCount: 6, distinctApprox: false, sampleRows: 6,
        domain: { kind: 'range', min: '2024-01-01', max: '2024-01-06' }, dictionary: false,
      },
    ],
    relations: [
      ...evidence.relations,
      {
        kind: 'directed', fromTable: 'ca_fee_order', fromColumn: 'project_id', toTable: 'project', toColumn: 'id',
        containment: 0.6, reverseContainment: 0.1, jaccard: 0.16, fromDistinct: 30, toDistinct: 100, toUniqueness: 1,
        verdict: 'review',
      },
      {
        kind: 'directed', fromTable: 'ca_fee_order', fromColumn: 'create_time', toTable: 'ca_fee_company', toColumn: 'create_time',
        containment: 0.7, reverseContainment: 0.2, jaccard: 0.2, fromDistinct: 30, toDistinct: 40, toUniqueness: 0.4,
        fromRows: 6, toRows: 6, verdict: 'review',
      },
    ],
  }
  const decisions = compileDbDocument({ id: 'raw_abc123', evidence: timed }, {
    hasPage: () => false,
    hasOpenProposal: (slug) => slug.includes('project_id'),
  })
  assert.equal(decisions.some((item) => item.slug.includes('create_time')), false)
  assert.equal(decisions.some((item) => item.slug.includes('project_id')), false)
})

test('a rare value stays visible instead of rounding to 0%', () => {
  const dict = renderDictionary(evidence, {
    name: 'fee_locked',
    comment: '',
    domain: {
      kind: 'values',
      values: [
        { value: 'Y', count: 4, share: 0.0004 },
        { value: 'N', count: 1, share: 0 },
      ],
    },
  })
  assert.match(dict, /^# fee_locked\n/)
  assert.match(dict, /\| Y \| 4 \| 0\.04% \|/)
  assert.match(dict, /\| N \| 1 \| <0\.1% \|/)
})

test('materials without a db.table document are not compiled as tables', () => {
  assert.equal(compileDbDocument({ id: 'raw_abc123', evidence: {} }), null)
})
