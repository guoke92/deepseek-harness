/**
 * @local/wiki Harness 入口：宿主服务 `wiki`（storage domain `wiki`）与模型工具。
 * 面板采集/编译：宿主先跑 L0（含规则 extract 脚手架）或技术投影，再可选 lead 深挖/印证。
 * Lead 工具面经 restrict 收窄。模型写页面的入口仍是 wiki_apply_decision。
 */
import { collectTables, createWikiService } from './service.js'
import { wikiDomainSpec } from './domain.js'
import { defaultPolicy, validateDecision } from '@local/contracts'
import { dispatchWiki } from './panel.js'
import { createTaskRunner } from './tasks.js'
import { codeMaterial, docMaterial } from './ingest.js'
import {
  PRESET_COLLECT, PRESET_COMPILE, buildCollectPrompt, buildCompilePrompt,
  buildDegradedResult, currentPipelineBinding, runPipelineLead,
} from './pipeline-lead.js'

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
     * 确定性技术投影。业务印证由 wiki-compile lead / wiki_corroborate_apply 完成。
     */
    async compile(knowledgeBaseId, hooks = {}) {
      const service = await ready
      const base = service.resolveBase(knowledgeBaseId)
      return service.compile({
        knowledgeBaseId: base.id,
        signal: hooks.signal,
      })
    },
    resolveBase: async (knowledgeBaseId) => (await ready).resolveBase(knowledgeBaseId),
    task: () => tasks.current(),
    pauseTask: () => tasks.pause(),
    resumeTask: () => tasks.resume(),
    cancelTask: () => tasks.cancel(),
    startCollect(datasourceId, opts = {}) {
      const id = Number(datasourceId)
      return tasks.start('collect', async (task) => {
        const service = await ready
        const base = service.resolveBase(opts.knowledgeBaseId)
        task.phase = 'l0'
        task.message = 'L0 collect'
        const l0 = await api.collectL0(id, {
          ...opts,
          knowledgeBaseId: base.id,
          signal: task.controller.signal,
          gate: () => task.gate(),
          onProgress: (progress) => {
            task.phase = progress.phase
            task.done = Number(progress.done) || 0
            task.total = Number(progress.total) || 0
            task.current = Number(progress.current) || 0
            task.message = progress.message
          },
        })
        const materialIds = Array.isArray(l0.ids) ? l0.ids : []
        task.phase = 'extract'
        task.message = 'rule extract scaffold'
        const scaffold = await service.scaffoldExtract(materialIds)
        try {
          const lead = await runPipelineLead(ctx, {
            kind: 'collect',
            presetId: PRESET_COLLECT,
            knowledgeBaseId: base.id,
            task,
            prompt: buildCollectPrompt({
              knowledgeBaseId: base.id,
              datasourceId: id,
              materialIds,
            }),
          })
          return { ...lead, ...l0, scaffold }
        } catch (err) {
          if (err?.code === 'cancelled') throw err
          const reason = String(err?.message ?? err)
          ctx.logger?.warn?.(`wiki-collect lead unavailable: ${reason}; keeping L0 + scaffold`)
          task.message = reason
          return buildDegradedResult('collect', { ...l0, scaffold }, reason)
        }
      }, {
        datasourceId: Number.isInteger(id) && id > 0 ? id : undefined,
        knowledgeBaseId: opts.knowledgeBaseId,
      })
    },
    startCompile(knowledgeBaseId) {
      return tasks.start('compile', async (task) => {
        const service = await ready
        const base = service.resolveBase(knowledgeBaseId)
        task.phase = 'project'
        task.message = 'technical projection'
        const projected = await service.projectTechnical({
          knowledgeBaseId: base.id,
          signal: task.controller.signal,
        })
        try {
          const lead = await runPipelineLead(ctx, {
            kind: 'compile',
            presetId: PRESET_COMPILE,
            knowledgeBaseId: base.id,
            task,
            prompt: buildCompilePrompt({ knowledgeBaseId: base.id }),
          })
          return { ...lead, ...projected }
        } catch (err) {
          if (err?.code === 'cancelled') throw err
          const reason = String(err?.message ?? err)
          ctx.logger?.warn?.(`wiki-compile lead unavailable: ${reason}; keeping technical projection`)
          task.message = reason
          await service.noteNoModel(base.id, `pipeline lead unavailable; technical projection only (${reason})`)
          return buildDegradedResult('compile', projected, reason)
        }
      }, { knowledgeBaseId })
    },
    /**
     * L0 确定性采集（无深挖）。供 lead 工具与无 agents 降级路径使用。
     * @param {number} datasourceId
     * @param {{tables?: string[]|null, profileSampleRows?: number, knowledgeBaseId?: string}} opts
     */
    async collectL0(datasourceId, opts = {}) {
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
    /** @deprecated 使用 collectL0；保留别名以免旧调用方立刻炸掉 */
    collect(datasourceId, opts = {}) {
      return api.collectL0(datasourceId, opts)
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
    name: 'wiki_pipeline_report',
    description: '向面板任务条报告采集/编译 lead 进度（phase、done、total、message）。',
    properties: {
      phase: { type: 'string', description: 'l0|extract|project|corroborate|coverage|done|done_partial 等' },
      done: { type: 'number' },
      total: { type: 'number' },
      current: { type: 'number' },
      message: { type: 'string' },
      materialId: { type: 'string' },
    },
    required: ['phase'],
    run: async (_svc, args) => {
      const binding = currentPipelineBinding()
      if (!binding?.task) return { ok: false, reason: 'no active pipeline task' }
      const task = binding.task
      task.phase = String(args.phase)
      if (args.done != null) task.done = Number(args.done) || 0
      if (args.total != null) task.total = Number(args.total) || 0
      if (args.current != null) task.current = Number(args.current) || 0
      if (args.message != null) task.message = String(args.message)
      if (args.materialId) task.materialId = String(args.materialId)
      await task.gate?.()
      return { ok: true, task: tasks.current() }
    },
  })
  tool({
    name: 'wiki_pipeline_finish',
    description: '结束当前面板采集/编译 lead 任务并提交结果。status 为 done 或 done_partial。',
    properties: {
      status: { type: 'string', description: 'done|done_partial' },
      result: { type: 'object', description: '可选结果摘要' },
      reason: { type: 'string' },
    },
    required: ['status'],
    run: async (_svc, args) => {
      const binding = currentPipelineBinding()
      if (!binding) return { ok: false, reason: 'no active pipeline task' }
      const payload = {
        ok: true,
        status: args.status === 'done' ? 'done' : 'done_partial',
        reason: args.reason,
        ...(args.result && typeof args.result === 'object' ? args.result : {}),
      }
      binding.finish(payload)
      return payload
    },
  })
  tool({
    name: 'wiki_collect_l0',
    description: '确定性 L0 采集：结构/画像断言入库。模型不得改写返回的断言；深挖用 extract 工具。',
    properties: {
      knowledgeBaseId: { type: 'string' },
      datasourceId: { type: 'number' },
      tables: { type: 'array', items: { type: 'string' } },
      profileSampleRows: { type: 'number' },
    },
    required: ['datasourceId'],
    run: async (_svc, args) => api.collectL0(args.datasourceId, {
      knowledgeBaseId: args.knowledgeBaseId,
      tables: args.tables ?? null,
      profileSampleRows: args.profileSampleRows,
      signal: currentPipelineBinding()?.task?.controller?.signal,
    }),
  })
  tool({
    name: 'wiki_list_pipeline_materials',
    description: '列出知识库原料及 extractBundle 摘要，供采集/编译 lead 盘点。',
    properties: {
      knowledgeBaseId: { type: 'string' },
      status: { type: 'string', description: '可选过滤 captured|decided|failed' },
    },
    run: async (svc, args) => {
      const knowledgeBaseId = activeBaseId(svc, args.knowledgeBaseId)
      return svc.materials.list()
        .filter((item) => item.knowledgeBaseId === knowledgeBaseId)
        .filter((item) => !args.status || item.status === args.status)
        .map((item) => ({
          id: item.id,
          sourceRef: item.sourceRef,
          sourceType: item.sourceType,
          status: item.status,
          sealed: Boolean(item.extractBundle?.sealed),
          nodes: item.extractBundle?.nodes?.length ?? 0,
          links: item.extractBundle?.links?.length ?? 0,
          completeness: item.extractBundle?.completeness ?? null,
        }))
    },
  })
  tool({
    name: 'wiki_evidence_brief',
    description: '读取原料证据简报（白名单字段），作为深挖输入。',
    properties: { materialId: { type: 'string' } },
    required: ['materialId'],
    run: (svc, args) => svc.evidenceBrief(args.materialId),
  })
  tool({
    name: 'wiki_extract_commit',
    description: '提交深挖增量节点/链接（契约校验）。可附 triage、completeness、roundIndex。',
    properties: {
      materialId: { type: 'string' },
      nodes: { type: 'array', items: { type: 'object' } },
      links: { type: 'array', items: { type: 'object' } },
      triage: { type: 'object' },
      completeness: { type: 'object' },
      roundIndex: { type: 'number' },
    },
    required: ['materialId'],
    run: (svc, args) => svc.commitExtract(args.materialId, {
      nodes: args.nodes,
      links: args.links,
      triage: args.triage,
      completeness: args.completeness,
      roundIndex: args.roundIndex,
    }),
  })
  tool({
    name: 'wiki_extract_seal',
    description: '封印 extractBundle。省略 completeness 时按 no_model 降级封印。',
    properties: {
      materialId: { type: 'string' },
      completeness: { type: 'object' },
    },
    required: ['materialId'],
    run: (svc, args) => svc.sealExtract(args.materialId, args.completeness ?? null),
  })
  tool({
    name: 'wiki_project_technical',
    description: '对 captured/failed 原料做规则页与技术对象投影（确定性，不跑模型印证）。',
    properties: {
      knowledgeBaseId: { type: 'string' },
      materialId: { type: 'string', description: '可选，只投影一条' },
    },
    run: async (svc, args) => svc.projectTechnical({
      knowledgeBaseId: activeBaseId(svc, args.knowledgeBaseId),
      materialId: args.materialId,
      signal: currentPipelineBinding()?.task?.controller?.signal,
    }),
  })
  tool({
    name: 'wiki_corroborate_apply',
    description: '应用 CompileJudgement 数组（upsert/merge/ground/flag 等）；无锚点不得 accepted。',
    properties: {
      knowledgeBaseId: { type: 'string' },
      judgements: { type: 'array', items: { type: 'object' } },
    },
    required: ['judgements'],
    run: (svc, args) => svc.applyJudgements(activeBaseId(svc, args.knowledgeBaseId), args.judgements),
  })
  tool({
    name: 'wiki_note_no_model',
    description: '在 coverage 记录无模型/无法印证缺口。',
    properties: {
      knowledgeBaseId: { type: 'string' },
      detail: { type: 'string' },
    },
    run: (svc, args) => svc.noteNoModel(activeBaseId(svc, args.knowledgeBaseId), args.detail),
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
    description: 'L0 采集别名（同 wiki_collect_l0）。面板采集由宿主先跑 L0；lead 只做深挖（wiki_extract_*）。',
    properties: {
      knowledgeBaseId: { type: 'string', description: '知识库 id。省略时使用当前选中的知识库，否则使用默认知识库' },
      datasourceId: { type: 'number', description: '已经绑定到该知识库的数据源 id' },
      profileSampleRows: { type: 'number', description: '每列采样行数，默认取策略值' },
      tables: { type: 'array', items: { type: 'string' }, description: '表范围，缺省全部' },
    },
    required: ['datasourceId'],
    run: (_svc, args) => api.collectL0(args.datasourceId, {
      knowledgeBaseId: args.knowledgeBaseId,
      tables: args.tables ?? null,
      profileSampleRows: args.profileSampleRows,
    }),
  })
  tool({
    name: 'wiki_compile',
    description: '技术投影别名（同 wiki_project_technical）。面板编译请走 wiki-compile lead；印证用 wiki_corroborate_apply。',
    properties: {
      knowledgeBaseId: { type: 'string', description: '知识库 id。省略时使用当前选中的知识库，否则使用默认知识库' },
    },
    run: (_svc, args) => api.compile(args.knowledgeBaseId),
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
