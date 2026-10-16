/**
 * @local/wiki Harness 入口：宿主服务 `wiki`（storage domain `wiki`）与模型工具。
 * 模型写页面的入口是 wiki_apply_decision 与 wiki_compile。
 * 决策先过 validateDecision，再按置信度分流（高置信发布、中置信进草稿、低置信只记日志、
 * 带 review 或 delete 只生成提议）。草稿确认与提议处理不注册为模型工具。
 */
import { collectTables, createWikiService } from './service.js'
import { wikiDomainSpec } from './domain.js'
import { defaultPolicy, validateDecision } from '@local/contracts'
import { createModelDecider, textFromStream } from './compile.js'
import { dispatchWiki } from './panel.js'

export const name = 'wiki'
export const inject = ['tools', 'storageDomain']

/** @param {object} ctx Cordis 上下文 */
export function apply(ctx) {
  const ready = (async () => {
    const domain = await ctx.storageDomain.open(wikiDomainSpec)
    ctx.effect(() => () => domain.close(), 'wiki.domainClose')
    const service = createWikiService({ domain })
    await service.adoptLegacy()
    return service
  })()
  ready.catch((err) => ctx.logger?.error?.(`wiki: startup failed: ${String(err?.message ?? err)}`))

  const api = {
    outline: async (knowledgeBaseId) => (await ready).outline(knowledgeBaseId),
    search: async (query, opts) => (await ready).search(query, opts),
    page: async (slug) => (await ready).page(slug),
    expand: async (center, opts) => (await ready).expand(center, opts),
    decide: async (decision, opts) => (await ready).decide(decision, opts),
    captureAll: async (inputs) => (await ready).captureAll(inputs),
    listMaterials: async (knowledgeBaseId) => (await ready).listMaterials(knowledgeBaseId),
    getMaterial: async (id) => (await ready).materials.get(id),
    pages: async (knowledgeBaseId) => (await ready).pages(knowledgeBaseId),
    proposals: async (knowledgeBaseId) => (await ready).proposals(knowledgeBaseId),
    bases: async () => (await ready).bases.list(),
    createBase: async (input) => (await ready).bases.create(input),
    updateBase: async (id, patch) => (await ready).bases.update(id, patch),
    removeBase: async (id) => (await ready).bases.remove(id),
    bindDatasource: async (id, datasourceId) => (await ready).bases.bind(id, datasourceId),
    unbindDatasource: async (id, datasourceId) => (await ready).bases.unbind(id, datasourceId),
    setScope: async (id, datasourceId, tables) => (await ready).bases.setScope(id, datasourceId, tables),
    promote: async (slug) => (await ready).promote(slug),
    revert: async (slug, version) => (await ready).revert(slug, version),
    resolveProposal: async (id, status) => (await ready).resolveProposal(id, status),
    /**
     * 用当前默认模型编译 captured 原料。模型不可用时失败，不写空页面。
     */
    async compile(knowledgeBaseId) {
      const llm = typeof ctx.get === 'function' ? ctx.get('llm') : undefined
      const defaults = typeof ctx.get === 'function' ? ctx.get('agentDefaultModel') : undefined
      if (!llm?.stream || !defaults?.currentSelection) throw new Error('model is not available')
      const selection = defaults.currentSelection()
      const decide = createModelDecider(async (system, user) => textFromStream(llm.stream({
        provider: selection.provider,
        model: selection.model,
        ...(selection.reasoningEffort ? { reasoningEffort: selection.reasoningEffort } : {}),
        system,
        messages: [{ role: 'user', content: [{ type: 'text', text: user }] }],
      })))
      const service = await ready
      const base = service.resolveBase(knowledgeBaseId)
      return service.compile(decide, { knowledgeBaseId: base.id })
    },
    /**
     * 从数据源剖析结果追加原料。数据源插件未安装时失败，不写空原料。
     * @param {number} datasourceId
     * @param {{tables?: string[]|null, profileSampleRows?: number}} opts
     */
    async collect(datasourceId, opts = {}) {
      const datasource = typeof ctx.get === 'function' ? ctx.get('localDatasource') : undefined
      if (!datasource) throw new Error('datasource plugin is not active')
      const service = await ready
      const base = service.resolveBase(opts.knowledgeBaseId)
      service.requireBound(base.id, datasourceId)
      const policy = { ...defaultPolicy().wiki }
      if (opts.profileSampleRows) policy.profileSampleRows = opts.profileSampleRows
      const tables = collectTables(base, datasourceId, opts.tables)
      const produced = await datasource.collect(datasourceId, { tables, policy })
      const stored = await api.captureAll(produced.materials.map((item) => ({ ...item, knowledgeBaseId: base.id })))
      return {
        captured: stored.captured,
        reused: stored.reused,
        ids: stored.ids,
        dicts: {
          keep: produced.dicts.keep.length,
          hold: produced.dicts.hold.length,
          drop: produced.dicts.drop.length,
        },
      }
    },
  }
  ctx.effect(() => ctx.provide('localWiki', api), 'wiki.provide')

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
    name: 'wiki_outline',
    description: '读取 wiki 大纲：每页一行，含 slug、标题、类型、状态与版本。',
    run: (svc) => svc.outline(),
  })
  tool({
    name: 'wiki_search',
    description: '在 wiki 中检索页面（标题与正文关键词）。草稿默认参与检索，结果中以 status 标明。',
    properties: {
      query: { type: 'string', description: '检索词，空白分隔' },
      limit: { type: 'number', description: '最多返回条数，默认 8' },
      includeDrafts: { type: 'boolean', description: '是否包含草稿，默认 true' },
    },
    required: ['query'],
    run: (svc, args) => svc.search(args.query, { limit: args.limit ?? 8, includeDrafts: args.includeDrafts ?? true }),
  })
  tool({
    name: 'wiki_read_page',
    description: '读取一个 wiki 页面：已发布正文与（若存在）草稿，附出链与版本。',
    properties: { slug: { type: 'string', description: '页面 slug，如 entity/ca_fee_order' } },
    required: ['slug'],
    run: (svc, args) => {
      const p = svc.page(args.slug)
      if (!p) throw new Error(`page ${args.slug} not found`)
      return { slug: p.slug, title: p.title, pageType: p.pageType, status: p.status, version: p.version, links: p.links, published: p.published, draft: p.draft }
    },
  })
  tool({
    name: 'wiki_apply_decision',
    description: '提交一条 wiki 决策（new / update / delete）。经契约校验后落地：置信度高则发布，中等进草稿，低则只记日志；delete 只生成删除提议，不直接删页。new 必须给 body 与 pageType；update 只能给 body 或 patch 其一。',
    properties: {
      decision: { type: 'object', description: '决策：{schemaVersion:1, action, slug, pageType?, confidence(0-1), rationale(<=200字), evidenceRefs(原料 id 数组), body?(string|null), patch?({upsert?, remove?})}' },
    },
    required: ['decision'],
    run: async (svc, args) => {
      const checked = validateDecision(args.decision)
      if (!checked.ok) throw new Error(`decision invalid: ${checked.errors.join('; ')}`)
      return svc.decide(args.decision, { source: 'agent' })
    },
  })
  tool({
    name: 'wiki_list_materials',
    description: '列出 wiki 已入库的原料（id、来源、状态与内容摘要）。',
    properties: {
      status: { type: 'string', description: 'captured、decided 或 failed，缺省全部' },
      limit: { type: 'number', description: '最多返回条数，默认 50' },
    },
    run: async (svc, args) => {
      const all = svc.materials.list()
      const rows = all
        .filter((item) => !args.status || item.status === args.status)
        .slice(0, args.limit ?? 50)
        .map((item) => ({
          id: item.id, sourceType: item.sourceType, sourceRef: item.sourceRef,
          status: item.status, datasourceId: item.datasourceId, summary: String(item.content).slice(0, 200),
        }))
      return { total: all.length, rows }
    },
  })
  tool({
    name: 'wiki_get_material',
    description: '读取一条原料的全文与证据，用于核对页面出处。',
    properties: { id: { type: 'string', description: '原料 id，如 raw_xxx' } },
    required: ['id'],
    run: (svc, args) => {
      const item = svc.materials.get(args.id)
      if (!item) throw new Error(`material ${args.id} not found`)
      return item
    },
  })
  tool({
    name: 'wiki_collect',
    description: '从已经绑定到知识库的数据源剖析表结构与统计，并把结果追加为该知识库的原料。同一知识库里同一内容重复采集不会产生新原料。',
    properties: {
      knowledgeBaseId: { type: 'string', description: '知识库 id。只有一个知识库时可以省略' },
      datasourceId: { type: 'number', description: '已经绑定到该知识库的数据源 id' },
      profileSampleRows: { type: 'number', description: '每列采样行数，默认取策略值' },
      tables: { type: 'array', items: { type: 'string' }, description: '表范围，缺省全部' },
    },
    required: ['datasourceId'],
    run: (_svc, args) => api.collect(args.datasourceId, {
      knowledgeBaseId: args.knowledgeBaseId,
      tables: args.tables ?? null,
      profileSampleRows: args.profileSampleRows,
    }),
  })
  tool({
    name: 'wiki_compile',
    description: '把某个知识库里状态为 captured 的原料编译成 wiki 页面或提议。由当前默认模型生成决策，失败的原料记为 failed。',
    properties: {
      knowledgeBaseId: { type: 'string', description: '知识库 id。只有一个知识库时可以省略' },
    },
    run: (_svc, args) => api.compile(args.knowledgeBaseId),
  })
  tool({
    name: 'wiki_graph_expand',
    description: '从中心页向外展开链接图谱（最多 3 层，节点上限 80）。',
    properties: {
      center: { type: 'string', description: '中心页 slug' },
      depth: { type: 'number', description: '展开层数，默认 1' },
    },
    required: ['center'],
    run: (svc, args) => svc.expand(args.center, { depth: args.depth ?? 1 }),
  })

  const commands = typeof ctx.get === 'function' ? ctx.get('commands') : undefined
  if (commands?.register) {
    ctx.effect(() => commands.register({
      name: 'wiki',
      description: 'Wiki 面板操作。参数是 JSON：{op, slug?, id?, status?, datasourceId?, version?, tables?}',
      recordInput: false,
      handler: async (invocation) => {
        try {
          const body = JSON.parse(String(invocation.rawInput ?? '').trim() || '{}')
          return { kind: 'success', text: JSON.stringify(await dispatchWiki(api, body)) }
        } catch (err) {
          return { kind: 'error', text: String(err?.message ?? err) }
        }
      },
    }), 'wiki.command')
  }

  return { ready }
}
