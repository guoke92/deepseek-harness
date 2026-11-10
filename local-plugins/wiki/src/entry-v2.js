/**
 * @local/wiki Harness 入口：宿主服务 `wiki`（storage domain `wiki`）与模型工具。
 * 模型写页面的入口是 wiki_apply_decision。wiki_compile 按来源类型调用已注册的编译器。
 * 决策先过 validateDecision，再按置信度分流（高置信发布、中置信进草稿、低置信只记日志、
 * 带 review 或 delete 只生成提议）。草稿确认与提议处理不注册为模型工具。
 */
import { collectTables, createWikiService } from './service.js'
import { wikiDomainSpec } from './domain.js'
import { defaultPolicy, validateDecision } from '@local/contracts'
import { dispatchWiki } from './panel.js'
import { createTaskRunner } from './tasks.js'
import { codeMaterial, docMaterial } from './ingest.js'
import { listPacks } from './packs.js'

export const name = 'wiki'
export const inject = ['tools', 'storageDomain']

/** @param {object} ctx Cordis 上下文 */
export function apply(ctx) {
  const ready = (async () => {
    const domain = await ctx.storageDomain.open(wikiDomainSpec)
    ctx.effect(() => () => domain.close(), 'wiki.domainClose')
    const service = createWikiService({ domain })
    await service.materials.reconcile()
    await service.adoptLegacy()
    await service.reconcileOrphans()
    return service
  })()
  ready.catch((err) => ctx.logger?.error?.(`wiki: startup failed: ${String(err?.message ?? err)}`))

  const tasks = createTaskRunner()
  const api = {
    outline: async (knowledgeBaseId) => (await ready).outline(knowledgeBaseId),
    search: async (query, opts) => (await ready).search(query, opts),
    resolve: async (query, opts) => (await ready).resolve(query, opts),
    coverage: async (knowledgeBaseId) => (await ready).coverage(knowledgeBaseId),
    page: async (slug, knowledgeBaseId) => (await ready).page(slug, knowledgeBaseId),
    expand: async (center, opts) => (await ready).expand(center, opts),
    decide: async (decision, opts) => (await ready).decide(decision, opts),
    captureAll: async (inputs) => (await ready).captureAll(inputs),
    listMaterials: async (knowledgeBaseId) => (await ready).listMaterials(knowledgeBaseId),
    /**
     * 当前知识库已绑定的数据源，以及每个数据源在这个知识库里的选表范围。
     * 范围先用知识库自己的表，没有时用数据源默认范围；两边都没有时 tables 为 null，表示连接库里的表。
     * 不返回主机、账号和密码。
     * @param {string} [knowledgeBaseId]
     * @returns {Promise<{id: string, name: string, sources: {id: number, name: string, type: string, tables: string[]|null}[]}>}
     */
    async boundSources(knowledgeBaseId) {
      const service = await ready
      const base = service.resolveBase(knowledgeBaseId)
      const datasource = typeof ctx.get === 'function' ? ctx.get('localDatasource') : undefined
      if (!datasource?.get) throw new Error('datasource plugin is not active')
      const sources = []
      for (const id of base.datasourceIds ?? []) {
        const view = await datasource.get(id)
        sources.push({
          id: Number(id),
          name: typeof view?.name === 'string' ? view.name : '',
          type: typeof view?.type === 'string' ? view.type : '',
          tables: collectTables(base, id, null, view?.scope?.tables),
        })
      }
      return { id: base.id, name: base.name, sources }
    },
    removeMaterial: async (id) => (await ready).removeMaterial(id),
    clearMaterials: async (knowledgeBaseId) => (await ready).clearMaterials(knowledgeBaseId),
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
    setDefault: async (id) => (await ready).bases.setDefault(id),
    setFocus: async (id) => (await ready).bases.setFocus(id),
    setPacks: async (id, packIds) => (await ready).bases.setPacks(id, packIds),
    listPacks: async () => listPacks().map((pack) => ({
      id: pack.id, version: pack.version, title: pack.title,
    })),
    /**
     * 投递代码模块证据为粗加工原料。
     * @param {object} evidence kind=code.module
     * @param {{knowledgeBaseId?: string, sourceRef?: string}} [opts]
     */
    async ingestCode(evidence, opts = {}) {
      const service = await ready
      const base = service.resolveBase(opts.knowledgeBaseId)
      const material = codeMaterial(evidence, { knowledgeBaseId: base.id, sourceRef: opts.sourceRef })
      return service.captureAll([material])
    },
    /**
     * 投递文档证据为粗加工原料。
     * @param {object} evidence kind=doc.artifact
     * @param {{knowledgeBaseId?: string, sourceRef?: string}} [opts]
     */
    async ingestDoc(evidence, opts = {}) {
      const service = await ready
      const base = service.resolveBase(opts.knowledgeBaseId)
      const material = docMaterial(evidence, { knowledgeBaseId: base.id, sourceRef: opts.sourceRef })
      return service.captureAll([material])
    },
    promote: async (slug, knowledgeBaseId) => (await ready).promote(slug, knowledgeBaseId),
    revert: async (slug, version, knowledgeBaseId) => (await ready).revert(slug, version, knowledgeBaseId),
    resolveProposal: async (id, status) => (await ready).resolveProposal(id, status),
    /**
     * 编译该知识库中已有编译器的原料。没有编译器的来源保持 captured。
     */
    async compile(knowledgeBaseId, hooks = {}) {
      const service = await ready
      const base = service.resolveBase(knowledgeBaseId)
      return service.compile({ knowledgeBaseId: base.id, signal: hooks.signal, onItem: hooks.onItem })
    },
    resolveBase: async (knowledgeBaseId) => (await ready).resolveBase(knowledgeBaseId),
    task: () => tasks.current(),
    pauseTask: () => tasks.pause(),
    resumeTask: () => tasks.resume(),
    cancelTask: () => tasks.cancel(),
    startCollect(datasourceId, opts = {}) {
      const id = Number(datasourceId)
      return tasks.start('collect', (task) => api.collect(id, {
        ...opts,
        signal: task.controller.signal,
        gate: () => task.gate(),
        onProgress: (progress) => {
          task.phase = progress.phase
          task.done = Number(progress.done) || 0
          task.total = Number(progress.total) || 0
          task.current = Number(progress.current) || 0
          task.message = progress.message
        },
      }), {
        datasourceId: Number.isInteger(id) && id > 0 ? id : undefined,
        knowledgeBaseId: opts.knowledgeBaseId,
      })
    },
    startCompile(knowledgeBaseId) {
      return tasks.start('compile', async (task) => {
        task.phase = 'compile'
        const result = await api.compile(knowledgeBaseId, {
          signal: task.controller.signal,
          onItem: async (material, index, total, meta) => {
            await task.gate()
            task.done = index
            task.total = total
            task.message = material.sourceRef
            task.materialId = material.id
            if (Array.isArray(meta?.runnableIds)) task.runnableIds = meta.runnableIds
          },
        })
        task.materialId = null
        task.message = ''
        task.runnableIds = null
        if (task.total) task.done = task.total
        return result
      }, { knowledgeBaseId })
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
      const listed = await datasource.list()
      const source = listed.find((item) => item.id === Number(datasourceId))
      const tables = collectTables(base, datasourceId, opts.tables, source?.scope?.tables)
      let produced
      try {
        produced = await datasource.collect(datasourceId, {
          tables,
          policy,
          signal: opts.signal,
          gate: opts.gate,
          onProgress: opts.onProgress,
        })
      } catch (err) {
        const cancelled = err?.code === 'cancelled'
        await service.bases.noteCollect(base.id, datasourceId, {
          state: cancelled ? 'cancelled' : 'failed',
          error: cancelled ? null : String(err?.message ?? err),
        })
        throw err
      }
      const stored = await api.captureAll(produced.materials.map((item) => ({ ...item, knowledgeBaseId: base.id })))
      await service.bases.noteCollect(base.id, datasourceId, { state: 'done', error: null })
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

  const activeBaseId = (svc, explicit) => explicit || svc.resolveBase().id
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
    description: '读取当前知识库的 wiki 大纲：每页一行，含 slug、标题、类型、状态与版本。',
    properties: {
      knowledgeBaseId: { type: 'string', description: '知识库 id。省略时使用当前选中的知识库，否则使用默认知识库' },
    },
    run: (svc, args) => svc.outline(activeBaseId(svc, args.knowledgeBaseId)),
  })
  tool({
    name: 'wiki_search',
    description: '在当前知识库中检索页面（标题与正文关键词）。草稿默认参与检索，结果中以 status 标明。',
    properties: {
      query: { type: 'string', description: '检索词，空白分隔' },
      limit: { type: 'number', description: '最多返回条数，默认 8' },
      includeDrafts: { type: 'boolean', description: '是否包含草稿，默认 true' },
      knowledgeBaseId: { type: 'string', description: '知识库 id。省略时使用当前选中的知识库，否则使用默认知识库' },
    },
    required: ['query'],
    run: (svc, args) => svc.search(args.query, {
      limit: args.limit ?? 8,
      includeDrafts: args.includeDrafts ?? true,
      knowledgeBaseId: activeBaseId(svc, args.knowledgeBaseId),
    }),
  })
  tool({
    name: 'wiki_resolve',
    description: '按知识对象检索：字段、业务说法、码值、关联、流程、口径、问法与领域。返回命中与邻接子图，供问数组约束。优先于整页 wiki_search。',
    properties: {
      query: { type: 'string', description: '检索词，空白分隔' },
      limit: { type: 'number', description: '最多返回条数，默认 8' },
      includeDrafts: { type: 'boolean', description: '是否包含草稿/提议口径，默认 true' },
      facets: {
        type: 'array',
        items: { type: 'string' },
        description: '限定分面：tech_name、biz_label、value、assoc、process、policy、case、domain',
      },
      knowledgeBaseId: { type: 'string', description: '知识库 id。省略时使用当前选中的知识库，否则使用默认知识库' },
    },
    required: ['query'],
    run: (svc, args) => svc.resolve(args.query, {
      limit: args.limit ?? 8,
      includeDrafts: args.includeDrafts ?? true,
      facets: args.facets,
      knowledgeBaseId: activeBaseId(svc, args.knowledgeBaseId),
    }),
  })
  tool({
    name: 'wiki_coverage',
    description: '读取当前知识库的覆盖清单：缺口、冲突与编译代数。',
    properties: {
      knowledgeBaseId: { type: 'string', description: '知识库 id。省略时使用当前选中的知识库，否则使用默认知识库' },
    },
    run: (svc, args) => svc.coverage(activeBaseId(svc, args.knowledgeBaseId)),
  })
  tool({
    name: 'wiki_read_page',
    description: '读取一个 wiki 页面：已发布正文与（若存在）草稿，附出链与版本。',
    properties: {
      slug: { type: 'string', description: '页面 slug，如 entity/ca_fee_order' },
      knowledgeBaseId: { type: 'string', description: '知识库 id。省略时使用当前选中的知识库，否则使用默认知识库' },
    },
    required: ['slug'],
    run: (svc, args) => {
      const p = svc.page(args.slug, activeBaseId(svc, args.knowledgeBaseId))
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
    description: '列出当前知识库已入库的原料（id、来源、状态与内容摘要）。',
    properties: {
      status: { type: 'string', description: 'captured、decided 或 failed，缺省全部' },
      limit: { type: 'number', description: '最多返回条数，默认 50' },
      knowledgeBaseId: { type: 'string', description: '知识库 id。省略时使用当前选中的知识库，否则使用默认知识库' },
    },
    run: async (svc, args) => {
      const knowledgeBaseId = activeBaseId(svc, args.knowledgeBaseId)
      const all = svc.materials.list().filter((item) => item.knowledgeBaseId === knowledgeBaseId)
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
      knowledgeBaseId: { type: 'string', description: '知识库 id。省略时使用当前选中的知识库，否则使用默认知识库' },
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
    description: '把某个知识库里已有编译器的 captured 原料编译成页面、检索投影或提议。db/code/doc/sql/conversation 按已注册编译器处理；绑定的 Domain Pack 在库编译时做弱对齐。没有编译器的来源保持 captured。',
    properties: {
      knowledgeBaseId: { type: 'string', description: '知识库 id。省略时使用当前选中的知识库，否则使用默认知识库' },
    },
    run: (_svc, args) => api.compile(args.knowledgeBaseId),
  })
  tool({
    name: 'wiki_set_packs',
    description: '为知识库绑定 Domain Pack（按 id 列表，空数组清除）。编译时按绑定顺序弱对齐列与概念；未知 pack 立即失败。',
    properties: {
      knowledgeBaseId: { type: 'string', description: '知识库 id。省略时使用当前选中的知识库' },
      packIds: { type: 'array', items: { type: 'string' }, description: 'Domain Pack id 列表，如 ["scf"]' },
    },
    required: ['packIds'],
    run: async (svc, args) => {
      const base = svc.resolveBase(args.knowledgeBaseId)
      return api.setPacks(base.id, args.packIds)
    },
  })
  tool({
    name: 'wiki_list_packs',
    description: '列出已注册的 Domain Pack（id、version、title）。',
    properties: {},
    run: () => api.listPacks(),
  })
  tool({
    name: 'wiki_ingest_code',
    description: '投递代码模块结构化证据（枚举/映射/流转/API）为粗加工原料，编译后写入检索投影，不强制写 Wiki 页。',
    properties: {
      knowledgeBaseId: { type: 'string', description: '知识库 id。省略时使用当前选中的知识库' },
      evidence: {
        type: 'object',
        description: 'code.module 证据：{kind:"code.module", module, path?, enums?, mappings?, flows?, apis?}',
      },
      sourceRef: { type: 'string', description: '来源引用，默认 code:<module>' },
    },
    required: ['evidence'],
    run: (_svc, args) => api.ingestCode(args.evidence, {
      knowledgeBaseId: args.knowledgeBaseId,
      sourceRef: args.sourceRef,
    }),
  })
  tool({
    name: 'wiki_ingest_doc',
    description: '投递文档结构化证据（术语/流程/规则/场景）为粗加工原料，编译后投影为概念/流程/口径候选。',
    properties: {
      knowledgeBaseId: { type: 'string', description: '知识库 id。省略时使用当前选中的知识库' },
      evidence: {
        type: 'object',
        description: 'doc.artifact 证据：{kind:"doc.artifact", title, docUri, subtype, definitions?, processes?, policies?, scenarios?}',
      },
      sourceRef: { type: 'string', description: '来源引用，默认 doc:<docUri>' },
    },
    required: ['evidence'],
    run: (_svc, args) => api.ingestDoc(args.evidence, {
      knowledgeBaseId: args.knowledgeBaseId,
      sourceRef: args.sourceRef,
    }),
  })
  tool({
    name: 'wiki_graph_expand',
    description: '从中心页向外展开链接图谱（最多 3 层，节点上限 80）。',
    properties: {
      center: { type: 'string', description: '中心页 slug' },
      depth: { type: 'number', description: '展开层数，默认 1' },
      knowledgeBaseId: { type: 'string', description: '知识库 id。省略时使用当前选中的知识库，否则使用默认知识库' },
    },
    required: ['center'],
    run: (svc, args) => svc.expand(args.center, { depth: args.depth ?? 1, knowledgeBaseId: activeBaseId(svc, args.knowledgeBaseId) }),
  })

  const commands = typeof ctx.get === 'function' ? ctx.get('commands') : undefined
  if (commands?.register) {
    ctx.effect(() => commands.register({
      name: 'wiki',
      description: 'Wiki 面板操作。参数是 JSON：{op, slug?, id?, status?, datasourceId?, version?, tables?}',
      recordInput: false,
      recordResult: false,
      recordLifecycle: false,
      listed: false,
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
