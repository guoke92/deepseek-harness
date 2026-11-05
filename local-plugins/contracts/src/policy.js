/**
 * 策略：全局默认 + 按数据源的差异覆盖（只写差异）。
 * 合并后必须整体合法。安全项（只读、行数、禁用表列）在 corpus 执行入口再次检查，策略不能绕过。
 */
import { finish, isInt, isObj, isStrArr, isUnit } from './common.js'

/** 全局默认策略（每次调用返回新对象）。 */
export function defaultPolicy() {
  return {
    query: {
      preload: { wikiOutline: true, outlineMaxChars: 2000 },
      clarify: { requireWhen: [], maxQuestions: 2 },
      output: { tables: true, chart: 'auto', showSql: true, moneyUnit: '元', showCaliber: true },
      safety: { readonly: true, maxRows: 200, forbiddenTables: [], forbiddenColumns: [] },
      retrieval: { includeDrafts: true },
    },
    wiki: {
      autoPublishThreshold: 0.85,
      draftThreshold: 0.5,
      dictDistinctMax: 32,
      highDefaultRatio: 0.05,
      minhashK: 128,
      profileSampleRows: 10000,
    },
    memory: {
      enabled: true,
      autoExtract: false,
      extractDelaySeconds: 90,
      minIntervalSeconds: 300,
      maxActiveItems: 200,
    },
  }
}

/** scope 只能是 'global' 或 'datasource:<正整数 id>'。 */
export function validatePolicyScope(scope) {
  if (scope === 'global') return finish([])
  const m = typeof scope === 'string' ? /^datasource:([1-9]\d*)$/.exec(scope) : null
  return finish(m ? [] : ["scope must be 'global' or 'datasource:<id>'"])
}


/** 校验一份完整（已合并）的策略。 */
export function validatePolicy(p) {
  if (!isObj(p)) return finish(['policy must be an object'])
  const e = []
  const q = isObj(p.query) ? p.query : {}
  const w = isObj(p.wiki) ? p.wiki : {}
  const m = isObj(p.memory) ? p.memory : {}
  if (!isObj(p.query)) e.push('query must be an object')
  if (!isObj(p.wiki)) e.push('wiki must be an object')
  if (!isObj(p.memory)) e.push('memory must be an object')

  const pre = isObj(q.preload) ? q.preload : {}
  const cl = isObj(q.clarify) ? q.clarify : {}
  const out = isObj(q.output) ? q.output : {}
  const sf = isObj(q.safety) ? q.safety : {}
  const rt = isObj(q.retrieval) ? q.retrieval : {}
  if (typeof pre.wikiOutline !== 'boolean') e.push('query.preload.wikiOutline must be boolean')
  if (!isInt(pre.outlineMaxChars, 1, 20000)) e.push('query.preload.outlineMaxChars must be 1..20000')
  if (!isStrArr(cl.requireWhen)) e.push('query.clarify.requireWhen must be string[]')
  if (!isInt(cl.maxQuestions, 0, 5)) e.push('query.clarify.maxQuestions must be 0..5')
  if (typeof out.tables !== 'boolean') e.push('query.output.tables must be boolean')
  if (out.chart !== 'auto' && out.chart !== 'off') e.push('query.output.chart must be auto or off')
  if (typeof out.showSql !== 'boolean') e.push('query.output.showSql must be boolean')
  if (typeof out.moneyUnit !== 'string' || out.moneyUnit.length === 0) e.push('query.output.moneyUnit must be a non-empty string')
  if (typeof out.showCaliber !== 'boolean') e.push('query.output.showCaliber must be boolean')
  if (sf.readonly !== true) e.push('query.safety.readonly must be true')
  if (!isInt(sf.maxRows, 1, 1000)) e.push('query.safety.maxRows must be 1..1000')
  if (!isStrArr(sf.forbiddenTables)) e.push('query.safety.forbiddenTables must be string[]')
  if (!isStrArr(sf.forbiddenColumns)) e.push('query.safety.forbiddenColumns must be string[]')
  if (typeof rt.includeDrafts !== 'boolean') e.push('query.retrieval.includeDrafts must be boolean')

  if (!isUnit(w.autoPublishThreshold)) e.push('wiki.autoPublishThreshold must be in [0, 1]')
  if (!isUnit(w.draftThreshold)) e.push('wiki.draftThreshold must be in [0, 1]')
  if (isUnit(w.draftThreshold) && isUnit(w.autoPublishThreshold) && w.draftThreshold > w.autoPublishThreshold) {
    e.push('wiki.draftThreshold cannot exceed wiki.autoPublishThreshold')
  }
  if (!isInt(w.dictDistinctMax, 1, 1000)) e.push('wiki.dictDistinctMax must be 1..1000')
  if (!isUnit(w.highDefaultRatio)) e.push('wiki.highDefaultRatio must be in [0, 1]')
  if (!isInt(w.minhashK, 8, 1024)) e.push('wiki.minhashK must be 8..1024')
  if (!isInt(w.profileSampleRows, 100, 1000000)) e.push('wiki.profileSampleRows must be 100..1000000')

  if (typeof m.enabled !== 'boolean') e.push('memory.enabled must be boolean')
  if (typeof m.autoExtract !== 'boolean') e.push('memory.autoExtract must be boolean')
  if (!isInt(m.extractDelaySeconds, 0, 3600)) e.push('memory.extractDelaySeconds must be 0..3600')
  if (!isInt(m.minIntervalSeconds, 0, 86400)) e.push('memory.minIntervalSeconds must be 0..86400')
  if (!isInt(m.maxActiveItems, 1, 10000)) e.push('memory.maxActiveItems must be 1..10000')
  return finish(e)
}

function walkOverride(src, dst, path, errors) {
  for (const key of Object.keys(src)) {
    const where = path ? `${path}.${key}` : key
    if (!Object.hasOwn(dst, key)) {
      errors.push(`unknown policy key: ${where}`)
      continue
    }
    const sv = src[key]
    const dv = dst[key]
    if (isObj(dv)) {
      if (!isObj(sv)) errors.push(`${where} must be an object`)
      else walkOverride(sv, dv, where, errors)
    } else if (Array.isArray(dv)) {
      if (!Array.isArray(sv)) errors.push(`${where} must be an array`)
      else dst[key] = sv
    } else if (typeof sv !== typeof dv) {
      errors.push(`${where} must be ${typeof dv}`)
    } else {
      dst[key] = sv
    }
  }
}

/**
 * 把覆盖项（只写差异）合并到基础策略上。
 * 未知键、类型不符、合并后不合法，均返回 ok=false 并给出原因；安全项只能保持只读。
 */
export function mergePolicy(override = {}, base = defaultPolicy()) {
  if (!isObj(override)) return { ok: false, errors: ['override must be an object'], policy: null }
  const out = structuredClone(base)
  const errors = []
  walkOverride(override, out, '', errors)
  const v = validatePolicy(out)
  return { ok: errors.length === 0 && v.ok, errors: [...errors, ...v.errors], policy: out }
}
