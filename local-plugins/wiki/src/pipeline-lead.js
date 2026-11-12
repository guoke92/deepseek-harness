/**
 * 面板采集/编译：启动对等 lead agent Session，进度经 wiki_pipeline_report 回写任务条。
 * 宿主已跑完 L0/技术投影；lead 仅深挖或印证，工具面经 restrict 收窄。
 */
import { randomUUID } from 'node:crypto'

export const PRESET_COLLECT = 'wiki-collect'
export const PRESET_COMPILE = 'wiki-compile'

/** 面板 lead 可见的全局工具（与预设挂载的 subagent 工具求交）。 */
export const PIPELINE_LEAD_TOOL_ALLOW = Object.freeze([
  'wiki_pipeline_report', 'wiki_pipeline_finish',
  'wiki_list_pipeline_materials', 'wiki_get_material',
  'wiki_evidence_brief', 'wiki_extract_commit', 'wiki_extract_seal',
  'wiki_corroborate_apply', 'wiki_note_no_model', 'wiki_coverage',
  'wiki_list_materials', 'wiki_outline', 'wiki_search',
  'subagent', 'send_message', 'interrupt_agent', 'list_agents', 'wait_agent',
])

/** @type {{task: object, finish: (result: object) => void, fail: (err: unknown) => void}|null} */
let activeBinding = null

/**
 * @returns {{task: object, finish: Function, fail: Function}|null}
 */
export function currentPipelineBinding() {
  return activeBinding
}

/**
 * @param {object|null} binding
 */
export function setPipelineBinding(binding) {
  activeBinding = binding
}

/**
 * 收窄 lead 继承的全局工具；预设作用域内注册的工具（如 subagent）不受 allow 名单限制。
 * @param {object} agentCtx
 * @param {object} [agent]
 */
export function restrictPipelineLeadTools(agentCtx, agent) {
  const tools = agentCtx?.tools
  if (typeof tools?.restrict !== 'function') return
  let allow = [...PIPELINE_LEAD_TOOL_ALLOW]
  if (typeof tools.schemas === 'function' && agent) {
    const visible = new Set((tools.schemas(agent) ?? []).map((item) => item.name))
    allow = allow.filter((name) => visible.has(name))
  }
  while (allow.length) {
    try {
      tools.restrict({ allow })
      return
    } catch (err) {
      const message = String(err?.message ?? err)
      if (!message.includes('unknown global tool')) throw err
      const named = [...message.matchAll(/"([^"]+)"/g)].map((match) => match[1])
      const next = allow.filter((name) => !named.includes(name))
      if (next.length === allow.length) throw err
      allow = next
    }
  }
}

/**
 * @param {object} ctx Cordis
 * @param {{
 *   kind: 'collect'|'compile',
 *   presetId: string,
 *   prompt: string,
 *   task: object,
 *   knowledgeBaseId?: string,
 * }} opts
 * @returns {Promise<object>}
 */
export async function runPipelineLead(ctx, opts) {
  const agents = typeof ctx.get === 'function' ? ctx.get('agents') : undefined
  const agentPresets = typeof ctx.get === 'function' ? ctx.get('agentPresets') : undefined
  const defaults = typeof ctx.get === 'function' ? ctx.get('agentDefaultModel') : undefined
  if (!agents?.create || !agentPresets?.resolve || !agentPresets?.mount) {
    throw new Error('pipeline lead requires agents and agentPresets')
  }
  const selection = defaults?.currentSelection?.()
  if (!selection?.provider || !selection?.model) {
    throw new Error('pipeline lead requires agentDefaultModel selection')
  }

  const preset = await agentPresets.resolve(opts.presetId)
  const presetScope = typeof agentPresets.acquireScope === 'function'
    ? await agentPresets.acquireScope(preset.id)
    : null

  let settle
  let settled = false
  const finished = new Promise((resolve, reject) => {
    settle = { resolve, reject }
  })

  const binding = {
    task: opts.task,
    finish(result) {
      if (settled || opts.task.status === 'cancelled') return
      settled = true
      settle.resolve(result ?? { ok: true, status: 'done' })
    },
    fail(err) {
      if (settled) return
      settled = true
      settle.reject(err instanceof Error ? err : new Error(String(err)))
    },
  }
  setPipelineBinding(binding)

  const sessionId = `wiki-${opts.kind}-${randomUUID()}`
  let handle
  try {
    handle = await agents.create({
      sessionId,
      signal: opts.task.controller.signal,
      meta: {
        agentPreset: preset.id,
        ...(opts.knowledgeBaseId ? { wikiKnowledgeBaseId: opts.knowledgeBaseId } : {}),
      },
      agentOptions: {
        provider: selection.provider,
        model: selection.model,
        ...(selection.reasoningEffort ? { reasoningEffort: selection.reasoningEffort } : {}),
      },
      setup: async (agentCtx, agent) => {
        await agentPresets.mount(agentCtx, preset.id)
        restrictPipelineLeadTools(agentCtx, agent)
      },
    })
  } catch (err) {
    setPipelineBinding(null)
    if (presetScope && typeof presetScope[Symbol.asyncDispose] === 'function') {
      await presetScope[Symbol.asyncDispose]()
    } else if (presetScope && typeof presetScope.dispose === 'function') {
      await presetScope.dispose()
    }
    throw err
  }

  opts.task.sessionId = sessionId
  opts.task.phase = opts.kind
  opts.task.message = `lead ${preset.id}`

  const onAbort = () => {
    try {
      handle.agent.cancel?.('wiki-pipeline-cancelled')
    } catch {
      /* cancel best-effort */
    }
  }
  opts.task.controller.signal.addEventListener('abort', onAbort, { once: true })

  try {
    handle.agent.followup({
      content: [{ type: 'text', text: opts.prompt }],
      source: { kind: 'user' },
    })
    const idle = typeof handle.agent.whenIdle === 'function'
      ? handle.agent.whenIdle()
      : Promise.resolve()
    const result = await Promise.race([
      finished,
      idle.then(() => {
        if (settled) return finished
        if (opts.task.status === 'cancelled') {
          const err = new Error('cancelled')
          err.code = 'cancelled'
          throw err
        }
        settled = true
        const err = new Error('pipeline lead idle without wiki_pipeline_finish')
        err.code = 'lead_idle_without_finish'
        throw err
      }),
    ])
    return { ...result, sessionId }
  } finally {
    opts.task.controller.signal.removeEventListener('abort', onAbort)
    setPipelineBinding(null)
    try {
      await handle.dispose?.()
    } catch {
      /* dispose best-effort */
    }
    if (presetScope && typeof presetScope[Symbol.asyncDispose] === 'function') {
      await presetScope[Symbol.asyncDispose]()
    } else if (presetScope && typeof presetScope.dispose === 'function') {
      await presetScope.dispose()
    }
  }
}

