/**
 * wiki 存储适配层。表由调用方注入（storage domain 的 table 或内存表）：
 *   pages: slug → 页面记录；proposals: id → 提议；revisions: "slug@version" → 快照；log: 序号 → 日志行。
 * 写入全部经由 service 的单写者队列。
 */
import { formatLogEntry } from '@local/contracts'

/** 内存表：测试与离线回放使用，语义与 storage domain 的 table 一致。 */
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
      get: (slug) => pages.get(slug),
      put: (slug, record) => pages.put(slug, record),
      list: () => pages.entries().map(([, v]) => v),
    },
    proposals: {
      add: (record) => { proposals.put(record.id, record) },
      list: () => proposals.entries().map(([, v]) => v),
      get: (id) => proposals.get(id),
      set: (id, patch) => { const cur = proposals.get(id); if (cur) return proposals.put(id, { ...cur, ...patch }) },
    },
    revisions: {
      snapshot: (slug, version, snapshot, source, at) => {
        if (!snapshot) return
        revisions.put(`${slug}@${version}`, { slug, version, source, snapshot, createdAt: at })
      },
      get: (slug, version) => revisions.get(`${slug}@${version}`)?.snapshot,
      list: (slug) => revisions.entries().map(([, v]) => v).filter((r) => r.slug === slug).sort((a, b) => a.version - b.version),
    },
    log: (entry) => {
      const line = formatLogEntry({ at: now(), type: entry.type, ref: entry.ref, summary: entry.summary })
      if (!line.ok) throw new Error(`log entry invalid: ${line.errors.join('; ')}`)
      logTable.put(`${String(logTable.size).padStart(9, '0')}`, line.line)
    },
    logLines: () => logTable.entries().sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([, v]) => v),
  }
}
