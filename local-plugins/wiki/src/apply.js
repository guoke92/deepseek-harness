/**
 * 决策落地：把一条通过契约校验的 Decision 应用到页面表上。
 *
 * 规则：
 *  - new：页面不存在则创建。置信度 ≥ 发布阈值 → published；介于草稿与发布阈值之间 → draft_only 或 published_with_draft；低于草稿阈值 → 只记日志（不落页）。
 *  - update：页面必须存在。patch 合并进条目段；body 整页替换只在 body 非 null 时发生（契约已保证二者互斥）。
 *    置信度达标写发布字段（覆盖前快照进版本历史）；否则只写草稿字段。
 *  - delete：只生成删除提议，不改页面。带 review 的 new 只生成审核提议，不落页。
 *  - 草稿与发布是同一页面记录的两个字段；人工确认草稿时覆盖发布正文并递增版本。
 */
import { validateDecision, routeDecision, validateWikiPage, parseWikiLinks } from '@local/contracts'
import { mergeItems } from './items.js'

export const DEFAULT_THRESHOLDS = Object.freeze({ autoPublishThreshold: 0.85, draftThreshold: 0.5 })

/**
 * @param {object} decision 已通过 validateDecision 的决策
 * @param {{pages: object, proposals: object, log: (entry: object) => void, now: () => string, thresholds?: object, source?: string}} env
 *   pages: { get(slug), put(slug, record) }；proposals: { add(record) }；source: 决策来源 pipeline|agent|user
 * @returns {{outcome: 'published'|'draft'|'log'|'proposal'|'rejected', slug: string, reason?: string}}
 */
export function applyDecision(decision, env) {
  const checked = validateDecision(decision)
  if (!checked.ok) return { outcome: 'rejected', slug: decision?.slug, reason: checked.errors.join('; ') }
  const thresholds = env.thresholds ?? DEFAULT_THRESHOLDS
  const at = env.now()
  const source = env.source ?? 'pipeline'
  if (decision.review) {
    env.proposals.add(stampBase({
      schemaVersion: 1,
      kind: 'review',
      id: `rv_${decision.slug.replace('/', '_')}_${at}`,
      slug: decision.slug,
      reason: decision.review.reasons.join('; '),
      reasons: decision.review.reasons,
      decisionId: env.decisionId,
      createdAt: at,
      status: 'open',
    }, env))
    env.log({ type: 'propose', ref: decision.slug, summary: `review proposal: ${decision.review.reasons.join('; ')}` })
    return { outcome: 'proposal', slug: decision.slug }
  }
  const route = routeDecision(decision, thresholds)

  if (decision.action === 'delete') {
    env.proposals.add(stampBase({
      schemaVersion: 1, kind: 'delete', id: `dp_${decision.slug.replace('/', '_')}_${at}`,
      slug: decision.slug, reason: decision.rationale, decisionId: env.decisionId, createdAt: at, status: 'open',
    }, env))
    env.log({ type: 'propose', ref: decision.slug, summary: `delete proposal: ${decision.rationale}` })
    return { outcome: 'proposal', slug: decision.slug }
  }

  if (route === 'log') {
    env.log({ type: 'decide', ref: decision.slug, summary: `low confidence ${decision.confidence}, not written` })
    return { outcome: 'log', slug: decision.slug }
  }

  const existing = env.pages.get(decision.slug)
  if (existing && env.knowledgeBaseId && existing.knowledgeBaseId && existing.knowledgeBaseId !== env.knowledgeBaseId) {
    return { outcome: 'rejected', slug: decision.slug, reason: 'page belongs to another knowledge base' }
  }
  if (decision.action === 'new' && existing) {
    return { outcome: 'rejected', slug: decision.slug, reason: 'new decision targets an existing page; use update' }
  }
  if (decision.action === 'update' && !existing) {
    return { outcome: 'rejected', slug: decision.slug, reason: 'update decision targets a missing page; use new' }
  }

  const sourcesNow = [...new Set([...(decision.evidenceRefs ?? [])])]
  const candidateBody = decision.action === 'update' && decision.patch
    ? mergeItems(currentBody(existing, route), decision.patch)
    : decision.body

  const content = {
    summary: summaryOf(candidateBody, decision.slug),
    body: candidateBody,
    confidence: decision.confidence,
    aliases: existing?.published?.aliases ?? [],
    sources: sourcesNow,
    editSource: source,
    editedAt: at,
  }

  const next = existing ? structuredCloneSafe(existing) : {
    schemaVersion: 1, slug: decision.slug, pageType: decision.pageType ?? 'concept', title: titleOf(decision.slug, candidateBody),
    status: 'draft_only', version: 0, published: null, draft: null, links: [], backlinks: [],
  }

  if (route === 'publish') {
    if (next.published) env.revisions?.snapshot(decision.slug, next.version, next.published, source, at)
    next.published = content
    next.draft = null
    next.version = (next.version ?? 0) + 1
    next.status = 'published'
    next.title = titleOf(decision.slug, candidateBody)
  } else {
    // draft 路径：只写草稿字段，已发布正文保持不变
    next.draft = content
    next.status = next.published ? 'published_with_draft' : 'draft_only'
  }
  next.links = parseWikiLinks(next.published?.body ?? '').slugs
  next.backlinks = next.backlinks ?? []
  const checkedPage = validateWikiPage(next)
  if (!checkedPage.ok) return { outcome: 'rejected', slug: decision.slug, reason: checkedPage.errors.join('; ') }
  if (env.knowledgeBaseId) next.knowledgeBaseId = existing?.knowledgeBaseId || env.knowledgeBaseId
  env.pages.put(decision.slug, next)
  env.log({ type: route === 'publish' ? 'publish' : 'draft', ref: decision.slug, summary: `${decision.action} v${next.version} confidence ${decision.confidence}` })
  return { outcome: route === 'publish' ? 'published' : 'draft', slug: decision.slug }
}

