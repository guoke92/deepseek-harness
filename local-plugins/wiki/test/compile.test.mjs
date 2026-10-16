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

test('parseDecisions reads the JSON array out of surrounding text', () => {
  const rows = parseDecisions('说明\n[{"schemaVersion":1,"action":"new"}]\n')
  assert.equal(rows.length, 1)
  assert.equal(rows[0].action, 'new')
})

test('compile publishes a captured material when the model returns a valid decision', async () => {
  const svc = createWikiService({ domain: domain() })
  const captured = await svc.materials.capture({
    sourceType: 'db', sourceRef: 'db:ds1/ca_fee_order.amount', datasourceId: 1,
    content: '金额列', evidence: {},
  })
  const result = await svc.compile(async (batch) => [{
    schemaVersion: 1,
    action: 'new',
    slug: 'entity/ca_fee_order',
    pageType: 'entity',
    confidence: 0.9,
    rationale: '列注释充分',
    evidenceRefs: [batch[0].id],
    body: '# ca_fee_order\n\n金额列。',
  }])
  assert.equal(result.decided, 1)
  assert.equal(svc.page('entity/ca_fee_order').status, 'published')
  assert.equal(svc.materials.get(captured.id).status, 'decided')
})

test('compile replays a failed material before asking the model again', async () => {
  const svc = createWikiService({ domain: domain() })
  const captured = await svc.materials.capture({
    sourceType: 'db', sourceRef: 'db:ds1/ca_fee_order.company_id', datasourceId: 1,
    content: '公司列', evidence: {},
  })
  await svc.materials.transition(captured.id, 'failed', { failureReason: 'schema invalid' })
  const result = await svc.compile(async (batch) => [{
    schemaVersion: 1,
    action: 'new',
    slug: 'concept/ca_fee_order_company_id',
    pageType: 'concept',
    confidence: 0.6,
    rationale: '只陈述已测量的基数',
    evidenceRefs: [batch[0].id],
    body: '# company_id\n\n不同值 5。',
  }])
  assert.equal(result.decided, 1)
  assert.equal(svc.page('concept/ca_fee_order_company_id').status, 'draft_only')
})

test('createModelDecider rejects a decision that fails the contract', async () => {
  const decide = createModelDecider(async () => '[{"schemaVersion":1,"action":"new"}]')
  await assert.rejects(() => decide([{ id: 'raw_abc123', sourceRef: 'db:ds1/t.c', content: 'c', evidence: {} }], { outline: '' }))
})