/**
 * L0 已由宿主完成；lead 只深挖。
 * @param {{knowledgeBaseId: string, datasourceId: number, materialIds?: string[]}} args
 */
export function buildCollectPrompt(args) {
  const ids = args.materialIds?.length ? args.materialIds.join(',') : '（wiki_list_pipeline_materials）'
  return [
    '你是知识库采集 lead（preset wiki-collect）。宿主已完成 L0 采集与规则 extract 脚手架。',
    '完成深挖后必须调用 wiki_pipeline_finish。',
    `knowledgeBaseId=${args.knowledgeBaseId}`,
    `datasourceId=${args.datasourceId}`,
    `materialIds=${ids}`,
    '',
    '强制步骤：',
    '1. wiki_pipeline_report 报告 phase=extract',
    '2. wiki_list_pipeline_materials 盘点原料（含脚手架 extractBundle）',
    '3. 对每个 materialId：wiki_evidence_brief → 多轮 wiki_extract_commit → wiki_extract_seal',
    '4. 可委派 subagent 按表并行；子任务完成后你汇总',
    '5. 无把握时 seal completeness.complete=false 并说明 gaps',
    '6. 全程 wiki_pipeline_report；最后 wiki_pipeline_finish(status=done|done_partial)',
    '禁止调用 wiki_collect_l0 / wiki_collect；禁止改写 L0 断言；禁止输出 Wiki 页面 body。',
  ].join('\n')
}

/**
 * 技术投影已由宿主完成；lead 只印证。
 * @param {{knowledgeBaseId: string}} args
 */
export function buildCompilePrompt(args) {
  return [
    '你是知识库编译 lead（preset wiki-compile）。宿主已完成规则页与技术投影。',
    '完成印证后必须调用 wiki_pipeline_finish。',
    `knowledgeBaseId=${args.knowledgeBaseId}`,
    '',
    '强制步骤：',
    '1. wiki_pipeline_report 报告 phase=corroborate',
    '2. wiki_list_pipeline_materials 查看 extractBundle；缺封印时可委派补挖（wiki_extract_*），不要重跑 L0',
    '3. 基于多源 bundle 产出 CompileJudgement，经 wiki_corroborate_apply 写入',
    '4. 无锚点不得把 caliber 设为 accepted；冲突用 flag_coverage',
    '5. 无法印证时 wiki_note_no_model，并以 done_partial finish',
    '6. 全程 wiki_pipeline_report；最后 wiki_pipeline_finish',
    '禁止调用 wiki_project_technical / wiki_compile；禁止把 Markdown 页面 Decision 当编译主产物。',
  ].join('\n')
}

/**
 * 宿主确定性段已完成、lead 不可用或失败时的结果。
 * @param {'collect'|'compile'} kind
 * @param {object} payload
 * @param {string} [reason]
 */
export function buildDegradedResult(kind, payload, reason = 'no_pipeline_lead') {
  return {
    ok: true,
    status: 'done_partial',
    reason,
    degraded: true,
    leadFailed: reason !== 'no_pipeline_lead',
    kind,
    ...payload,
  }
}
