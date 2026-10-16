import { test } from 'node:test'
import assert from 'node:assert/strict'
import { apply } from '../src/plugin.js'

function stub() {
  const tools = []
  const sections = []
  const calls = []
  const ctx = {
    tools_list: tools,
    sections,
    calls,
    logger: { error: () => {} },
    effect: (fn) => fn(),
    provide: () => () => {},
    systemPrompt: {
      getSectionOrder: () => 9000,
      section: (section) => { sections.push(section); return () => {} },
    },
    tools: { register: (def) => { tools.push(def); return () => {} } },
    localDatasource: {
      runReadonly: async (id, sql, safety) => {
        calls.push({ id, sql, safety })
        return { rows: [{ n: 1 }], truncated: false }
      },
    },
    localWiki: {
      listMaterials: async () => [{
        sourceRef: 'db:ds1/ca_fee_order.status',
        evidence: { topK: [{ value: 'PAID', count: 3 }] },
      }],
      captureAll: async (inputs) => ({ captured: inputs.length, reused: 0, ids: inputs.map(() => 'raw_dep') }),
    },
  }
  return ctx
}

test('execute passes policy safety into the datasource and blocks a mis-referenced literal', async () => {
  const ctx = stub()
  const api = apply(ctx)
  api.setOverride({ query: { safety: { forbiddenTables: ['secret_t'], maxRows: 50 } } })
  const blocked = await api.execute({
    datasourceId: 1,
    sql: "select status from ca_fee_order where status = 'PAID'",
    referencedFields: ['other_t.col'],
  })
  assert.equal(blocked.executed, false)
  assert.equal(ctx.calls.length, 0)
  assert.equal(blocked.literals[0].status, 'rewrite')

  const ran = await api.execute({
    datasourceId: 1,
    sql: "select status from ca_fee_order where status = 'PAID'",
    referencedFields: ['ca_fee_order.status'],
  })
  assert.equal(ran.executed, true)
  assert.deepEqual(ctx.calls[0].safety.forbiddenTables, ['secret_t'])
  assert.equal(ctx.calls[0].safety.maxRows, 50)
  assert.match(ctx.sections[0].text(), /禁止访问的表：secret_t/)
})

test('确认口径 deposits the last successful SQL and is not itself a tool', async () => {
  const ctx = stub()
  const deposited = []
  ctx.localWiki.captureAll = async (inputs) => {
    deposited.push(...inputs)
    return { captured: inputs.length, reused: 0, ids: inputs.map(() => 'raw_dep') }
  }
  const listeners = []
  ctx.on = (event, fn) => { listeners.push({ event, fn }) }
  const api = apply(ctx)
  await api.execute({
    datasourceId: 1,
    sql: 'select count(*) as n from ca_fee_order',
    referencedFields: ['ca_fee_order.status'],
  })
  const listener = listeners.find((item) => item.event === 'agent/pre-step')
  let continued = false
  await listener.fn({ messages: [{ content: '确认口径' }] }, async () => { continued = true; return 'ok' })
  assert.equal(continued, true)
  assert.equal(deposited.length, 1)
  assert.match(deposited[0].content, /select count\(\*\) as n from ca_fee_order/)
  assert.deepEqual(ctx.tools_list.map((tool) => tool.name), ['analyst_execute_readonly'])
})

test('deposit is not a model tool; execute is', () => {
  const ctx = stub()
  apply(ctx)
  assert.deepEqual(ctx.tools_list.map((tool) => tool.name), ['analyst_execute_readonly'])
})
