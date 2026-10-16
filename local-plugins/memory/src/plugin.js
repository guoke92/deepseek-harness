/**
 * @local/memory Harness 入口（方案 b：仅常驻记忆）。
 * - 系统提示词：profile / preference / interest 的常驻块（按 subject 取值，不随问题变化）。
 * - 工具：memory_add（显式写入，origin=explicit）、memory_list（只读列出）。
 * 用户消息里的「记住」在 agent/pre-step 写入 preference。
 * 同一轮用户文本作为 query，召回 fact / task。自动提取默认关闭，打开后先写入 pending。
 */
import { defaultPolicy } from '@local/contracts'
import { createMemoryStore } from './store.js'
import { buildRecall } from './recall.js'
import { extractExplicitMemory } from './explicit.js'
import { parseExtractedMemories } from './extract.js'
import { dispatchMemory } from './panel.js'
import { memoryDomainSpec } from './domain.js'

export const name = 'memory'
export const inject = ['tools', 'systemPrompt', 'storageDomain']

export function apply(ctx, config = {}) {
  // dsh 启动的 profile 才有 profileContext；缺失时退回 config.profileName，再缺失时为 default。
  const profileName = ctx.profileContext?.name ?? config.profileName ?? 'default'
  const subjectId = `profile:${profileName}`
  const autoExtract = config.autoExtract ?? defaultPolicy().memory.autoExtract
  // 常驻块是同步读取的快照：存储就绪与每次写入后刷新，system prompt provider 只读快照。
  let resident = ''
  let query = ''
  let store = null
  const refresh = () => {
    if (store === null) { resident = ''; return }
    const recall = buildRecall(store.list(subjectId), { query })
    resident = recall.text
    if (recall.ids.length > 0) void store.markRecalled(recall.ids)
  }
  const ready = (async () => {
    const domain = await ctx.storageDomain.open(memoryDomainSpec)
    ctx.effect(() => () => domain.close(), 'memory.domainClose')
    store = createMemoryStore({ items: domain.table('items'), tombstones: domain.table('tombstones') })
    refresh()
    return store
  })()
  ready.catch((err) => ctx.logger?.error?.(`memory: startup failed: ${String(err?.message ?? err)}`))

  ctx.on('agent/pre-step', async (payload, next) => {
    const texts = (payload?.messages ?? []).map(textOf).filter(Boolean)
    query = texts.at(-1) ?? ''
    if (store) refresh()
    const decision = await next()
    try {
      const st = await ready
      for (const text of texts) {
        const content = extractExplicitMemory(text)
        if (!content) continue
        const exists = st.list(subjectId).some((item) => item.status === 'active' && item.content === content)
        if (exists) continue
        await st.add({ subjectId, kind: 'preference', content, origin: 'explicit' })
      }
      if (autoExtract && query && !extractExplicitMemory(query)) await extractPending(ctx, st, subjectId, query)
      refresh()
    } catch (err) {
      ctx.logger?.error?.(`memory: explicit remember failed: ${String(err?.message ?? err)}`)
    }
    return decision
  })

  ctx.systemPrompt.section({
    name: 'memory:resident',
    order: ctx.systemPrompt.getSectionOrder('DELIVERABLE_FILE_REFERENCES') + 1,
    text: () => resident,
  })

  const tool = (def) => ctx.tools.register({
    name: def.name,
    description: def.description,
    parameters: {
      type: 'object',
      properties: def.properties ?? {},
      ...(def.required?.length ? { required: def.required } : {}),
      additionalProperties: false,
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: String(value) }],
    },
    execute: async (args) => {
      try {
        return JSON.stringify(await def.run(await ready, args ?? {}), null, 2)
      } catch (err) {
        return JSON.stringify({ error: String(err?.message ?? err) })
      }
    },
  })

  tool({
    name: 'memory_add',
    description: '记录一条关于当前用户的长期记忆（用户明确要求「记住」时使用）。内容为单行，不超过 300 字。',
    properties: {
      kind: { type: 'string', description: 'profile、preference 或 interest（常驻记忆）' },
      content: { type: 'string', description: '一句话，单行' },
      topic: { type: 'string', description: '主题名，同主题的新说法替代旧说法（可选）' },
    },
    required: ['kind', 'content'],
    run: async (st, args) => {
      const r = await st.add({ subjectId, kind: args.kind, content: args.content, origin: 'explicit', topic: args.topic ?? null })
      refresh()
      return r
    },
  })

  tool({
    name: 'memory_list',
    description: '列出当前用户已生效的长期记忆（只读）。',
    run: (st) => st.list(subjectId).filter((m) => m.status === 'active').map((m) => ({ id: m.id, kind: m.kind, content: m.content, topic: m.topic })),
  })

  const commands = typeof ctx.get === 'function' ? ctx.get('commands') : undefined
  if (commands?.register) {
    ctx.effect(() => commands.register({
      name: 'memory',
      description: '记忆面板操作。参数是 JSON：{op, id?, kind?, content?, topic?}',
      recordInput: false,
      handler: async (invocation) => {
        try {
          const body = JSON.parse(String(invocation.rawInput ?? '').trim() || '{}')
          const st = await ready
          const result = await dispatchMemory(st, subjectId, body)
          refresh()
          return { kind: 'success', text: JSON.stringify(result) }
        } catch (err) {
          return { kind: 'error', text: String(err?.message ?? err) }
        }
      },
    }), 'memory.command')
  }

  return { subjectId, refresh: () => refresh() }
}

async function extractPending(ctx, store, subjectId, text) {
  const llm = typeof ctx.get === 'function' ? ctx.get('llm') : undefined
  const defaults = typeof ctx.get === 'function' ? ctx.get('agentDefaultModel') : undefined
  if (!llm?.stream || !defaults?.currentSelection) return
  const selection = defaults.currentSelection()
  let raw = ''
  for await (const chunk of llm.stream({
    provider: selection.provider,
    model: selection.model,
    ...(selection.reasoningEffort ? { reasoningEffort: selection.reasoningEffort } : {}),
    system: '从用户这句话里提取值得长期记住的事实或事项。只输出 JSON 数组，元素为 {"kind":"fact|task|preference|interest|profile","content":"一句话"}。没有则输出 []。',
    messages: [{ role: 'user', content: [{ type: 'text', text }] }],
  })) {
    if (chunk.type === 'text-delta' && chunk.text) raw += chunk.text
  }
  for (const item of parseExtractedMemories(raw)) {
    await store.add({ subjectId, kind: item.kind, content: item.content, origin: 'extracted' })
  }
}

function textOf(message) {
  const content = message?.content
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content.filter((block) => block?.type === 'text' && typeof block.text === 'string').map((block) => block.text).join('\n')
}
