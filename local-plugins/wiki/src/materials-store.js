/**
 * 原料存储。存储介质由调用方注入：生产环境是 storage domain 的 table，测试是内存 Map。
 *
 * 不变式：
 *  - 同一幂等键（知识库 + sourceType + sourceRef）只保留一条原料。
 *  - 再次投递同一来源时不新增行；内容变化则更新正文与证据。
 *  - 采集/投递覆盖后，已编译或失败的原料一律回到 captured，便于重新编译。
 *  - status 与 decisionId 在同一次 update 中写入。显式 transition 仍经 contracts.validateMaterialTransition 校验。
 */
import { randomBytes } from 'node:crypto'
import {
  contentHashOf, materialIdempotencyKey, validateMaterialInput, validateMaterialTransition,
  validateRawMaterial, SCHEMA_VERSION,
} from '@local/contracts'
import { createSerialQueue } from './queue.js'

/**
 * @typedef {object} MaterialTable
 * @property {(id: string) => object|undefined} get
 * @property {() => object[]} list
 * @property {(record: object) => Promise<void>} insert
 * @property {(id: string, mutate: (current: object) => object) => Promise<object>} update
 * @property {(id: string) => Promise<unknown>} delete
 */

/**
 * @param {{table: MaterialTable, now?: () => string, newId?: () => string}} deps
 */
