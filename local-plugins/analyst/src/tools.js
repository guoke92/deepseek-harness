/**
 * query 包工具规格（P3）：JSON schema、参数校验、调用分发。
 * 只定义与校验，不注册到 DSH。实际执行由调用方注入 handlers。
 *
 * 决策（已确认）：工具名不加前缀。
 * 决策（暂定，待确认）：
 *   - wiki_search 默认包含草稿，并带口径标签；
 *   - deposit_confirmed 不暴露给模型（exposeToModel=false），只能由界面层调用；
 *   - execute_readonly 强制先做字面值校验，存在 rewrite 时拒绝执行。
 */
import { checkLiterals } from './index.js'

const TABLE_FIELD = '^[A-Za-z_][\\w]*\\.[A-Za-z_][\\w]*$'
const PAGE_ID = '^[a-z_]+/[A-Za-z0-9_]+$'

const obj = (properties, required = []) => ({ type: 'object', properties, required, additionalProperties: false })

export const TOOL_SPECS = Object.freeze({
  wiki_search: {
    description: '检索 wiki 页面。每条结果带口径标签：已发布口径，或草稿口径（未审核）。',
    exposeToModel: true,
    parameters: obj({
      query: { type: 'string', minLength: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 50 },
      includeDrafts: { type: 'boolean' },
    }, ['query']),
  },
  wiki_get_page: {
    description: '读取单个 wiki 页面的 frontmatter 与正文。',
    exposeToModel: true,
    parameters: obj({ id: { type: 'string', pattern: PAGE_ID } }, ['id']),
  },
  wiki_outline: {
    description: '返回 wiki 大纲（索引摘要），按上限截断。',
    exposeToModel: true,
    parameters: obj({ maxChars: { type: 'integer', minimum: 1, maximum: 20000 } }),
  },
  schema_candidates: {
    description: '按问题给出候选表与字段（wiki 与结构信息结合）。',
    exposeToModel: true,
    parameters: obj({
      dsId: { type: 'integer', minimum: 1 },
      question: { type: 'string', minLength: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 20 },
    }, ['dsId', 'question']),
  },
  literal_check: {
    description: '校验 SQL 中的字符串字面值是否落在被引用的字段上。',
    exposeToModel: true,
    parameters: obj({
      dsId: { type: 'integer', minimum: 1 },
      sql: { type: 'string', minLength: 1 },
      referencedFields: { type: 'array', items: { type: 'string', pattern: TABLE_FIELD } },
    }, ['dsId', 'sql', 'referencedFields']),
  },
  execute_readonly: {
    description: '执行一条只读 SELECT。启用字面值校验时必须先提供 referencedFields，且校验不通过不执行。',
    exposeToModel: true,
    parameters: obj({
      dsId: { type: 'integer', minimum: 1 },
      sql: { type: 'string', minLength: 1 },
      referencedFields: { type: 'array', items: { type: 'string', pattern: TABLE_FIELD } },
      maxRows: { type: 'integer', minimum: 1, maximum: 1000 },
      translate: { type: 'boolean' },
    }, ['dsId', 'sql']),
  },
  summarize_result: {
    description: '对结果做概要（行数、数值范围、高频值）并给出图表建议。',
    exposeToModel: true,
    parameters: obj({
      rows: { type: 'array', items: { type: 'object' } },
      max_top: { type: 'integer', minimum: 1, maximum: 20 },
    }, ['rows']),
  },
  dict_translate: {
    description: '把字典码值翻译为中文标签。',
    exposeToModel: true,
    parameters: obj({
      field: { type: 'string', pattern: TABLE_FIELD },
      value: { type: 'string' },
    }, ['field']),
  },
  policy_get: {
    description: '返回当前生效的问数策略（全局与数据源覆盖合并后）。',
    exposeToModel: true,
    parameters: obj({ dsId: { type: 'integer', minimum: 1 } }),
  },
  deposit_confirmed: {
    description: '把用户确认的口径、SQL 或字典标签投递为 wiki 原料。仅由界面层触发。',
    exposeToModel: false,
    parameters: obj({ event: { type: 'object' } }, ['event']),
  },
})

/**
 * 按 JSON schema 子集校验：object/array/string/integer/boolean，
 * 支持 required、pattern、minLength、min/max、additionalProperties:false。
 */
