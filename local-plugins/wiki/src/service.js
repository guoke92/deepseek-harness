/**
 * wiki 宿主服务：把纯函数层接到 storage domain，写入串行化，并对外暴露读模型与决策入口。
 */
import { randomBytes } from 'node:crypto'
import { createSerialQueue } from './queue.js'
import { createWikiStore } from './store.js'
import { createMaterialStore } from './materials-store.js'
import { applyDecision, applyDecisions, promoteDraft, revertTo } from './apply.js'
import { graphOverview, graphExpand, deadLinks } from './links.js'
import { runDecisionBatch } from './pipeline.js'
import { compilerFor } from './compilers.js'
import './db-compiler.js'

const TABLE_REF = /^[A-Za-z0-9_]+(\.[A-Za-z0-9_]+){0,2}$/

/**
 * 采集使用的表。显式非空列表优先，其次是知识库自己的范围，再次是数据源默认范围。
 * 都没有时返回 null，表示采集连接默认库的全部表。
 * @param {{scopes?: Record<string, {tables?: string[]}>}|null|undefined} base
 * @param {number|string} datasourceId
 * @param {string[]|null|undefined} override
 * @param {string[]|null|undefined} [fallback]
 * @returns {string[]|null}
 */
export function collectTables(base, datasourceId, override, fallback) {
  if (Array.isArray(override) && override.length > 0) return override
  const scoped = base?.scopes?.[String(Number(datasourceId))]?.tables
  if (scoped?.length) return scoped
  return Array.isArray(fallback) && fallback.length > 0 ? fallback : null
}

/** 把 storage domain 的 table 包成 store 需要的 get/put/entries/size 形状。 */

const COLLECT_STATES = new Set(['done', 'failed', 'cancelled'])

function normalizeCollects(value) {
  if (!value || typeof value !== 'object') return {}
  const out = {}
  for (const [key, row] of Object.entries(value)) {
    if (!/^\d+$/.test(key) || !COLLECT_STATES.has(row?.state)) continue
    out[key] = {
      state: row.state,
      error: typeof row.error === 'string' && row.error ? row.error.slice(0, 300) : null,
      finishedAt: typeof row.finishedAt === 'string' ? row.finishedAt : null,
    }
  }
  return out
}

