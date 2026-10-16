/**
 * 问数策略拼装（P3）。纯函数：输入策略与 wiki 大纲，输出系统提示词片段。
 *  - 策略按 contracts.mergePolicy 合并：全局默认 + 数据源覆盖（只写差异）
 *  - 提示词只由策略数值生成，不在此处写死业务术语
 *  - 大纲截断到 outlineMaxChars，按行截取，避免切断一行
 */
import { mergePolicy, validatePolicy, defaultPolicy } from '@local/contracts'

export function resolvePolicy(globalPolicy = defaultPolicy(), datasourceOverride = null) {
  if (!datasourceOverride) {
    const v = validatePolicy(globalPolicy)
    if (!v.ok) throw new Error(`invalid global policy: ${v.errors.join('; ')}`)
    return { policy: globalPolicy, errors: [] }
  }
  // 数据源覆盖在全局之上合并；合并结果必须整体合法
  const merged = mergePolicy(datasourceOverride, globalPolicy)
  return { policy: merged.policy, errors: merged.errors }
}

/** 截取大纲：按行累加，不超过上限；超出时追加省略标记。 */
export function clipOutline(outline, maxChars) {
  const text = String(outline ?? '').trim()
  if (text.length <= maxChars) return text
  const lines = text.split('\n')
  const out = []
  let used = 0
  for (const line of lines) {
    if (used + line.length + 1 > maxChars) break
    out.push(line)
    used += line.length + 1
  }
  return `${out.join('\n')}\n…（大纲已截断）`
}

/**
 * 生成系统提示词片段（只含策略驱动的约束，不含业务事实）。
 * @param {object} policy 已合并的完整策略
 * @param {{outline?: string, datasourceId?: number|null}} ctx
 */
export function buildQueryPrompt(policy, { outline = '', datasourceId = null } = {}) {
  const q = policy.query
  const lines = []
  lines.push('你是问数助手。回答前遵循以下约束：')

  if (q.preload.wikiOutline && outline) {
    lines.push('', '【知识大纲】', clipOutline(outline, q.preload.outlineMaxChars))
  }

  lines.push('', '【检索与口径】')
  lines.push('- 先用 wiki_search 与 wiki_read_page 检索页面；没有页面时改读 wiki_list_materials 与 wiki_get_material，并说明口径尚未编译。')
  lines.push('- 已发布口径可直接使用，草稿口径必须在回答中注明"草稿口径，未审核"。')
  if (!q.retrieval.includeDrafts) lines.push('- 当前策略不使用草稿口径，检索结果只来自已发布页面。')

  lines.push('', '【澄清】')
  if (q.clarify.requireWhen.length > 0) {
    lines.push(`- 遇到以下情况先追问，不得臆断：${q.clarify.requireWhen.join('；')}。`)
  } else {
    lines.push('- 当前策略未设置必须追问的情况；口径不明确时说明假设。')
  }
  lines.push(`- 每轮追问不超过 ${q.clarify.maxQuestions} 个问题。`)

  lines.push('', '【字面值】')
  lines.push('- 生成 SQL 后，校验字符串字面值是否落在被引用的字段上；若只落在未引用字段，改写 SQL 后再执行。')

  lines.push('', '【输出】')
  lines.push(`- 先给一句结论。`)
  if (q.output.tables) lines.push('- 结果以 Markdown 表格展示。')
  if (q.output.chart === 'auto') lines.push('- 适合对比或占比时，用 ```vega-lite 代码块（完整 JSON 规范）给出图表。')
  if (q.output.showCaliber) lines.push('- 注明口径（引用的 wiki 页面 id 与口径标签）。')
  if (q.output.showSql) lines.push('- 注明执行的 SQL。')
  lines.push(`- 金额单位：${q.output.moneyUnit}。`)
  if (datasourceId !== null && datasourceId !== undefined) lines.push(`- 本次查询的数据源 id：${datasourceId}。`)

  lines.push('', '【安全】')
  lines.push('- 只执行只读 SELECT，单条语句。')
  lines.push(`- 结果最多 ${q.safety.maxRows} 行。`)
  if (q.safety.forbiddenTables.length) lines.push(`- 禁止访问的表：${q.safety.forbiddenTables.join('、')}。`)
  if (q.safety.forbiddenColumns.length) lines.push(`- 禁止返回的字段：${q.safety.forbiddenColumns.join('、')}。`)
  lines.push('- 数据源密码不得出现在回答中。')

  return lines.join('\n')
}