export function validateAgainst(schema, value, path = 'args') {
  const errors = []
  const t = schema.type
  if (t === 'object') {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return [`${path} must be an object`]
    for (const r of schema.required ?? []) {
      if (value[r] === undefined) errors.push(`${path}.${r} is required`)
    }
    const props = schema.properties ?? {}
    if (schema.additionalProperties === false) {
      for (const k of Object.keys(value)) if (!(k in props)) errors.push(`${path}.${k} is not allowed`)
    }
    for (const [k, sub] of Object.entries(props)) {
      if (value[k] !== undefined) errors.push(...validateAgainst(sub, value[k], `${path}.${k}`))
    }
    return errors
  }
  if (t === 'array') {
    if (!Array.isArray(value)) return [`${path} must be an array`]
    if (schema.items) value.forEach((v, i) => errors.push(...validateAgainst(schema.items, v, `${path}[${i}]`)))
    return errors
  }
  if (t === 'string') {
    if (typeof value !== 'string') return [`${path} must be a string`]
    if (schema.minLength !== undefined && value.length < schema.minLength) errors.push(`${path} must be at least ${schema.minLength} characters`)
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) errors.push(`${path} has an invalid format`)
    return errors
  }
  if (t === 'integer') {
    if (!Number.isInteger(value)) return [`${path} must be an integer`]
    if (schema.minimum !== undefined && value < schema.minimum) errors.push(`${path} must be >= ${schema.minimum}`)
    if (schema.maximum !== undefined && value > schema.maximum) errors.push(`${path} must be <= ${schema.maximum}`)
    return errors
  }
  if (t === 'boolean') return typeof value === 'boolean' ? [] : [`${path} must be a boolean`]
  return errors
}

export function validateToolArgs(name, args) {
  const spec = TOOL_SPECS[name]
  if (!spec) return { ok: false, errors: [`unknown tool: ${name}`] }
  const errors = validateAgainst(spec.parameters, args ?? {})
  return { ok: errors.length === 0, errors }
}

/**
 * 把本地 schema 转为 DSH 可接受的子集：
 *   保留 type / properties / required / additionalProperties / items / enum / description；
 *   pattern / minLength / minimum / maximum 不再作为关键字出现，改写进 description。
 * 本地校验（validateToolArgs）仍使用完整 schema，安全约束不因此放宽。
 */
export function toDshSchema(schema) {
  if (!schema || typeof schema !== 'object') return schema
  const out = {}
  if (schema.type !== undefined) out.type = schema.type
  if (schema.enum !== undefined) out.enum = schema.enum
  if (schema.items !== undefined) out.items = toDshSchema(schema.items)
  if (schema.properties !== undefined) {
    out.properties = Object.fromEntries(
      Object.entries(schema.properties).map(([k, v]) => [k, toDshSchema(v)]),
    )
  }
  if (schema.required !== undefined) out.required = [...schema.required]
  if (schema.additionalProperties !== undefined) out.additionalProperties = schema.additionalProperties

  const notes = []
  if (schema.minLength !== undefined) notes.push(`长度至少 ${schema.minLength}`)
  if (schema.minimum !== undefined) notes.push(`不小于 ${schema.minimum}`)
  if (schema.maximum !== undefined) notes.push(`不大于 ${schema.maximum}`)
  if (schema.pattern !== undefined) notes.push(`格式需符合 ${schema.pattern}`)
  const description = [schema.description, notes.join('，')].filter(Boolean).join('；')
  if (description) out.description = description
  return out
}

/** 面向模型的工具列表（只含 exposeToModel=true），参数已转为 DSH 可接受的子集。 */
export function listToolsForModel() {
  return Object.entries(TOOL_SPECS)
    .filter(([, s]) => s.exposeToModel)
    .map(([name, s]) => ({ name, description: s.description, parameters: toDshSchema(s.parameters) }))
}

/**
 * 创建调用分发器。
 * @param {object} deps
 * @param {Record<string, Function>} deps.handlers 每个工具的执行函数（由调用方注入）；
 *        handlers.valueIndex(dsId) 返回该数据源的取值倒排索引（Map）。
 * @param {boolean} [deps.requireLiteralCheck=true] execute_readonly 前是否强制字面值校验（暂定 true）
 */
export function createToolRunner({ handlers, requireLiteralCheck = true }) {
  return {
    listForModel: listToolsForModel,
    async call(name, args, { caller = 'model' } = {}) {
      const spec = TOOL_SPECS[name]
      if (!spec) return { error: `unknown tool: ${name}` }
      if (caller === 'model' && !spec.exposeToModel) return { error: `tool not available to model: ${name}` }
      const v = validateToolArgs(name, args)
      if (!v.ok) return { error: 'invalid arguments', details: v.errors }
      const fn = handlers[name]
      if (!fn) return { error: `tool not wired: ${name}` }
      try {
        if (name === 'execute_readonly' && requireLiteralCheck) {
          if (!args.referencedFields) {
            return { error: 'referencedFields is required: literal check must run before execution' }
          }
          const index = handlers.valueIndex ? handlers.valueIndex(args.dsId) : new Map()
          const literals = checkLiterals({ sql: args.sql, referencedFields: args.referencedFields, index })
          if (literals.some((l) => l.status === 'rewrite')) {
            return { error: 'literal_rewrite_required', literals, hint: '字面值只出现在未引用的字段上，请改写 SQL 后重试' }
          }
          const out = await fn(args)
          return { ...out, literals }
        }
        return await fn(args)
      } catch (e) {
        return { error: String(e?.message ?? e) }
      }
    },
  }
}
