import { test } from 'node:test'
import assert from 'node:assert/strict'
import { apply, name, inject } from '../src/plugin.js'

const ctxListeners = []

function stubCtx() {
  const tools = []
  const sections = []
  const rows = new Map()
  const table = () => ({
    get: (k) => rows.get(k),
    entries: () => rows.entries(),
    put: async (k, v) => { rows.set(k, structuredClone(v)) },
    delete: async (k) => rows.delete(k),
  })
  const domain = { table: () => table(), close: async () => {} }
  return {
    tools, sections,
    logger: { error: () => {} },
    effect: (fn) => { fn() },
    listeners: [],
    on: (event, fn) => { ctxListeners.push({ event, fn }); return () => {} },
    storageDomain: { open: async () => domain },
    systemPrompt: {
      getSectionOrder: () => 9000,
      section: (s) => { sections.push(s); return () => {} },
    },
    tools_: null,
    registerTool: (def) => { tools.push(def); return () => {} },
  }
}

test('plugin declares name and injects tools, systemPrompt and storageDomain', () => {
  assert.equal(name, 'memory')
  assert.deepEqual(inject, ['tools', 'systemPrompt', 'storageDomain'])
})

test('apply registers the resident section plus memory_add and memory_list', async () => {
  const ctx = stubCtx()
  ctx.tools = { register: (def) => { ctx.tools_list = (ctx.tools_list ?? []).concat(def); return () => {} } }
  apply(ctx, { profileName: 'alice' })
  const toolNames = (ctx.tools_list ?? []).map((t) => t.name).sort()
  assert.deepEqual(toolNames, ['memory_add', 'memory_list'])
  assert.equal(ctx.sections.length, 1)
  assert.equal(ctx.sections[0].name, 'memory:resident')
  assert.equal(ctx.sections[0].order, 9001)
})

test('after a write the resident section reflects the stored preference', async () => {
  const ctx = stubCtx()
  ctx.tools = { register: (def) => { ctx.tools_list = (ctx.tools_list ?? []).concat(def); return () => {} } }
  const handle = apply(ctx, { profileName: 'alice' })
  const add = ctx.tools_list.find((t) => t.name === 'memory_add')
  const sec = ctx.sections[0]
  assert.equal(sec.text(), '')
  await new Promise((r) => setTimeout(r, 0))
  const out = JSON.parse(await add.execute({ kind: 'preference', content: '金额单位统一为元' }))
  assert.equal(out.status, 'created')
  handle.refresh()
  assert.match(sec.text(), /金额单位统一为元/)
  const list = JSON.parse(await ctx.tools_list.find((t) => t.name === 'memory_list').execute({}))
  assert.equal(list.length, 1)
  assert.equal(list[0].content, '金额单位统一为元')
})

test('subject comes from the launched profile name, falling back to config then default', async () => {
  const ctx = stubCtx()
  ctx.profileContext = { name: 'desktop' }
  ctx.tools = { register: (def) => { ctx.tools_list = (ctx.tools_list ?? []).concat(def); return () => {} } }
  apply(ctx, { profileName: 'ignored' })
  await new Promise((r) => setTimeout(r, 0))
  const add = ctx.tools_list.find((t) => t.name === 'memory_add')
  await add.execute({ kind: 'preference', content: '来自 desktop 的偏好' })
  const list = JSON.parse(await ctx.tools_list.find((t) => t.name === 'memory_list').execute({}))
  assert.equal(list.length, 1)
})

test('a user message that starts with 记住 is stored before the step continues', async () => {
  const ctx = stubCtx()
  ctx.tools = { register: (def) => { ctx.tools_list = (ctx.tools_list ?? []).concat(def); return () => {} } }
  apply(ctx, { profileName: 'alice' })
  await new Promise((r) => setTimeout(r, 0))
  const listener = ctxListeners.filter((item) => item.event === 'agent/pre-step').at(-1)
  let continued = false
  await listener.fn({
    messages: [{ content: [{ type: 'text', text: '记住：金额单位统一为元' }] }],
  }, async () => { continued = true; return 'downstream' })
  assert.equal(continued, true)
  const list = JSON.parse(await ctx.tools_list.find((t) => t.name === 'memory_list').execute({}))
  assert.equal(list[0].content, '金额单位统一为元')
  assert.match(ctx.sections[0].text(), /金额单位统一为元/)
})

test('a fact is recalled when the current question shares its terms', async () => {
  const ctx = stubCtx()
  ctx.tools = { register: (def) => { ctx.tools_list = (ctx.tools_list ?? []).concat(def); return () => {} } }
  apply(ctx, { profileName: 'alice' })
  await new Promise((r) => setTimeout(r, 0))
  await ctx.tools_list.find((t) => t.name === 'memory_add').execute({ kind: 'fact', content: '上海办公室' })
  const listener = ctxListeners.filter((item) => item.event === 'agent/pre-step').at(-1)
  await listener.fn({ messages: [{ content: '上海有哪些办公室' }] }, async () => 'ok')
  assert.match(ctx.sections[0].text(), /上海办公室/)
})

test('auto extract lands pending items that stay out of the prompt until confirmed', async () => {
  const commands = []
  const ctx = stubCtx()
  ctx.tools = { register: (def) => { ctx.tools_list = (ctx.tools_list ?? []).concat(def); return () => {} } }
  ctx.get = (name) => {
    if (name === 'commands') return { register: (def) => { commands.push(def); return () => {} } }
    if (name === 'agentDefaultModel') return { currentSelection: () => ({ provider: 'p', model: 'm' }) }
    if (name === 'llm') return { stream: async function* () {
      yield { type: 'text-delta', text: '[{"kind":"fact","content":"公司在上海"}]' }
      yield { type: 'finish', reason: 'stop' }
    } }
    return undefined
  }
  apply(ctx, { profileName: 'alice', autoExtract: true })
  await new Promise((r) => setTimeout(r, 0))
  const listener = ctxListeners.filter((item) => item.event === 'agent/pre-step').at(-1)
  await listener.fn({ messages: [{ content: '公司地点' }] }, async () => 'ok')
  const listed = JSON.parse((await commands[0].handler({ rawInput: '{"op":"list"}' })).text)
  assert.equal(listed.items[0].status, 'pending')
  assert.equal(ctx.sections[0].text().includes('公司在上海'), false)
  await commands[0].handler({ rawInput: JSON.stringify({ op: 'confirm', id: listed.items[0].id }) })
  const active = JSON.parse(await ctx.tools_list.find((t) => t.name === 'memory_list').execute({}))
  assert.equal(active[0].content, '公司在上海')
})
