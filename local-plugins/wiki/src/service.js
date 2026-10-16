/**
 * wiki 宿主服务：把纯函数层接到 storage domain，写入串行化，并对外暴露读模型与决策入口。
 */
import { randomBytes } from 'node:crypto'
import { createSerialQueue } from './queue.js'
import { createWikiStore } from './store.js'
import { createMaterialStore } from './materials-store.js'
import { applyDecision, promoteDraft, revertTo } from './apply.js'
import { graphOverview, graphExpand, deadLinks } from './links.js'
import { runDecisionBatch } from './pipeline.js'

const TABLE_REF = /^[A-Za-z0-9_]+(\.[A-Za-z0-9_]+){0,2}$/

/**
 * 采集使用的表。显式非空列表优先，否则用该知识库绑定上保存的范围。
 * @param {{scopes?: Record<string, {tables?: string[]}>}|null|undefined} base
 * @param {number|string} datasourceId
 * @param {string[]|null|undefined} override
 * @returns {string[]|null}
 */
export function collectTables(base, datasourceId, override) {
  if (Array.isArray(override) && override.length > 0) return override
  const scoped = base?.scopes?.[String(Number(datasourceId))]?.tables
  return scoped?.length ? scoped : null
}

/** 把 storage domain 的 table 包成 store 需要的 get/put/entries/size 形状。 */

function normalizeScopes(value) {
  if (!value || typeof value !== 'object') return {}
  const out = {}
  for (const [key, scope] of Object.entries(value)) {
    if (!/^\d+$/.test(key)) continue
    const tables = [...new Set((scope?.tables ?? []).map(String))].filter((table) => TABLE_REF.test(table)).slice(0, 400)
    if (tables.length > 0) out[key] = { tables }
  }
  return out
}

function tableAdapter(table) {
  let cached = null
  const load = () => {
    if (!cached) cached = new Map([...table.entries()])
    return cached
  }
  return {
    get: (k) => table.get(k),
    put: async (k, v) => { await table.put(k, v); load().set(k, v) },
    delete: async (k) => { load().delete(k); return table.delete(k) },
    entries: () => [...table.entries()],
    get size() { return [...table.entries()].length },
  }
}

function materialAdapter(table) {
  return {
    get: (id) => table.get(String(id)),
    list: () => [...table.entries()].map(([, value]) => value),
    insert: (record) => table.put(String(record.id), record),
    update: async (id, mutate) => {
      const next = mutate(table.get(String(id)))
      await table.put(String(id), next)
      return next
    },
  }
}

/**
 * @param {{domain: object, now?: () => string}} deps
 */