export function createMaterialStore({ table, now = () => new Date().toISOString(), newId = defaultId }) {
  const queue = createSerialQueue()
  const byKey = new Map()
  const sourceKey = (record) => materialIdempotencyKey(record)
  const oldest = (rows) => rows.slice().sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : a.id < b.id ? -1 : 1))[0]
  const newest = (rows) => rows.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : a.id < b.id ? 1 : -1))[0]
  const seeded = new Map()
  for (const row of table.list()) {
    const key = sourceKey(row)
    seeded.set(key, [...(seeded.get(key) ?? []), row])
  }
  for (const [key, rows] of seeded) byKey.set(key, oldest(rows).id)

  /**
   * 把同一来源的多条原料收成最早的那条。内容取最新的一条。
   * @param {object[]} rows
   * @param {{content: string, evidence: object, datasourceId: number|null, updatedAt?: string}|null} incoming
   */
  async function collapse(rows, incoming) {
    const canonical = oldest(rows)
    const fresh = incoming ?? newest(rows)
    const contentHash = incoming ? contentHashOf(incoming.content) : fresh.contentHash
    const structureChanged = incoming?.structureHash != null
      && incoming.structureHash !== canonical.structureHash
    const profileOnly = incoming?.profileHash != null
      && incoming.structureHash != null
      && incoming.structureHash === canonical.structureHash
      && incoming.profileHash !== canonical.profileHash
    const changed = contentHash !== canonical.contentHash || structureChanged || profileOnly
    if (changed) {
      const next = await table.update(canonical.id, (cur) => {
        const { failureReason: _drop, refreshKind: _refresh, ...rest } = cur
        const out = {
          ...rest,
          content: fresh.content,
          contentHash,
          evidence: fresh.evidence,
          datasourceId: fresh.datasourceId,
          status: 'captured',
          decisionId: null,
          updatedAt: incoming?.updatedAt ?? fresh.updatedAt ?? fresh.createdAt ?? now(),
        }
        if (fresh.assertions) out.assertions = fresh.assertions
        if (fresh.emphasis) out.emphasis = fresh.emphasis
        if (fresh.structureHash) out.structureHash = fresh.structureHash
        if (fresh.profileHash) out.profileHash = fresh.profileHash
        if (profileOnly && !structureChanged) out.refreshKind = 'profile'
        return out
      })
      const checked = validateRawMaterial(next)
      if (!checked.ok) throw new Error(`material record invalid: ${checked.errors.join('; ')}`)
    }
    for (const row of rows) {
      if (row.id === canonical.id) continue
      await table.delete(row.id)
    }
    byKey.set(sourceKey(canonical), canonical.id)
    return canonical.id
  }

  /**
   * 投递一条原料。返回 { id, created, reopened? }。
   * 同一来源已存在时不新增；内容变化则更新正文。
   * 覆盖投递时，已编译或失败的原料一律回到 captured（即使正文未变）。
   * @param {object} input 符合 validateMaterialInput 的投递内容
   */
  function capture(input) {
    const checked = validateMaterialInput(input)
    if (!checked.ok) return Promise.reject(new Error(`invalid material: ${checked.errors.join('; ')}`))
    const contentHash = contentHashOf(input.content)
    const key = materialIdempotencyKey({
      knowledgeBaseId: input.knowledgeBaseId ?? '',
      sourceType: input.sourceType,
      sourceRef: input.sourceRef,
    })
    return queue.run(async () => {
      const rows = table.list().filter((row) => sourceKey(row) === key)
      const identical = rows.length === 1 && rows[0].contentHash === contentHash
        && (input.structureHash === undefined || input.structureHash === rows[0].structureHash)
        && (input.profileHash === undefined || input.profileHash === rows[0].profileHash)
      if (identical) {
        const existing = rows[0]
        if (existing.status === 'captured') return { id: existing.id, created: false }
        // 采集再次覆盖：即使正文未变，也清掉旧编译结果，回到待编译。
        const next = await table.update(existing.id, (cur) => {
          const { failureReason: _drop, refreshKind: _refresh, ...rest } = cur
          return {
            ...rest,
            status: 'captured',
            decisionId: null,
            updatedAt: now(),
          }
        })
        const checked = validateRawMaterial(next)
        if (!checked.ok) throw new Error(`material record invalid: ${checked.errors.join('; ')}`)
        return { id: existing.id, created: false, reopened: true }
      }
      if (rows.length > 0) {
        const id = await collapse(rows, {
          content: input.content,
          evidence: input.evidence,
          datasourceId: input.datasourceId,
          assertions: input.assertions,
          emphasis: input.emphasis,
          structureHash: input.structureHash,
          profileHash: input.profileHash,
          updatedAt: now(),
        })
        return { id, created: false }
      }
      const record = {
        schemaVersion: SCHEMA_VERSION,
        id: newId(),
        sourceType: input.sourceType,
        sourceRef: input.sourceRef,
        datasourceId: input.datasourceId,
        content: input.content,
        contentHash,
        evidence: input.evidence,
        status: 'captured',
        decisionId: null,
        createdAt: now(),
        ...(input.knowledgeBaseId ? { knowledgeBaseId: input.knowledgeBaseId } : {}),
        ...(input.assertions ? { assertions: input.assertions } : {}),
        ...(input.emphasis ? { emphasis: input.emphasis } : {}),
        ...(input.structureHash ? { structureHash: input.structureHash } : {}),
        ...(input.profileHash ? { profileHash: input.profileHash } : {}),
      }
      const ok = validateRawMaterial(record)
      if (!ok.ok) throw new Error(`material record invalid: ${ok.errors.join('; ')}`)
      await table.insert(record)
      byKey.set(key, record.id)
      return { id: record.id, created: true }
    })
  }

  /**
   * 迁移状态。decisionId 与状态在同一次 update 中写入。
   * @param {string} id
   * @param {'decided'|'failed'|'captured'} to
   * @param {{decisionId?: string, failureReason?: string}} extra
   */
  function transition(id, to, extra = {}) {
    return queue.run(async () => {
      const current = table.get(id)
      if (!current) throw new Error(`material ${id} not found`)
      const t = validateMaterialTransition(current.status, to)
      if (!t.ok) throw new Error(t.errors.join('; '))
      const next = await table.update(id, (cur) => {
        const { failureReason: _drop, refreshKind: _refresh, ...rest } = cur
        const out = { ...rest, status: to, decisionId: to === 'decided' ? extra.decisionId ?? null : null }
        if (to === 'failed') out.failureReason = extra.failureReason ?? 'unknown'
        return out
      })
      const checked = validateRawMaterial(next)
      if (!checked.ok) throw new Error(`material record invalid after transition: ${checked.errors.join('; ')}`)
      return next
    })
  }

  /**
   * 把已有原料归入知识库，并改写幂等键。内容不变。
   * @param {string} id
   * @param {string} knowledgeBaseId
   */
  function assignBase(id, knowledgeBaseId) {
    return queue.run(async () => {
      const current = table.get(id)
      if (!current) throw new Error(`material ${id} not found`)
      const next = await table.update(id, (cur) => ({ ...cur, knowledgeBaseId }))
      const checked = validateRawMaterial(next)
      if (!checked.ok) throw new Error(`material record invalid after assign: ${checked.errors.join('; ')}`)
      for (const [key, value] of byKey) if (value === id) byKey.delete(key)
      byKey.set(materialIdempotencyKey(next), id)
      return next
    })
  }

  /**
   * 启动时收掉同一来源的重复原料。保留最早的 id，正文用最新的一条。
   */
  function reconcile() {
    return queue.run(async () => {
      const groups = new Map()
      for (const row of table.list()) {
        const key = sourceKey(row)
        groups.set(key, [...(groups.get(key) ?? []), row])
      }
      for (const rows of groups.values()) {
        if (rows.length < 2) continue
        await collapse(rows, null)
      }
    })
  }

  return {
    capture,
    transition,
    assignBase,
    reconcile,
    /**
     * 删除一条原料，并放开它的幂等键。
     * @param {string} id
     */
    remove(id) {
      return queue.run(async () => {
        const current = table.get(id)
        if (!current) throw new Error(`material ${id} not found`)
        await table.delete(id)
        for (const [key, value] of byKey) if (value === id) byKey.delete(key)
        return true
      })
    },
    get: (id) => table.get(id),
    /** @returns {object[]} 所有原料，按创建时间升序 */
    list: () => table.list().slice().sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0)),
    /** @returns {object[]} 仍待决策的原料（回放入口） */
    pending: () => table.list().filter((m) => m.status === 'captured'),
    idle: () => queue.idle(),
  }
}

function defaultId() {
  return `raw_${randomBytes(9).toString('hex')}`
}

/** 内存表：测试与离线回放使用，语义与 storage domain 的 table 一致。 */
export function createMemoryTable(seed = []) {
  const rows = new Map(seed.map((r) => [r.id, structuredClone(r)]))
  return {
    get: (id) => (rows.has(id) ? structuredClone(rows.get(id)) : undefined),
    list: () => [...rows.values()].map((r) => structuredClone(r)),
    async insert(record) {
      if (rows.has(record.id)) throw new Error(`duplicate id ${record.id}`)
      rows.set(record.id, structuredClone(record))
    },
    async update(id, mutate) {
      if (!rows.has(id)) throw new Error(`missing ${id}`)
      const next = mutate(structuredClone(rows.get(id)))
      rows.set(id, structuredClone(next))
      return structuredClone(next)
    },
    async delete(id) { rows.delete(id) },
  }
}
