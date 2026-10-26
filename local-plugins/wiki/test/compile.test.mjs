import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createWikiService } from '../src/service.js'
import { createMemoryTable } from '../src/store.js'
import { parseDecisions, createModelDecider } from '../src/compile.js'

function domain() {
  const tables = new Map()
  return {
    table(name) {
      if (!tables.has(name)) tables.set(name, createMemoryTable())
      return tables.get(name)
    },
  }
}

function evidence(rowCount) {
  return {
    kind: 'db.table',
    table: 'ca_fee_order',
    comment: '年费订单',
    rowCount,
    sampleRows: rowCount,
    sampleMode: 'physical-prefix',
    primaryKey: ['id'],
    indexes: [],
    declaredForeignKeys: [],
    columns: [
      {
        name: 'order_status', dataType: 'varchar(16)', nullable: false, defaultValue: null, comment: '订单状态',
        role: 'enum', nullCount: 0, nonNullCount: 2, distinctCount: 2, distinctApprox: false, sampleRows: rowCount,
        domain: { kind: 'values', values: [{ value: 'PAID', count: 1, share: 0.5 }, { value: 'CLOSED', count: 1, share: 0.5 }] },
        dictionary: true,
      },
      {
        name: 'annual_fee', dataType: 'decimal(10,2)', nullable: true, defaultValue: null, comment: '年费',
        role: 'measure', nullCount: 0, nonNullCount: rowCount, distinctCount: rowCount, distinctApprox: false, sampleRows: rowCount,
        domain: { kind: 'range', min: '1', max: String(rowCount) }, dictionary: false,
      },
    ],
    relations: [{
      kind: 'directed', fromTable: 'ca_fee_order', fromColumn: 'project_id', toTable: 'project', toColumn: 'id',
      containment: 0.62, reverseContainment: 0.2, jaccard: 0.18, fromDistinct: 30, toDistinct: 80, toUniqueness: 1,
      verdict: 'review', reason: '包含率 62.0%，未达到外键阈值',
    }],
    terms: [{ term: '订单状态', column: 'order_status' }],
  }
}

test('parseDecisions reads the JSON array out of surrounding text', () => {
  const rows = parseDecisions('说明\n[{"schemaVersion":1,"action":"new"}]\n')
  assert.equal(rows.length, 1)
  assert.equal(rows[0].action, 'new')
})

test('createModelDecider rejects a decision that fails the contract', async () => {
  const decide = createModelDecider(async () => '[{"schemaVersion":1,"action":"new"}]')
  await assert.rejects(() => decide([{ id: 'raw_abc123', sourceRef: 'db:ds1/t.c', content: 'c', evidence: {} }], { outline: '' }))
})

test('compile publishes measured table and dictionary pages', async () => {
  const svc = createWikiService({ domain: domain() })
  const captured = await svc.materials.capture({
    sourceType: 'db', sourceRef: 'db:ds1/ca_fee_order', datasourceId: 1,
    content: '第一版', evidence: evidence(2),
  })
  const result = await svc.compile()
  assert.equal(result.decided, 1)
  assert.equal(svc.page('entity/ca_fee_order').status, 'published')
  assert.match(svc.page('entity/ca_fee_order').published.body, /订单状态/)
  assert.match(svc.page('entity/ca_fee_order').published.body, /年费/)
  assert.match(svc.page('concept/ca_fee_order_order_status').published.body, /PAID/)
  assert.equal(svc.materials.get(captured.id).status, 'decided')
  assert.equal(svc.proposals().some((item) => item.kind === 'review'), true)
})

test('compile replays a failed table document and leaves other sources captured', async () => {
  const svc = createWikiService({ domain: domain() })
  const captured = await svc.materials.capture({
    sourceType: 'db', sourceRef: 'db:ds1/ca_fee_order', datasourceId: 1,
    content: '公司列', evidence: evidence(2),
  })
  await svc.materials.capture({
    sourceType: 'conversation', sourceRef: 'conversation:conv_1', datasourceId: null,
    content: '对话', evidence: {},
  })
  await svc.materials.capture({
    sourceType: 'db', sourceRef: 'db:ds1/legacy.amount', datasourceId: 1,
    content: '旧列原料', evidence: {},
  })
  await svc.materials.transition(captured.id, 'failed', { failureReason: 'schema invalid' })
  const result = await svc.compile()
  assert.equal(result.decided, 1)
  assert.equal(result.skipped, 2)
  assert.equal(svc.page('entity/ca_fee_order').status, 'published')
  assert.equal(svc.listMaterials().filter((item) => item.status === 'captured').length, 2)
})

test('a later document updates the existing table page', async () => {
  const svc = createWikiService({ domain: domain() })
  await svc.materials.capture({
    sourceType: 'db', sourceRef: 'db:ds1/ca_fee_order', datasourceId: 1,
    content: '第一版', evidence: evidence(2),
  })
  await svc.compile()
  await svc.materials.capture({
    sourceType: 'db', sourceRef: 'db:ds1/ca_fee_order', datasourceId: 1,
    content: '第二版', evidence: evidence(4),
  })
  await svc.compile()
  const page = svc.page('entity/ca_fee_order')
  assert.equal(page.version, 2)
  assert.match(page.published.body, /表总行数 4。/)
})
