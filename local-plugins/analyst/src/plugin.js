/**
 * @local/analyst：问数插件。挂在「数据分析」预设里。
 * 读 wiki 原料做字面值校验，经 localDatasource.runReadonly 执行，安全项来自策略而不是写死的空列表。
 * 确认过的口径通过 localWiki.captureAll 回到原料。不拥有页面，也不保存数据源。
 */
import { defaultPolicy, mergePolicy } from '@local/contracts'
import { buildValueIndex, checkLiterals } from './index.js'
import { buildQueryPrompt } from './policy.js'
import { toRawMaterial } from './deposit.js'

export const name = 'analyst'
export const inject = ['tools', 'systemPrompt', 'localDatasource', 'localWiki']

export function apply(ctx) {
  let policy = defaultPolicy()
  let lastRun = null
  const safetyOf = () => policy.query.safety

  ctx.systemPrompt.section({
    name: 'analyst:policy',
    order: ctx.systemPrompt.getSectionOrder('DELIVERABLE_FILE_REFERENCES') + 2,
    text: () => buildQueryPrompt(policy, {}),
  })

  const api = {
    policy: () => policy,
    /** 只接受能通过 mergePolicy 的差异覆盖。只读不能被关掉。 */
    setOverride(override) {
      const merged = mergePolicy(override, defaultPolicy())
      if (!merged.ok) throw new Error(merged.errors.join('; '))
      policy = merged.policy
      return policy
    },
    /**
     * 先做字面值校验，rewrite 时不执行。unmatched 不阻断（索引只覆盖 topK）。
     * @param {{datasourceId: number, sql: string, referencedFields: string[], maxRows?: number}} args
     */
    async execute(args) {
      if (!Array.isArray(args.referencedFields)) throw new Error('referencedFields is required before execution')
      const materials = await ctx.localWiki.listMaterials()
      const profiles = []
      for (const item of materials) {
        const match = /([^/]+)\.([^./]+)$/.exec(String(item.sourceRef ?? ''))
        if (!match) continue
        const table = match[1].includes('.') ? match[1].split('.').pop() : match[1]
        profiles.push({ table, column: match[2], topK: item.evidence?.topK ?? [] })
      }
      const literals = checkLiterals({
        sql: args.sql,
        referencedFields: args.referencedFields,
        index: buildValueIndex(profiles),
      })
      const rewrite = literals.filter((item) => item.status === 'rewrite')
      if (rewrite.length > 0) {
        return { ok: false, executed: false, literals, reason: 'literal matches an unreferenced field' }
      }
      const safety = safetyOf()
      const result = await ctx.localDatasource.runReadonly(args.datasourceId, args.sql, {
        maxRows: args.maxRows ?? safety.maxRows,
        forbiddenTables: safety.forbiddenTables,
        forbiddenColumns: safety.forbiddenColumns,
      })
      lastRun = {
        datasourceId: args.datasourceId,
        sql: args.sql,
        rowCount: Array.isArray(result?.rows) ? result.rows.length : 0,
      }
      return { ok: true, executed: true, literals, ...result }
    },
    /** 把用户确认的口径、SQL 或字典标签追加为 wiki 原料。不暴露给模型。 */
    async deposit(event, meta = {}) {
      const built = toRawMaterial(event, meta)
      if (!built.ok) return built
      const stored = await ctx.localWiki.captureAll([built.material])
      return { ok: true, id: stored.ids[0], created: stored.captured === 1 }
    },
  }
  // 预设行 cordis.patch.yml 把 localAnalyst 标成 isolate，避免服务漏进宿主根域。
  ctx.effect(() => ctx.provide('localAnalyst', api), 'analyst.provide')

  if (typeof ctx.on === 'function') {
    ctx.on('agent/pre-step', async (payload, next) => {
      const decision = await next()
      try {
        for (const message of payload?.messages ?? []) {
          const text = textOf(message).trim()
          const confirmed = /^(?:确认口径|确认这个口径)[:：\s]*(.*)$/u.exec(text)
          if (!confirmed) continue
          if (confirmed[1]) {
            await api.deposit({ kind: 'caliber_confirmed', userConfirmed: true, text: confirmed[1] })
          } else if (lastRun) {
            await api.deposit({
              kind: 'sql_confirmed', executed: true, sql: lastRun.sql, rowCount: lastRun.rowCount,
            }, { datasourceId: lastRun.datasourceId })
          }
        }
      } catch (err) {
        ctx.logger?.error?.(`analyst: deposit failed: ${String(err?.message ?? err)}`)
      }
      return decision
    })
  }

  ctx.tools.register({
    name: 'analyst_execute_readonly',
    description: '在数据源上执行一条只读 SELECT。必须给出 referencedFields（table.column）。字面值若只落在未引用字段上则拒绝执行。禁用表和列来自问数策略。',
    parameters: {
      type: 'object',
      properties: {
        datasourceId: { type: 'number', description: '数据源 id' },
        sql: { type: 'string', description: '单条 SELECT 或 WITH ... SELECT' },
        referencedFields: { type: 'array', items: { type: 'string' }, description: 'SQL 引用的字段，形如 table.column' },
        maxRows: { type: 'number', description: '最大返回行数，默认取策略值，上限 1000' },
      },
      required: ['datasourceId', 'sql', 'referencedFields'],
      additionalProperties: false,
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: String(value) }],
    },
    execute: async (args) => {
      try {
        return JSON.stringify(await api.execute(args ?? {}), null, 2)
      } catch (err) {
        return JSON.stringify({ error: String(err?.message ?? err) })
      }
    },
  })

  return api
}

function textOf(message) {
  const content = message?.content
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content.filter((block) => block?.type === 'text' && typeof block.text === 'string').map((block) => block.text).join('\n')
}
