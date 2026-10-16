/**
 * 问数查询侧（P3）的纯函数部分：
 *  - searchPages：按关键词检索 wiki 页面，每条结果带口径标签（已发布 / 草稿），草稿可选择排除
 *  - buildValueIndex：由列剖析的 topK 取值建立 取值 → 字段 的倒排索引
 *  - checkLiterals：检查 SQL 中的字符串字面值是否落在被引用的字段上（借鉴论文的模式链接做法）
 * 注意：值索引只覆盖每列的 topK（默认 10）取值，因此"未找到"不等于"不存在"，结果中会如实标注。
 */

export const CALIBER_LABEL = Object.freeze({
  published: '已发布口径',
  draft: '草稿口径（未审核，仅供参考）',
})

const norm = (v) => String(v ?? '').trim()

/** 词元：英文/数字词 + 中文二元组。 */
export function tokenize(text) {
  const s = String(text ?? '').toLowerCase()
  const words = s.match(/[a-z0-9_]+/g) ?? []
  const cjk = s.match(/[\u4e00-\u9fff]+/g) ?? []
  const grams = []
  for (const run of cjk) {
    if (run.length === 1) grams.push(run)
    for (let i = 0; i < run.length - 1; i++) grams.push(run.slice(i, i + 2))
  }
  return [...new Set([...words, ...grams])].filter(Boolean)
}

function snippetOf(body, terms) {
  const lower = body.toLowerCase()
  let at = -1
  for (const t of terms) {
    const i = lower.indexOf(t)
    if (i >= 0 && (at < 0 || i < at)) at = i
  }
  const start = Math.max(0, (at < 0 ? 0 : at) - 40)
  return body.slice(start, start + 160).replace(/\s+/g, ' ').trim()
}

/**
 * @param {Array<{id:string,status:'published'|'draft',title:string,body:string}>} pages
 * @param {string} query
 * @param {{limit?:number, includeDrafts?:boolean}} opts
 */
export function searchPages(pages, query, { limit = 8, includeDrafts = true } = {}) {
  const terms = tokenize(query)
  if (terms.length === 0) return []
  const cap = Math.min(Math.max(Number(limit) || 8, 1), 50)
  const pool = pages.filter((p) => includeDrafts || p.status === 'published')
  const scored = []
  for (const p of pool) {
    const title = norm(p.title).toLowerCase()
    const body = String(p.body ?? '').toLowerCase()
    let score = 0
    for (const t of terms) {
      if (title.includes(t)) score += 4
      const hits = body.split(t).length - 1
      score += Math.min(hits, 5)
    }
    if (score > 0) scored.push({ p, score })
  }
  const rank = (s) => (s === 'published' ? 0 : 1)
  scored.sort((a, b) => (b.score - a.score) || (rank(a.p.status) - rank(b.p.status)) || a.p.id.localeCompare(b.p.id))
  return scored.slice(0, cap).map(({ p, score }) => ({
    id: p.id,
    status: p.status,
    caliber: CALIBER_LABEL[p.status] ?? CALIBER_LABEL.draft,
    title: p.title,
    score,
    snippet: snippetOf(String(p.body ?? ''), terms),
  }))
}

/**
 * 由列剖析（datasource buildProfile 的产出）建立 取值 → Set(table.column) 的倒排索引。
 * 只使用 topK，因此覆盖范围有限。
 */
export function buildValueIndex(profiles) {
  const idx = new Map()
  for (const p of profiles) {
    for (const x of p.topK ?? []) {
      const k = norm(x.value)
      if (!k) continue
      if (!idx.has(k)) idx.set(k, new Set())
      idx.get(k).add(`${p.table}.${p.column}`)
    }
  }
  return idx
}

/** 抽取 SQL 中的单引号字符串字面值（'' 为转义引号）。 */
export function extractLiterals(sql) {
  return [...String(sql ?? '').matchAll(/'((?:[^']|'')*)'/g)]
    .map((m) => m[1].replace(/''/g, "'"))
    .filter((v) => v.length > 0)
}

/**
 * 字面值校验。
 * @param {object} args
 * @param {string} args.sql 生成的 SQL
 * @param {string[]} args.referencedFields 该 SQL 引用的字段，形如 table.column
 * @param {Map<string, Set<string>>} args.index buildValueIndex 的结果
 * @returns {Array<{literal:string, status:'ok'|'rewrite'|'unmatched', fields:string[]}>}
 *   ok：字面值出现在某个被引用字段的已索引取值中；
 *   rewrite：字面值只出现在未被引用的字段中，应改写 SQL 使用这些字段；
 *   unmatched：已索引取值中找不到（不代表不存在，可能不在 topK 内）。
 */
export function checkLiterals({ sql, referencedFields, index }) {
  const refs = new Set(referencedFields ?? [])
  return extractLiterals(sql).map((literal) => {
    const fields = [...(index.get(norm(literal)) ?? [])]
    if (fields.length === 0) return { literal, status: 'unmatched', fields: [] }
    if (fields.some((f) => refs.has(f))) return { literal, status: 'ok', fields }
    return { literal, status: 'rewrite', fields }
  })
}