/** 人工确认草稿：草稿覆盖发布正文，版本递增，旧发布正文先写入版本历史。 */
export function promoteDraft(slug, env) {
  const page = env.pages.get(slug)
  if (!page?.draft) return { ok: false, reason: 'no draft to promote' }
  if (page.published) env.revisions?.snapshot(slug, page.version, page.published, 'user', env.now())
  const next = { ...page, published: { ...page.draft, editSource: 'user', editedAt: env.now() }, draft: null, status: 'published', version: page.version + 1 }
  env.pages.put(slug, next)
  env.log({ type: 'publish', ref: slug, summary: `draft promoted to v${next.version}` })
  return { ok: true, version: next.version }
}

/** 回滚：把指定历史版本的快照写成一个新版本（不删除历史）。 */
export function revertTo(slug, version, env) {
  const page = env.pages.get(slug)
  const snap = env.revisions?.get(slug, version)
  if (!page || !snap) return { ok: false, reason: 'missing page or version' }
  env.revisions.snapshot(slug, page.version, page.published, 'revert', env.now())
  const next = { ...page, published: { ...snap, editSource: 'revert', editedAt: env.now() }, draft: null, status: 'published', version: page.version + 1 }
  env.pages.put(slug, next)
  return { ok: true, version: next.version }
}

function currentBody(page, route) {
  if (!page) return ''
  return (route === 'publish' ? page.published?.body : (page.draft?.body ?? page.published?.body)) ?? ''
}

function stampBase(record, env) {
  return env.knowledgeBaseId ? { ...record, knowledgeBaseId: env.knowledgeBaseId } : record
}

/** 摘要：首个非标题行；没有正文行时回退到标题，保证契约要求的非空 summary。 */
function summaryOf(body, slug) {
  const lines = String(body ?? '').split('\n')
  const line = lines.find((l) => l.trim() && !l.startsWith('#')) ?? ''
  const heading = lines.find((l) => /^#\s+/.test(l))?.replace(/^#\s+/, '').trim() ?? ''
  return (line || heading || slug).slice(0, 300)
}

function titleOf(slug, body) {
  const m = /^#\s+(.+)$/m.exec(String(body ?? ''))
  return (m ? m[1].trim() : slug).slice(0, 200)
}

function structuredCloneSafe(v) {
  return JSON.parse(JSON.stringify(v))
}
