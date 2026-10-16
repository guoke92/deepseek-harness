/**
 * 链接与读模型：出链从正文解析；入链由所有页面的出链反推；图谱概览与有限深度展开。
 * 页面集合与边均为派生数据，不单独持久化。
 */
import { parseWikiLinks } from '@local/contracts'

/** @param {Array<{slug: string, published: {body: string}|null}>} pages */
export function computeLinks(pages) {
  const outgoing = new Map()
  for (const p of pages) {
    outgoing.set(p.slug, p.published ? parseWikiLinks(p.published.body).slugs : [])
  }
  const incoming = new Map(pages.map((p) => [p.slug, []]))
  for (const [from, targets] of outgoing) {
    for (const to of targets) if (incoming.has(to)) incoming.get(to).push(from)
  }
  return { outgoing, incoming }
}

/** 死链：出链指向不存在的页面（不计入草稿以外的已发布内容）。 */
export function deadLinks(pages) {
  const known = new Set(pages.map((p) => p.slug))
  const out = []
  for (const p of pages) {
    if (!p.published) continue
    for (const to of parseWikiLinks(p.published.body).slugs) {
      if (!known.has(to)) out.push({ from: p.slug, to })
    }
  }
  return out
}

/**
 * 图谱读模型。
 *  - 概览：按度数（出链 + 入链）取前 limit 个节点，以及它们之间的链接边。
 *  - 追溯边：摘要页与实体页若共享同一条原料，补一条 trace 边（不改变正文）。
 * @returns {{nodes: object[], edges: object[]}}
 */
export function graphOverview(pages, { limit = 50 } = {}) {
  const { outgoing, incoming } = computeLinks(pages)
  const degree = (s) => (outgoing.get(s)?.length ?? 0) + (incoming.get(s)?.length ?? 0)
  const ranked = [...pages].sort((a, b) => degree(b.slug) - degree(a.slug) || (a.slug < b.slug ? -1 : 1)).slice(0, limit)
  return buildGraph(ranked, outgoing, pages)
}

/**
 * 从中心页向外展开 depth 层（上限 3），节点数上限 maxNodes。
 * @returns {{nodes: object[], edges: object[], truncated: boolean}}
 */
export function graphExpand(pages, center, { depth = 1, maxNodes = 80 } = {}) {
  const d = Math.min(Math.max(depth, 0), 3)
  const byslug = new Map(pages.map((p) => [p.slug, p]))
  if (!byslug.has(center)) return { nodes: [], edges: [], truncated: false }
  const { outgoing, incoming } = computeLinks(pages)
  const seen = new Map([[center, 0]])
  const queue = [center]
  let truncated = false
  while (queue.length > 0) {
    const cur = queue.shift()
    const dist = seen.get(cur)
    if (dist >= d) continue
    for (const next of [...(outgoing.get(cur) ?? []), ...(incoming.get(cur) ?? [])]) {
      if (seen.has(next) || !byslug.has(next)) continue
      if (seen.size >= maxNodes) { truncated = true; continue }
      seen.set(next, dist + 1)
      queue.push(next)
    }
  }
  const keep = [...seen.keys()].map((s) => byslug.get(s))
  return { ...buildGraph(keep, outgoing, pages), truncated }
}

function buildGraph(nodePages, outgoing, allPages) {
  const keep = new Set(nodePages.map((p) => p.slug))
  const nodes = nodePages.map((p) => ({ id: p.slug, pageType: p.pageType, title: p.title, status: p.status }))
  const edges = []
  for (const p of nodePages) {
    for (const to of outgoing.get(p.slug) ?? []) {
      if (keep.has(to)) edges.push({ source: p.slug, target: to, kind: 'link' })
    }
  }
  const bySource = new Map()
  for (const p of allPages) {
    for (const src of p.published?.sources ?? []) {
      if (!bySource.has(src)) bySource.set(src, [])
      bySource.get(src).push(p)
    }
  }
  const seen = new Set()
  for (const group of bySource.values()) {
    const summaries = group.filter((p) => p.pageType === 'summary' && keep.has(p.slug))
    const others = group.filter((p) => p.pageType !== 'summary' && keep.has(p.slug))
    for (const s of summaries) {
      for (const o of others) {
        const key = `${s.slug}\u0000${o.slug}`
        if (seen.has(key)) continue
        seen.add(key)
        edges.push({ source: s.slug, target: o.slug, kind: 'trace' })
      }
    }
  }
  return { nodes, edges }
}
