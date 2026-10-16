/**
 * 原料存储（只追加）。存储介质由调用方注入：生产环境是 storage domain 的 table，测试是内存 Map。
 *
 * 不变式：
 *  - 同一幂等键（sourceType + sourceRef + contentHash）只产生一条原料，重复投递返回已有 id。
 *  - status 与 decisionId 在同一次 update 中写入（由 mutate 回调在单写者队列内完成）。
 *  - 记录不删除、不改写 content；状态迁移经 contracts.validateMaterialTransition 校验。
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
 */

/**
 * @param {{table: MaterialTable, now?: () => string, newId?: () => string}} deps
 */
export function createMaterialStore({ table, now = () => new Date().toISOString(), newId = defaultId }) {
  const queue = createSerialQueue()
  const byKey = new Map()
  for (const m of table.list()) byKey.set(materialIdempotencyKey(m), m.id)

  /**
   * 投递一条原料。返回 { id, created }。
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
      contentHash,
    })
    return queue.run(async () => {
      const existing = byKey.get(key)
      if (existing) return { id: existing, created: false }
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
        const { failureReason: _drop, ...rest } = cur
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

  return {
    capture,
    transition,
    assignBase,
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
  }
}