export function createWikiService({ domain, now = () => new Date().toISOString() }) {
  const queue = createSerialQueue()
  const materials = createMaterialStore({ table: materialAdapter(domain.table('materials')), now })
  const basesTable = tableAdapter(domain.table('bases'))
  const store = createWikiStore({
    pages: tableAdapter(domain.table('pages')),
    proposals: tableAdapter(domain.table('proposals')),
    revisions: tableAdapter(domain.table('revisions')),
    logTable: tableAdapter(domain.table('log')),
    now,
  })
  const env = { pages: store.pages, proposals: store.proposals, revisions: store.revisions, log: store.log, now }
  const scoped = (rows, knowledgeBaseId) => knowledgeBaseId ? rows.filter((row) => row.knowledgeBaseId === knowledgeBaseId) : rows
  const listBases = () => basesTable.entries().map(([, value]) => value).sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
  async function putBase(input, current) {
    const name = String(input?.name ?? current?.name ?? '').trim()
    if (!name || name.length > 80) throw new Error('name is required')
    const description = String(input?.description ?? current?.description ?? '').trim()
    if (description.length > 300) throw new Error('description is too long')
    const datasourceIds = [...new Set((input?.datasourceIds ?? current?.datasourceIds ?? []).map(Number))]
      .filter((id) => Number.isInteger(id) && id > 0)
    const scopes = normalizeScopes(input?.scopes ?? current?.scopes ?? {})
    const at = now()
    const record = {
      schemaVersion: 1,
      id: current?.id ?? `kb_${randomBytes(6).toString('hex')}`,
      name,
      description,
      datasourceIds,
      scopes,
      createdAt: current?.createdAt ?? at,
      updatedAt: at,
    }
    await basesTable.put(record.id, record)
    return record
  }
  return {
    store,
    materials,
    /** 一条决策的落地（单写者）。evidenceRefs 必须指向已入库原料。 */
    decide(decision, { source = 'pipeline', decisionId = `dec_${Date.now()}` } = {}) {
      return queue.run(async () => {
        const refs = Array.isArray(decision?.evidenceRefs) ? decision.evidenceRefs : []
        const missing = refs.filter((id) => !materials.get(id))
        if (missing.length > 0) {
          return { outcome: 'rejected', slug: decision?.slug, reason: `unknown evidence refs: ${missing.join(', ')}` }
        }
        return applyDecision(decision, { ...env, source, decisionId })
      })
    },
    /** 追加一批原料（数据源剖析或问数沉淀）。 */
    async captureAll(inputs) {
      let captured = 0
      let reused = 0
      const ids = []
      for (const input of inputs) {
        const result = await materials.capture(input)
        ids.push(result.id)
        if (result.created) captured++
        else reused++
      }
      return { captured, reused, ids }
    },
    /** 对一批原料运行决策流水线（decide 由调用方注入，通常是模型结构化输出）。 */
    decideMaterials(batch, opts) {
      return queue.run(async () => runDecisionBatch(batch, { ...opts, env }))
    },
    /**
     * 编译全部 captured 原料。decide 在队列内调用，本身不要再进入本队列。
     * @param {(batch: object[], context: object) => Promise<object[]>} decide
     */
    async compile(decide, { knowledgeBaseId } = {}) {
      const belongs = (item) => !knowledgeBaseId || item.knowledgeBaseId === knowledgeBaseId
      const failed = materials.list().filter((item) => item.status === 'failed' && belongs(item))
      for (const item of failed) await materials.transition(item.id, 'captured')
      const captured = materials.list().filter((item) => item.status === 'captured' && belongs(item))
      const outline = scoped(store.pages.list(), knowledgeBaseId)
        .filter((page) => page.status !== 'archived')
        .map((page) => `- [[${page.slug}]] ${page.title}（${page.pageType}，${page.status}，v${page.version}）`)
        .join('\n')
      return queue.run(async () => runDecisionBatch(captured, {
        decide,
        context: () => ({ outline }),
        materials,
        env: knowledgeBaseId ? { ...env, knowledgeBaseId } : env,
      }))
    },
    promote(slug) {
      return queue.run(async () => promoteDraft(slug, env))
    },
    revert(slug, version) {
      return queue.run(async () => revertTo(slug, version, env))
    },
    /** 删除提议：接受则只标记状态，页面删除由人工单独操作（这里不直接删页）。 */
    resolveProposal(id, status) {
      return queue.run(async () => {
        if (!['accepted', 'rejected'].includes(status)) throw new Error('status must be accepted or rejected')
        const cur = store.proposals.get(id)
        if (!cur) throw new Error(`proposal ${id} not found`)
        store.proposals.set(id, { status })
        return store.proposals.get(id)
      })
    },
    pages: (knowledgeBaseId) => scoped(store.pages.list(), knowledgeBaseId),
    page: (slug) => store.pages.get(slug),
    proposals: (knowledgeBaseId) => scoped(store.proposals.list(), knowledgeBaseId),
    listMaterials: (knowledgeBaseId) => scoped(materials.list(), knowledgeBaseId),
    revisions: (slug) => store.revisions.list(slug),
    outline: (knowledgeBaseId) => scoped(store.pages.list(), knowledgeBaseId)
      .filter((p) => p.status !== 'archived')
      .map((p) => `- [[${p.slug}]] ${p.title}（${p.pageType}，${p.status}，v${p.version}）`)
      .join('\n'),
    search(query, { limit = 8, includeDrafts = true } = {}) {
      const terms = String(query ?? '').toLowerCase().split(/\s+/).filter(Boolean)
      const hits = store.pages.list().map((p) => {
        const text = `${p.title}\n${p.published?.body ?? ''}\n${includeDrafts ? (p.draft?.body ?? '') : ''}`.toLowerCase()
        const score = terms.reduce((n, t) => n + (text.includes(t) ? 1 : 0), 0)
        return { slug: p.slug, title: p.title, status: p.status, score }
      })
      return hits.filter((h) => h.score > 0).sort((a, b) => b.score - a.score).slice(0, limit)
    },
    graph: (opts = {}) => graphOverview(store.pages.list(), opts),
    expand: (center, opts = {}) => graphExpand(scoped(store.pages.list(), opts.knowledgeBaseId), center, opts),
    lint: () => ({ deadLinks: deadLinks(store.pages.list()) }),
    bases: {
      list: listBases,
      get: (id) => basesTable.get(id),
      create: (input) => queue.run(() => putBase(input)),
      update: (id, patch) => queue.run(async () => {
        const current = basesTable.get(id)
        if (!current) throw new Error(`knowledge base ${id} not found`)
        return putBase({ ...current, ...patch, datasourceIds: patch.datasourceIds ?? current.datasourceIds }, current)
      }),
      remove: (id) => queue.run(async () => {
        const current = basesTable.get(id)
        if (!current) throw new Error(`knowledge base ${id} not found`)
        await basesTable.delete(id)
        return true
      }),
      bind: (id, datasourceId) => queue.run(async () => {
        const current = basesTable.get(id)
        if (!current) throw new Error(`knowledge base ${id} not found`)
        const nextId = Number(datasourceId)
        if (!Number.isInteger(nextId) || nextId <= 0) throw new Error('datasourceId is required')
        if (current.datasourceIds.includes(nextId)) return current
        return putBase({ datasourceIds: [...current.datasourceIds, nextId] }, current)
      }),
      unbind: (id, datasourceId) => queue.run(async () => {
        const current = basesTable.get(id)
        if (!current) throw new Error(`knowledge base ${id} not found`)
        const nextId = Number(datasourceId)
        const scopes = { ...(current.scopes ?? {}) }
        delete scopes[String(nextId)]
        return putBase({ datasourceIds: current.datasourceIds.filter((item) => item !== nextId), scopes }, current)
      }),
      setScope: (id, datasourceId, tables) => queue.run(async () => {
        const current = basesTable.get(id)
        if (!current) throw new Error(`knowledge base ${id} not found`)
        const nextId = Number(datasourceId)
        if (!current.datasourceIds.includes(nextId)) throw new Error('datasource is not bound to this knowledge base')
        const scopes = { ...(current.scopes ?? {}) }
        const next = normalizeScopes({ [String(nextId)]: { tables } })
        if (next[String(nextId)]) scopes[String(nextId)] = next[String(nextId)]
        else delete scopes[String(nextId)]
        return putBase({ scopes }, current)
      }),
    },
    requireBound(knowledgeBaseId, datasourceId) {
      const base = basesTable.get(knowledgeBaseId)
      if (!base) throw new Error(`knowledge base ${knowledgeBaseId} not found`)
      const id = Number(datasourceId)
      if (!base.datasourceIds.includes(id)) throw new Error('datasource is not bound to this knowledge base')
      return base
    },
    resolveBase(knowledgeBaseId) {
      const all = listBases()
      if (knowledgeBaseId) {
        const found = all.find((item) => item.id === knowledgeBaseId)
        if (!found) throw new Error(`knowledge base ${knowledgeBaseId} not found`)
        return found
      }
      if (all.length === 1) return all[0]
      if (all.length === 0) throw new Error('create a knowledge base first')
      throw new Error('knowledgeBaseId is required')
    },
    /**
     * 还没有知识库、但已经有页面或原料时，归入一个默认库，并绑定产生过原料的数据源。
     */
    adoptLegacy() {
      return queue.run(async () => {
        if (basesTable.entries().length > 0) return null
        const mats = materials.list()
        const pages = store.pages.list()
        const proposals = store.proposals.list()
        if (mats.length === 0 && pages.length === 0 && proposals.length === 0) return null
        const datasourceIds = [...new Set(mats.map((item) => item.datasourceId).filter((id) => Number.isInteger(id) && id > 0))]
        const base = await putBase({ name: '默认知识库', description: '', datasourceIds })
        for (const item of mats) {
          if (!item.knowledgeBaseId) await materials.assignBase(item.id, base.id)
        }
        for (const page of pages) {
          if (!page.knowledgeBaseId) await store.pages.put(page.slug, { ...page, knowledgeBaseId: base.id })
        }
        for (const proposal of proposals) {
          if (!proposal.knowledgeBaseId) await store.proposals.set(proposal.id, { knowledgeBaseId: base.id })
        }
        return base
      })
    },
  }
}
