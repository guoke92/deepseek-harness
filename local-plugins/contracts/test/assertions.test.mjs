import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  assertionsOf, buildCodeAssertions, buildDbAssertions, buildDocAssertions, resolveRetrievalHits,
  projectCodeMaterial, projectDbMaterial, projectDepositMaterial, projectDocMaterial,
} from '../src/index.js'

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
      name: 'order_status', dataType: 'varchar(16)', nullable: false, defaultValue: null, comment: '订单状态',
      role: 'enum', nullCount: 0, nonNullCount: 6, distinctCount: 2, distinctApprox: false, sampleRows: 6,
      domain: { kind: 'values', values: [{ value: 'PAID', count: 4, share: 0.667 }, { value: 'CLOSED', count: 2, share: 0.333 }] },
      dictionary: true,
    },
  ],
  relations: [{
    kind: 'directed', fromTable: 'ca_fee_order', fromColumn: 'company_id', toTable: 'ca_fee_company', toColumn: 'id',
    containment: 0.98, reverseContainment: 0.4, jaccard: 0.37, fromDistinct: 40, toDistinct: 100,
    verdict: 'accepted',
  }],
  terms: [{ term: '订单状态', column: 'order_status' }],
}

test('buildDbAssertions separates structure and profile hashes', () => {
  const built = buildDbAssertions(evidence)
  assert.match(built.emphasis, /db\.schema/)
  assert.equal(built.structureHash.length, 64)
  assert.equal(built.profileHash.length, 64)
  assert.notEqual(built.structureHash, built.profileHash)
  assert.ok(built.assertions.some((item) => item.kind === 'column'))
  assert.ok(built.assertions.some((item) => item.kind === 'columnProfile'))
  assert.ok(built.assertions.some((item) => item.kind === 'assocCandidate'))
  assert.ok(built.assertions.some((item) => item.kind === 'termHint'))
})

test('profile-only change keeps structureHash', () => {
  const a = buildDbAssertions(evidence)
  const b = buildDbAssertions({ ...evidence, rowCount: 99, sampleRows: 99 })
  assert.equal(a.structureHash, b.structureHash)
  assert.notEqual(a.profileHash, b.profileHash)
})

test('projectDbMaterial emits tech and biz retrieval hits', () => {
  const material = { id: 'raw_abc123', evidence, ...buildDbAssertions(evidence) }
  const out = projectDbMaterial(material, { knowledgeBaseId: 'kb_test' })
  assert.ok(out.hits.some((hit) => hit.facet === 'tech_name' && hit.display.includes('order_status')))
  assert.ok(out.hits.some((hit) => hit.facet === 'value' && hit.display === 'PAID'))
  assert.ok(out.hits.some((hit) => hit.facet === 'biz_label' && hit.display === '订单状态'))
  assert.ok(out.hits.some((hit) => hit.facet === 'assoc'))
  const resolved = resolveRetrievalHits(out.hits, '订单状态 PAID', { limit: 5 })
  assert.ok(resolved.length >= 1)
  assert.ok(resolved.some((hit) => hit.facet === 'biz_label' || hit.facet === 'value'))
})

test('projectDbMaterial skips blank dictionary values and term hints', () => {
  const blank = {
    ...evidence,
    columns: evidence.columns.map((column) => (
      column.name === 'order_status'
        ? {
          ...column,
          dictionary: true,
          domain: {
            kind: 'values',
            values: [
              { value: '', count: 1, share: 0.1 },
              { value: '  ', count: 1, share: 0.1 },
              { value: 'PAID', count: 4, share: 0.8 },
            ],
          },
        }
        : column
    )),
    terms: [
      { term: '   ', column: 'order_status' },
      { term: '订单状态', column: 'order_status' },
    ],
  }
  const material = { id: 'raw_abc123', evidence: blank, ...buildDbAssertions(blank) }
  const out = projectDbMaterial(material, { knowledgeBaseId: 'kb_test' })
  assert.equal(out.hits.filter((hit) => hit.facet === 'value').every((hit) => hit.display.trim()), true)
  assert.ok(out.hits.some((hit) => hit.facet === 'value' && hit.display === 'PAID'))
  assert.equal(out.hits.filter((hit) => hit.facet === 'biz_label').length, 1)
  assert.ok(out.hits.every((hit) => typeof hit.display === 'string' && hit.display.trim() !== ''))
})

