/**
 * 数据库表文档。采集写入 evidence.kind = db.table，正文与 wiki 页共用这里的渲染。
 * 本模块不采样、不调用模型。
 */
import { SCHEMA_VERSION } from './common.js'
import { isSlug } from './slug.js'
import { validateDecision } from './decisions.js'

/**
 * 关联技术对象的稳定 id，与投影 hit / review.objectId 共用。
 * @param {string} knowledgeBaseId
 * @param {{fromTable: string, fromColumn: string, toTable: string, toColumn: string}} rel
 */
export function associationObjectId(knowledgeBaseId, rel) {
  return `tech_rel:${knowledgeBaseId}:${rel.fromTable}.${rel.fromColumn}->${rel.toTable}.${rel.toColumn}`
}

/**
 * 列注释主短语：取第一个全角/半角冒号前段，去掉括号尾注。
 * 空、或与列名相同（忽略大小写）时返回空串，调用方回退到列名。
 * @param {unknown} comment
 * @param {string} [columnName]
 */
export function primaryCommentPhrase(comment, columnName = '') {
  const raw = String(comment ?? '').trim()
  if (!raw) return ''
  let phrase = raw.split(/[：:]/)[0].trim()
  phrase = phrase.replace(/[（(].*$/, '').trim()
  if (!phrase) return ''
  if (columnName && phrase.toLowerCase() === String(columnName).toLowerCase()) return ''
  return phrase
}

export const DB_EVIDENCE_KIND = 'db.table'
/**
 * 规则技术投影置信度：等于宿主 autoPublishThreshold（0.85），仍自动发布，
 * 但低于原先 0.95，便于与模型印证 accepted 区分。
 */
export const DB_FACT_CONFIDENCE = 0.85

const ROLES = ['identifier', 'time', 'measure', 'enum', 'text', 'large', 'masked']
const ROLE_LABEL = {
  identifier: '标识',
  time: '时间',
  measure: '数值',
  enum: '枚举',
  text: '文本',
  large: '长文本',
  masked: '敏感',
}
const SAMPLE_LABEL = {
  'latest-by-primary-key': '主键倒序',
  'physical-prefix': '物理顺序前部',
}

/**
 * 表名或列名变成 slug 的一段。
 * @param {string} name
 */
export function dbSlugPart(name) {
  const slug = String(name ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
  return slug || 'item'
}

/**
 * 校验 db.table 证据。
 * @param {object} evidence
 * @returns {{ok: boolean, errors: string[]}}
 */
export function validateDbTableEvidence(evidence) {
  const errors = []
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) {
    return { ok: false, errors: ['evidence must be an object'] }
  }
  if (evidence.kind !== DB_EVIDENCE_KIND) errors.push(`evidence.kind must be ${DB_EVIDENCE_KIND}`)
  if (typeof evidence.table !== 'string' || evidence.table.length === 0) errors.push('evidence.table is required')
  if (typeof evidence.rowCount !== 'number' || !Number.isFinite(evidence.rowCount) || evidence.rowCount < 0) {
    errors.push('evidence.rowCount must be a non-negative number')
  }
  if (!Array.isArray(evidence.columns) || evidence.columns.length === 0) errors.push('evidence.columns must be a non-empty array')
  else {
    const names = new Set()
    for (const column of evidence.columns) {
      if (!column || typeof column.name !== 'string' || column.name.length === 0) {
        errors.push('each column needs a name')
        continue
      }
      if (names.has(column.name)) errors.push(`duplicate column ${column.name}`)
      names.add(column.name)
      if (typeof column.dataType !== 'string') errors.push(`column ${column.name} needs dataType`)
      if (!ROLES.includes(column.role)) errors.push(`column ${column.name} has an unknown role`)
      if (typeof column.dictionary !== 'boolean') errors.push(`column ${column.name} needs dictionary`)
      if (!column.domain || typeof column.domain !== 'object') errors.push(`column ${column.name} needs domain`)
    }
  }
  if (!Array.isArray(evidence.relations)) errors.push('evidence.relations must be an array')
  if (!Array.isArray(evidence.declaredForeignKeys)) errors.push('evidence.declaredForeignKeys must be an array')
  if (!Array.isArray(evidence.terms)) errors.push('evidence.terms must be an array')
  return { ok: errors.length === 0, errors }
}

/**
 * 正文是否仍包含每列、注释和行数。
 * @param {string} body
 * @param {object} evidence
 * @returns {string[]} 缺失项
 */
export function dbDocumentGaps(body, evidence) {
  const gaps = []
  const text = String(body ?? '')
  if (!text.split('\n').some((line) => line.trim() === `表总行数 ${evidence.rowCount}。`)) gaps.push('rowCount')
  for (const column of evidence.columns ?? []) {
    const row = text.split('\n').find((line) => line.startsWith(`| ${column.name} |`))
    if (!row) gaps.push(`column ${column.name}`)
    else if (column.comment && !row.includes(cell(column.comment))) gaps.push(`comment ${column.name}`)
    if (groundsQuery(column) && !text.split('\n').some((line) => line.trim() === `### ${column.name}`)) {
      gaps.push(`domain ${column.name}`)
    }
  }
  return gaps
}

/**
 * 表文档正文。原料 content 与实体页 body 都用它。
 * @param {object} evidence 已通过 validateDbTableEvidence 的证据
 * @returns {string}
 */
export function renderDbTable(evidence) {
  const slugs = pageSlugs(evidence)
  const title = String(evidence.comment || '').trim() || evidence.table
  const lines = [`# ${title}`, '']
  if (evidence.comment && evidence.comment !== evidence.table) {
    lines.push(`表名：${evidence.table}`, '')
  } else if (!evidence.comment) {
    /* title already the table name */
  }
  lines.push(`表总行数 ${evidence.rowCount}。`)
  const mode = SAMPLE_LABEL[evidence.sampleMode] ?? evidence.sampleMode
  const sampled = evidence.sampleRows ?? 0
  lines.push(mode ? `采样行数 ${sampled}，方式：${mode}` : `采样行数 ${sampled}`)
  lines.push('空值率、基数和区分度按采样行计算。')
  lines.push('', '## 字段', '', '| 列 | 类型 | 可空 | 默认 | 注释 | 空值率 | 基数 | 区分度 | 补充 |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- |')
  for (const column of evidence.columns) {
    lines.push(`| ${cell(column.name)} | ${cell(column.dataType)} | ${column.nullable ? '是' : '否'} | ${cell(column.defaultValue ?? '')} | ${cell(column.comment ?? '')} | ${nullRateCell(column, evidence)} | ${cardinalityCell(column)} | ${selectivityCell(column)} | ${cell(fieldExtra(column, slugs.dictionaries.get(column.name)))} |`)
  }
  if (evidence.primaryKey?.length) lines.push('', '## 主键', '', evidence.primaryKey.join('，'))
  if (evidence.indexes?.length) {
    lines.push('', '## 索引', '')
    for (const index of evidence.indexes) {
      lines.push(`- ${index.name}（${index.unique ? '唯一' : '非唯一'}）：${index.columns.join('，')}`)
    }
  }
  if (evidence.declaredForeignKeys?.length) {
    lines.push('', '## 声明的外键', '')
    for (const fk of evidence.declaredForeignKeys) {
      lines.push(`- ${fk.fromTable}.${fk.fromColumns.join('，')} → ${fk.toTable}.${fk.toColumns.join('，')}`)
    }
  }
  const grounded = evidence.columns.filter(groundsQuery)
  if (grounded.length) {
    lines.push('', '## 值域', '')
    for (const column of grounded) lines.push(`### ${column.name}`, '', domainText(column), '')
  }
  const accepted = (evidence.relations ?? []).filter((rel) => rel.verdict === 'accepted')
  if (accepted.length) {
    lines.push('## 推断关系', '')
    for (const rel of accepted) {
      const slug = slugs.relations.get(relationKey(rel))
      lines.push(`### ${relationPhrase(rel, evidence.table)}`, '', relationBasis(rel), '')
      if (slug) lines.push(`[[${slug}]]`, '')
    }
  }
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n'
}

/**
 * 字典页正文，保留取值和占比。
 * @param {object} evidence
 * @param {object} column
 * @returns {string}
 */
export function renderDictionary(evidence, column) {
  const title = primaryCommentPhrase(column.comment, column.name) || column.name
  const lines = [`# ${title}`, '', `来自 ${evidence.table}.${column.name}。`]
  if (column.comment) lines.push(`注释：${column.comment}`)
  lines.push('', '| 取值 | 次数 | 占比 |', '| --- | --- | --- |')
  for (const item of column.domain?.values ?? []) {
    lines.push(`| ${cell(item.value)} | ${item.count} | ${percent(item.share, item.count)} |`)
  }
  return lines.join('\n') + '\n'
}

/**
 * 关系页正文。
 * @param {object} rel
 * @returns {string}
 */
export function renderRelation(rel) {
  return [
    `# ${rel.fromTable}.${rel.fromColumn} → ${rel.toTable}.${rel.toColumn}`,
    '',
    relationBasis(rel),
    '',
  ].join('\n')
}

/**
 * 给人看的复核说明：要判断什么、为什么没自动发布、数字怎么读、接受和拒绝会怎样。
 * @param {object} rel
 * @returns {string}
 */
export function relationReviewBrief(rel) {
  const pair = `${rel.fromTable}.${rel.fromColumn} → ${rel.toTable}.${rel.toColumn}`
  const why = rel.holdText || '包含率高于复核线，但没有达到自动发布的条件。'
  return [
    '## 要判断的事',
    '',
    `请确认 ${pair} 是不是同一个业务编号。`,
    '',
    '## 为什么没有自动发布',
    '',
    why,
    '',
    '## 这些数字怎么看',
    '',
    '- 基数：这一列有多少个不同值',
    '- 区分度：基数占非空采样行的比例。接近 1 才像主键；很低说明一个值被很多行共用',
    '- 包含率：当前列记为 A，对面列记为 B，这一格是 |A∩B| / |A|。100% 只表示 A 的取值都出现在 B 里，不表示两边基数相同',
    '- Jaccard：两边取值集合的重合程度，整对关系只有一个数。接近 1 表示几乎是同一组值',
    '',
    '## 接受和拒绝',
    '',
    '接受会把这层关联写成一页，表页可以链到它。拒绝不建立这层关联，已有页面不变。',
    '',
    '## 采样',
    '',
    relationBasis(rel),
  ].join('\n')
}

/**
 * 关系的指标表。左右两列各是一端，每一行一个指标。
 * @param {object} rel
 * @returns {string}
 */
function relationReason(rel) {
  return `基数 ${plain(rel.fromDistinct)} 和 ${plain(rel.toDistinct)}，包含率 ${percent(rel.containment)}，Jaccard ${fixed(rel.jaccard, 2)}`
}

export function relationBasis(rel) {
  const left = `${rel.fromTable}.${rel.fromColumn}`
  const right = `${rel.toTable}.${rel.toColumn}`
  const lines = [
    `| 指标 | ${cell(left)} | ${cell(right)} |`,
    '| --- | --- | --- |',
    `| 表总行数 | ${plain(rel.fromRows)} | ${plain(rel.toRows)} |`,
    `| 基数 | ${plain(rel.fromDistinct)} | ${plain(rel.toDistinct)} |`,
    `| 区分度 | ${fixed(rel.fromUniqueness, 2)} | ${fixed(rel.toUniqueness, 2)} |`,
    `| 包含率 \\|A∩B\\|/\\|A\\| | ${containmentCell(rel, 'from')} | ${containmentCell(rel, 'to')} |`,
    `| Jaccard \\|A∩B\\|/\\|A∪B\\| | ${jaccardCell(rel)} | — |`,
  ]
  return lines.join('\n')
}

/**
 * 由一张表的证据生成决策。没有 db.table 证据时返回 null。
 * 已有页面用 update。未达阈值的关系只生成复核提议。
 * @param {object} material
 * @param {{hasPage?: (slug: string) => boolean, hasOpenProposal?: (slug: string) => boolean, knowledgeBaseId?: string}} [ctx]
 * @returns {object[]|null}
 */
export function compileDbDocument(material, ctx = {}) {
  const evidence = material?.evidence
  if (evidence?.kind !== DB_EVIDENCE_KIND) return null
  const checked = validateDbTableEvidence(evidence)
  if (!checked.ok) throw new Error(checked.errors.join('; '))
  const hasPage = ctx.hasPage ?? (() => false)
  const hasOpenProposal = ctx.hasOpenProposal ?? (() => false)
  const knowledgeBaseId = typeof ctx.knowledgeBaseId === 'string' && ctx.knowledgeBaseId ? ctx.knowledgeBaseId : ''
  const slugs = pageSlugs(evidence)
  const decisions = []
  const entityBody = renderDbTable(evidence)
  const gaps = dbDocumentGaps(entityBody, evidence)
  if (gaps.length > 0) throw new Error(`document incomplete: ${gaps.join(', ')}`)
  decisions.push(factDecision(slugs.entity, 'entity', entityBody, material.id, hasPage(slugs.entity), '表结构、注释和值域来自采集'))
  for (const column of evidence.columns) {
    if (!column.dictionary) continue
    const slug = slugs.dictionaries.get(column.name)
    decisions.push(factDecision(slug, 'concept', renderDictionary(evidence, column), material.id, hasPage(slug), '字典取值和占比来自采样'))
  }
  for (const rel of evidence.relations) {
    if (relationOwner(rel) !== evidence.table) continue
    if (relationUsesTime(evidence, rel)) continue
    const slug = slugs.relations.get(relationKey(rel)) ?? relationSlug(rel)
    if (rel.verdict === 'review') {
      if (hasPage(slug) || hasOpenProposal(slug)) continue
      const page = factDecision(slug, 'relation', renderRelation(rel), material.id, false, '包含率未达到外键阈值')
      const objectId = knowledgeBaseId ? associationObjectId(knowledgeBaseId, rel) : undefined
      decisions.push({
        ...page,
        confidence: 0.6,
        review: {
          reasons: [relationReason(rel)],
          brief: relationReviewBrief(rel),
          publish: { ...page, confidence: DB_FACT_CONFIDENCE },
          ...(objectId ? { objectId } : {}),
        },
      })
      continue
    }
    if (rel.verdict !== 'accepted') continue
    decisions.push(factDecision(slug, 'relation', renderRelation(rel), material.id, hasPage(slug), '关系由采样包含率得出'))
  }
  for (const decision of decisions) {
    const result = validateDecision(decision)
    if (!result.ok) throw new Error(result.errors.join('; '))
  }
  return decisions
}

function factDecision(slug, pageType, body, materialId, exists, rationale) {
  return {
    schemaVersion: SCHEMA_VERSION,
    action: exists ? 'update' : 'new',
    slug,
    pageType,
    confidence: DB_FACT_CONFIDENCE,
    rationale,
    evidenceRefs: [materialId],
    body,
  }
}

function pageSlugs(evidence) {
  const used = new Set()
  const entity = take(fitSlug('entity', [dbSlugPart(evidence.table)]), used)
  const dictionaries = new Map()
  for (const column of evidence.columns ?? []) {
    if (!column.dictionary) continue
    dictionaries.set(column.name, take(fitSlug('concept', [dbSlugPart(evidence.table), dbSlugPart(column.name)]), used))
  }
  const relations = new Map()
  for (const rel of evidence.relations ?? []) {
    const key = relationKey(rel)
    if (relations.has(key)) continue
    relations.set(key, take(relationSlug(rel), used))
  }
  return { entity, dictionaries, relations }
}

function relationSlug(rel) {
  return fitSlug('relation', [
    dbSlugPart(rel.fromTable),
    dbSlugPart(rel.fromColumn),
    dbSlugPart(rel.toTable),
    dbSlugPart(rel.toColumn),
    'link',
  ])
}

function relationUsesTime(evidence, rel) {
  return [[rel.fromTable, rel.fromColumn], [rel.toTable, rel.toColumn]].some(([table, column]) => {
    if (!tableMatches(evidence.table, table)) return false
    return evidence.columns.find((item) => item.name === column)?.role === 'time'
  })
}

function tableMatches(left, right) {
  return left === right || String(left).endsWith(`.${right}`) || String(right).endsWith(`.${left}`)
}

function relationOwner(rel) {
  if (rel.kind === 'directed') return rel.fromTable
  const left = `${rel.fromTable}.${rel.fromColumn}`
  const right = `${rel.toTable}.${rel.toColumn}`
  return left <= right ? rel.fromTable : rel.toTable
}

function relationKey(rel) {
  return `${rel.fromTable}\0${rel.fromColumn}\0${rel.toTable}\0${rel.toColumn}`
}

function fitSlug(prefix, parts) {
  const body = parts.filter(Boolean).join('_') || 'item'
  const slug = `${prefix}/${body}`.slice(0, 120).replace(/_+$/g, '')
  if (isSlug(slug)) return slug
  const shorter = `${prefix}/${body.slice(0, 60)}`.replace(/_+$/g, '')
  return isSlug(shorter) ? shorter : `${prefix}/item`
}

function take(slug, used) {
  if (!used.has(slug)) {
    used.add(slug)
    return slug
  }
  let n = 2
  let next = `${slug}_${n}`
  while (used.has(next)) next = `${slug}_${++n}`
  used.add(next)
  return next
}

function groundsQuery(column) {
  return !column.dictionary && column.domain?.kind === 'values' && (column.domain.values?.length ?? 0) > 0
}

function nullRateCell(column, evidence) {
  if (column.nullRate != null) return percent(column.nullRate, column.nullCount)
  const sampled = Number(column.sampleRows ?? evidence.sampleRows)
  const denom = Number.isFinite(sampled) && sampled > 0 ? sampled : Number(column.nullCount ?? 0) + Number(column.nonNullCount ?? 0)
  if (!denom || !Number.isFinite(Number(column.nullCount))) return '—'
  return percent(column.nullCount / denom)
}

function cardinalityCell(column) {
  if (column.cardinality === null || column.role === 'masked' || column.role === 'large') return '—'
  const n = column.cardinality ?? column.distinctCount
  if (n == null || !Number.isFinite(Number(n))) return '—'
  return `${n}${column.distinctApprox ? '（采样内）' : ''}`
}

function selectivityCell(column) {
  if (column.selectivity === null || column.role === 'masked' || column.role === 'large') return '—'
  if (column.selectivity != null) return fixed(column.selectivity, 2)
  if (!Number(column.nonNullCount)) return '—'
  return fixed(Number(column.distinctCount) / Number(column.nonNullCount), 2)
}

function fieldExtra(column, dictSlug) {
  if (column.domain?.note === 'empty') return '无数据'
  if (column.domain?.note === 'sample-small') return '样本不足'
  if (column.dictionary && dictSlug) return `字典 [[${dictSlug}]]`
  if (column.domain?.kind === 'range' && column.domain.min != null) return `${column.domain.min} .. ${column.domain.max}`
  if (column.domain?.kind === 'length') return `最大长度 ${column.domain.maxLength ?? 0}`
  if (column.domain?.kind === 'redacted') return '不列举'
  if (column.domain?.kind === 'values') return '见值域'
  return ''
}

function domainText(column) {
  const lines = [
    '| 指标 | 数值 |',
    '| --- | --- |',
    `| 空值率 | ${nullRateCell(column, { sampleRows: column.sampleRows })} |`,
    `| 基数 | ${cardinalityCell(column)} |`,
    `| 区分度 | ${selectivityCell(column)} |`,
  ]
  lines.push('', '| 取值 | 次数 | 占比 |', '| --- | --- | --- |')
  for (const item of column.domain?.values ?? []) {
    lines.push(`| ${cell(item.value)} | ${plain(item.count)} | ${percent(item.share, item.count)} |`)
  }
  return lines.join('\n')
}

function relationPhrase(rel, table) {
  const from = rel.fromTable === table ? rel.fromColumn : `${rel.fromTable}.${rel.fromColumn}`
  const to = rel.toTable === table ? rel.toColumn : `${rel.toTable}.${rel.toColumn}`
  return `${from} → ${to}`
}

function overlapCount(rel) {
  const a = Number(rel.fromDistinct)
  const b = Number(rel.toDistinct)
  const cover = Number(rel.containment)
  const back = Number(rel.reverseContainment)
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null
  const fromInter = Number.isFinite(cover) ? Math.round(cover * a) : null
  const toInter = Number.isFinite(back) ? Math.round(back * b) : null
  const inter = fromInter ?? toInter
  if (!Number.isFinite(inter)) return null
  return Math.max(0, Math.min(a, b, inter))
}

function containmentCell(rel, side) {
  const distinct = Number(side === 'from' ? rel.fromDistinct : rel.toDistinct)
  const rate = Number(side === 'from' ? rel.containment : rel.reverseContainment)
  if (!Number.isFinite(distinct) || !Number.isFinite(rate)) return '—'
  const inter = overlapCount(rel)
  return Number.isFinite(inter) ? `${percent(rate)}（${inter}/${distinct}）` : percent(rate)
}

function jaccardCell(rel) {
  const score = fixed(rel.jaccard, 2)
  const inter = overlapCount(rel)
  const a = Number(rel.fromDistinct)
  const b = Number(rel.toDistinct)
  if (!Number.isFinite(inter) || !Number.isFinite(a) || !Number.isFinite(b)) return score
  return `${score}（${inter}/${a + b - inter}）`
}

function plain(value) {
  return Number.isFinite(Number(value)) ? String(value) : '—'
}

function fixed(value, digits) {
  const n = Number(value)
  return Number.isFinite(n) ? n.toFixed(digits) : '—'
}

function percent(share, count) {
  const n = Number(share)
  if (!Number.isFinite(n)) return '—'
  if (n <= 0) return Number(count) > 0 ? '<0.1%' : '0%'
  const pct = n * 100
  if (pct >= 0.1) return `${pct.toFixed(1)}%`
  if (pct >= 0.01) return `${pct.toFixed(2)}%`
  if (pct >= 0.001) return `${pct.toFixed(3)}%`
  return '<0.001%'
}

function cell(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ')
}
