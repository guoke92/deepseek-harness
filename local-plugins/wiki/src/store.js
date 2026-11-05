/**
 * wiki 存储适配层。表由调用方注入（storage domain 的 table 或内存表）：
 *   pages: slug 或「知识库\\0slug」→ 页面记录；proposals: id → 提议；revisions: "slug@version" → 快照；log: 序号 → 日志行。
 * 写入全部经由 service 的单写者队列。
 */
import { formatLogEntry } from '@local/contracts'

/** 内存表：测试与离线回放使用，语义与 storage domain 的 table 一致。 */
function pageKey(knowledgeBaseId, slug) {
  return `${knowledgeBaseId}\0${slug}`
}

export function createMemoryTable(seed = []) {
  const rows = new Map(seed)
  return {
    get: (k) => (rows.has(k) ? structuredClone(rows.get(k)) : undefined),
    has: (k) => rows.has(k),
    put: async (k, v) => { rows.set(k, structuredClone(v)) },
    delete: async (k) => rows.delete(k),
    entries: () => [...rows.entries()].map(([k, v]) => [k, structuredClone(v)]),
    get size() { return rows.size },
  }
}

/**
 * @param {{pages: object, proposals: object, revisions: object, logTable: object, now: () => string}} t
 */
export function createWikiStore({ pages, proposals, revisions, logTable, now }) {
  return {
    pages: {
      /**
       * 按知识库取页面。没有 knowledgeBaseId 时只读旧的 slug 键。
       * @param {string} slug
       * @param {string} [knowledgeBaseId]
       */
      get(slug, knowledgeBaseId) {
        if (!knowledgeBaseId) return pages.get(slug)
        const owned = pages.get(pageKey(knowledgeBaseId, slug))
        if (owned) return owned
        const legacy = pages.get(slug)
        if (legacy && (!legacy.knowledgeBaseId || legacy.knowledgeBaseId === knowledgeBaseId)) return legacy
        return undefined
      },
      put(slug, record) {
        const base = record?.knowledgeBaseId
        if (!base) return pages.put(slug, record)
        const legacy = pages.get(slug)
        if (!legacy || !legacy.knowledgeBaseId || legacy.knowledgeBaseId === base) return pages.put(slug, record)
        return pages.put(pageKey(base, slug), record)
      },
      list: () => pages.entries().map(([, v]) => v),
    },
    proposals: {
      add: (record) => { proposals.put(record.id, record) },
      list: () => proposals.entries().map(([, v]) => v),
      get: (id) => proposals.get(id),
      set: (id, patch) => { const cur = proposals.get(id); if (cur) return proposals.put(id, { ...cur, ...patch }) },
    },
    revisions: {
      snapshot: (slug, version, snapshot, source, at, knowledgeBaseId) => {
        if (!snapshot) return
        const key = knowledgeBaseId ? `${pageKey(knowledgeBaseId, slug)}@${version}` : `${slug}@${version}`
        revisions.put(key, { slug, version, source, snapshot, createdAt: at, ...(knowledgeBaseId ? { knowledgeBaseId } : {}) })
      },
      get(slug, version, knowledgeBaseId) {
        if (knowledgeBaseId) {
          const owned = revisions.get(`${pageKey(knowledgeBaseId, slug)}@${version}`)
          if (owned) return owned.snapshot
        }
        const legacy = revisions.get(`${slug}@${version}`)
        if (!legacy) return undefined
        if (knowledgeBaseId && legacy.knowledgeBaseId && legacy.knowledgeBaseId !== knowledgeBaseId) return undefined
        return legacy.snapshot
      },
      list(slug, knowledgeBaseId) {
        return revisions.entries().map(([, v]) => v).filter((row) => {
          if (row.slug !== slug) return false
          if (!knowledgeBaseId) return true
          return !row.knowledgeBaseId || row.knowledgeBaseId === knowledgeBaseId
        }).sort((a, b) => a.version - b.version)
      },
    },
    log: (entry) => {
      const line = formatLogEntry({ at: now(), type: entry.type, ref: entry.ref, summary: entry.summary })
      if (!line.ok) throw new Error(`log entry invalid: ${line.errors.join('; ')}`)
      logTable.put(`${String(logTable.size).padStart(9, '0')}`, line.line)
    },
    logLines: () => logTable.entries().sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([, v]) => v),
  }
}