function normalizeScopes(value) {
  if (!value || typeof value !== 'object') return {}
  const out = {}
  for (const [key, scope] of Object.entries(value)) {
    if (!/^\d+$/.test(key)) continue
    const tables = [...new Set((scope?.tables ?? []).map(String))].filter((table) => TABLE_REF.test(table))
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
    delete: (id) => table.delete(String(id)),
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
  const ownFlag = (input, current, key) => (
    input != null && Object.prototype.hasOwnProperty.call(input, key) ? input[key] === true : current?.[key] === true
  )
  async function putBase(input, current) {
    const name = String(input?.name ?? current?.name ?? '').trim()
    if (!name || name.length > 80) throw new Error('name is required')
    const description = String(input?.description ?? current?.description ?? '').trim()
    if (description.length > 300) throw new Error('description is too long')
    const datasourceIds = [...new Set((input?.datasourceIds ?? current?.datasourceIds ?? []).map(Number))]
      .filter((id) => Number.isInteger(id) && id > 0)
    const scopes = normalizeScopes(input?.scopes ?? current?.scopes ?? {})
    const collects = normalizeCollects(input?.collects ?? current?.collects ?? {})
    const at = now()
    const record = {
      schemaVersion: 1,
      id: current?.id ?? `kb_${randomBytes(6).toString('hex')}`,
      name,
      description,
      datasourceIds,
      scopes,
      collects,
      createdAt: current?.createdAt ?? at,
      updatedAt: at,
      ...(ownFlag(input, current, 'isDefault') ? { isDefault: true } : {}),
      ...(ownFlag(input, current, 'focused') ? { focused: true } : {}),
    }
    await basesTable.put(record.id, record)
    return record
  }
  async function replaceFlag(id, key) {
    const all = listBases()
    const current = all.find((item) => item.id === id)
    if (!current) throw new Error(`knowledge base ${id} not found`)
    let chosen = current
    for (const base of all) {
      const next = base.id === id
      if ((base[key] === true) === next) {
        if (next) chosen = base
        continue
      }
      const saved = await putBase({ [key]: next }, base)
      if (next) chosen = saved
    }
    return chosen
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
     * 按来源类型编译 captured 与 failed 原料。
     * 已注册且 supports 的原料生成页面；其余保持原状态。
     * @param {{knowledgeBaseId?: string, signal?: AbortSignal, onItem?: Function}} [opts]
     */
    async compile({ knowledgeBaseId, signal, onItem } = {}) {
      const belongs = (item) => !knowledgeBaseId || item.knowledgeBaseId === knowledgeBaseId
      return queue.run(async () => {
        const runnable = []
        for (const item of materials.list()) {
          if (!belongs(item) || (item.status !== 'captured' && item.status !== 'failed')) continue
          const compiler = compilerFor(item.sourceType)
          if (!compiler?.supports(item)) continue
          if (item.status === 'failed') await materials.transition(item.id, 'captured')
          runnable.push(item.id)
        }
        const outcomes = []
        let decided = 0
        let failed = 0
        const batchEnv = knowledgeBaseId ? { ...env, knowledgeBaseId } : env
        for (let index = 0; index < runnable.length; index++) {
          if (signal?.aborted) throw cancelledError()
          const material = materials.get(runnable[index])
          if (onItem) await onItem(material, index, runnable.length)
          const compiler = compilerFor(material.sourceType)
          let decisions
          try {
            decisions = compiler.compile(material, {
              hasPage: (slug) => Boolean(store.pages.get(slug, knowledgeBaseId)),
              hasOpenProposal: (slug) => store.proposals.list().some((item) => (
                item.slug === slug && item.status === 'open' && item.kind === 'review'
                && (!knowledgeBaseId || item.knowledgeBaseId === knowledgeBaseId)
              )),
            })
          } catch (err) {
            const reason = String(err?.message ?? err)
            await materials.transition(material.id, 'failed', { failureReason: reason })
            failed++
            outcomes.push({ materialId: material.id, outcome: 'failed', reason })
            continue
          }
          if (!decisions?.length) {
            const reason = 'compiler returned no decisions'
            await materials.transition(material.id, 'failed', { failureReason: reason })
            failed++
            outcomes.push({ materialId: material.id, outcome: 'failed', reason })
            continue
          }
          const stamped = decisions.map((decision) => ({
            ...decision,
            evidenceRefs: decision.evidenceRefs?.length ? decision.evidenceRefs : [material.id],
          }))
          const batch = applyDecisions(stamped, { ...batchEnv, decisionId: `dec_${material.id}`, source: 'pipeline' })
          if (batch.rejected) {
            await materials.transition(material.id, 'failed', { failureReason: batch.rejected.reason })
            failed++
            outcomes.push({ materialId: material.id, outcome: 'failed', reason: batch.rejected.reason, applied: batch.applied })
            continue
          }
          await materials.transition(material.id, 'decided', { decisionId: `dec_${material.id}` })
          decided++
          outcomes.push({ materialId: material.id, outcome: 'decided', applied: batch.applied })
        }
        const skipped = materials.list().filter((item) => belongs(item) && item.status === 'captured').length
        return { decided, failed, skipped, outcomes }
      })
    },
    promote(slug, knowledgeBaseId) {
      const bound = knowledgeBaseId ? { ...env, knowledgeBaseId } : env
      return queue.run(async () => promoteDraft(slug, bound))
    },
    revert(slug, version, knowledgeBaseId) {
      const bound = knowledgeBaseId ? { ...env, knowledgeBaseId } : env
      return queue.run(async () => revertTo(slug, version, bound))
    },
    /** 删除提议：接受则只标记状态，页面删除由人工单独操作（这里不直接删页）。 */
    resolveProposal(id, status) {
      return queue.run(async () => {
        if (!['accepted', 'rejected'].includes(status)) throw new Error('status must be accepted or rejected')
        const cur = store.proposals.get(id)
        if (!cur) throw new Error(`proposal ${id} not found`)
        if (status === 'accepted' && cur.kind === 'review' && cur.publish) {
          const exists = Boolean(store.pages.get(cur.publish.slug, cur.knowledgeBaseId))
          const result = applyDecision({
            ...cur.publish,
            action: exists ? 'update' : (cur.publish.action || 'new'),
          }, { ...env, knowledgeBaseId: cur.knowledgeBaseId, decisionId: cur.decisionId, source: 'user' })
          if (result.outcome === 'rejected') throw new Error(result.reason || 'review could not be published')
        }
        store.proposals.set(id, { status })
        return store.proposals.get(id)
      })
    },
    pages: (knowledgeBaseId) => scoped(store.pages.list(), knowledgeBaseId),
    page: (slug, knowledgeBaseId) => store.pages.get(slug, knowledgeBaseId) ?? null,
    proposals: (knowledgeBaseId) => scoped(store.proposals.list(), knowledgeBaseId),
    listMaterials: (knowledgeBaseId) => scoped(materials.list(), knowledgeBaseId),
    removeMaterial: (id) => materials.remove(id),
    async clearMaterials(knowledgeBaseId) {
      const ids = scoped(materials.list(), knowledgeBaseId).map((item) => item.id)
      for (const id of ids) await materials.remove(id)
      return { removed: ids.length }
    },
    revisions: (slug) => store.revisions.list(slug),
    outline: (knowledgeBaseId) => scoped(store.pages.list(), knowledgeBaseId)
      .filter((p) => p.status !== 'archived')
      .map((p) => `- [[${p.slug}]] ${p.title}（${p.pageType}，${p.status}，v${p.version}）`)
      .join('\n'),
    search(query, { limit = 8, includeDrafts = true, knowledgeBaseId } = {}) {
      const terms = String(query ?? '').toLowerCase().split(/\s+/).filter(Boolean)
      const hits = scoped(store.pages.list(), knowledgeBaseId).map((p) => {
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
      create: (input) => queue.run(async () => {
        const existing = listBases()
        const flags = {}
        if (!existing.some((item) => item.isDefault === true)) flags.isDefault = true
        if (!existing.some((item) => item.focused === true)) flags.focused = true
        return putBase({ ...flags, ...input })
      }),
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
        const collects = { ...(current.collects ?? {}) }
        delete scopes[String(nextId)]
        delete collects[String(nextId)]
        return putBase({ datasourceIds: current.datasourceIds.filter((item) => item !== nextId), scopes, collects }, current)
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
      setDefault: (id) => queue.run(() => replaceFlag(id, 'isDefault')),
      setFocus: (id) => queue.run(() => replaceFlag(id, 'focused')),
      noteCollect: (id, datasourceId, status) => queue.run(async () => {
        const current = basesTable.get(id)
        if (!current) throw new Error(`knowledge base ${id} not found`)
        const nextId = Number(datasourceId)
        if (!current.datasourceIds.includes(nextId)) throw new Error('datasource is not bound to this knowledge base')
        const collects = { ...(current.collects ?? {}) }
        collects[String(nextId)] = {
          state: status.state,
          error: status.error ?? null,
          finishedAt: now(),
        }
        return putBase({ collects }, current)
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
      if (all.length === 0) throw new Error('create a knowledge base first')
      return all.find((item) => item.focused) ?? all.find((item) => item.isDefault) ?? all[0]
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
        const base = await putBase({ name: '默认知识库', description: '', datasourceIds, isDefault: true, focused: true })
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

function cancelledError() {
  const error = new Error('cancelled')
  error.code = 'cancelled'
  return error
}