test('assertionsOf falls back to evidence when assertions omitted', () => {
  const derived = assertionsOf({ id: 'raw_x', evidence })
  assert.ok(derived.assertions.length > 0)
})

test('projectDepositMaterial builds an accepted case', () => {
  const material = {
    id: 'raw_depabc123',
    content: '已确认 SQL',
    evidence: {
      kind: 'sql_confirmed',
      sql: 'SELECT order_status FROM ca_fee_order',
      rowCount: 2,
      question: '有哪些订单状态',
      fields: ['ca_fee_order.order_status'],
      sessionId: 's1',
    },
  }
  const out = projectDepositMaterial(material, { knowledgeBaseId: 'kb_test' })
  assert.equal(out.okWithoutDecisions, true)
  assert.equal(out.objects[0].kind, 'case')
  assert.equal(out.hits[0].facet, 'case')
  assert.equal(out.hits[0].caliber, 'accepted')
})

test('buildCodeAssertions projects enums, mappings and apis', () => {
  const evidence = {
    kind: 'code.module',
    module: 'order',
    enums: [{ fqn: 'OrderStatus', members: [{ value: 'PAID', label: '已支付' }] }],
    mappings: [{ from: 'statusCode', to: 'order_status' }],
    apis: [{ method: 'POST', path: '/orders/pay', fields: ['orderId'], errors: ['ALREADY_PAID'] }],
  }
  const built = buildCodeAssertions(evidence)
  assert.match(built.emphasis, /code\.module/)
  assert.equal(built.structureHash.length, 64)
  const material = { id: 'raw_code123', evidence, ...built }
  const out = projectCodeMaterial(material, { knowledgeBaseId: 'kb_test' })
  assert.ok(out.hits.some((hit) => hit.objectKind === 'enum' && hit.display === 'OrderStatus'))
  assert.ok(out.hits.some((hit) => hit.facet === 'value' && hit.display === '已支付'))
  assert.ok(out.objects.some((row) => row.kind === 'mapping'))
  assert.ok(out.hits.some((hit) => hit.display === 'POST /orders/pay'))
})

test('buildDocAssertions projects glossary terms and scenarios', () => {
  const evidence = {
    kind: 'doc.artifact',
    title: '术语',
    docUri: 'docs/g.md',
    subtype: 'glossary',
    definitions: [{ term: '确权', aliases: ['资产确权'], text: '确认应付' }],
    scenarios: [{ name: '供应商融资', actors: ['供应商', '资金方'], summary: '凭应收融资' }],
    processes: [{ name: '融资申请', steps: [{ activity: '提交', seq: 1, role: '供应商' }] }],
  }
  const built = buildDocAssertions(evidence)
  assert.equal(built.emphasis, 'doc.glossary')
  assert.notEqual(built.structureHash, built.profileHash)
  const out = projectDocMaterial({ id: 'raw_doc123', evidence, ...built }, { knowledgeBaseId: 'kb_test' })
  assert.ok(out.hits.some((hit) => hit.facet === 'biz_label' && hit.display === '确权' && hit.caliber === 'proposed'))
  assert.ok(out.coverageItems.some((item) => item.severity === 'term_proposed'))
  assert.ok(out.hits.some((hit) => hit.facet === 'case' && hit.display === '供应商融资'))
  assert.ok(out.objects.some((row) => row.kind === 'activity' && row.title === '提交'))
  assert.ok(out.objects.some((row) => row.kind === 'role' && row.title === '供应商'))
})

test('assertionsOf derives code and doc evidence', () => {
  const code = assertionsOf({
    evidence: {
      kind: 'code.module', module: 'x',
      enums: [{ fqn: 'S', members: [{ value: 'A' }] }],
    },
  })
  assert.ok(code.assertions.some((item) => item.kind === 'enum'))
  const doc = assertionsOf({
    evidence: {
      kind: 'doc.artifact', title: 't', docUri: 'u', subtype: 'faq',
      definitions: [{ term: '余额', text: '剩余金额' }],
    },
  })
  assert.ok(doc.assertions.some((item) => item.kind === 'definition'))
})
