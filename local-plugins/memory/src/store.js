/**
 * 记忆存储（按主体隔离）。表由调用方注入。写入经单写者队列串行执行。
 * 不变式：
 *  - 所有查询都带 subjectId；跨主体不可见。
 *  - pending 条目不进召回；替代时旧条目保持 active，直到确认。
 *  - 墓碑记录拒绝写入的指纹；同指纹不再写入。
 *  - 每个主体 active 条目不超过 max。
 */
import { createSerialQueue } from './queue.js'
import { topicKey, fingerprint } from './topic.js'

export function createMemoryStore({ items, tombstones, now = () => new Date().toISOString(), max = 200 }) {
  const queue = createSerialQueue()
  let seq = 0
  const idFor = () => `mem_${Date.now().toString(36)}_${(seq++).toString(36)}`
  const ofSubject = (subjectId) => [...items.entries()].map(([, v]) => v).filter((m) => m.subjectId === subjectId)

  return {
    /**
     * 写入一条记忆。
     * @param {{subjectId: string, kind: string, content: string, origin: 'explicit'|'extracted'|'manual', topic?: string|null, confidence?: number}} input
     * @returns {Promise<{status: 'created'|'pending'|'rejected', id?: string, reason?: string}>}
     */
    add(input) {
      return queue.run(async () => {
        const fp = fingerprint(input.content)
        if (tombstones.get(`${input.subjectId}\u0000${fp}`)) return { status: 'rejected', reason: 'tombstoned' }
        const active = ofSubject(input.subjectId).filter((m) => m.status === 'active')
        if (active.length >= max) return { status: 'rejected', reason: 'capacity' }
        const pending = input.origin === 'extracted'
        const id = idFor()
        const topic = input.topic ?? null
        let supersedes = null
        if (topic) {
          const same = active.find((m) => m.topic && topicKey(m.topic) === topicKey(topic) && m.kind === input.kind)
          if (same && !pending) supersedes = same.id
        }
        const record = {
          id, subjectId: input.subjectId, kind: input.kind, content: input.content,
          origin: input.origin, topic, confidence: input.confidence ?? (pending ? 0.6 : 1),
          status: pending ? 'pending' : 'active', supersedes, fingerprint: fp,
          createdAt: now(), recalls: 0,
        }
        await items.put(id, record)
        if (supersedes) await items.put(supersedes, { ...items.get(supersedes), status: 'superseded' })
        return { status: pending ? 'pending' : 'created', id }
      })
    },
    /** 待确认：把 pending 转为 active，并在此时替代旧条目。 */
    confirm(id) {
      return queue.run(async () => {
        const cur = items.get(id)
        if (!cur || cur.status !== 'pending') throw new Error(`memory ${id} is not pending`)
        let supersedes = null
        if (cur.topic) {
          const same = ofSubject(cur.subjectId).find((m) => m.status === 'active' && m.topic && topicKey(m.topic) === topicKey(cur.topic) && m.kind === cur.kind)
          if (same) { supersedes = same.id; await items.put(same.id, { ...same, status: 'superseded' }) }
        }
        await items.put(id, { ...cur, status: 'active', supersedes })
        return { id, supersedes }
      })
    },
    /** 删除一条记忆：归档并写墓碑，同内容不再写入。 */
    remove(id) {
      return queue.run(async () => {
        const cur = items.get(id)
        if (!cur) throw new Error(`memory ${id} not found`)
        await tombstones.put(`${cur.subjectId}\u0000${cur.fingerprint}`, { subjectId: cur.subjectId, fingerprint: cur.fingerprint, createdAt: now() })
        await items.put(id, { ...cur, status: 'archived' })
        return { id }
      })
    },
    /** 拒绝待确认条目：写墓碑，记录被拒绝的指纹。 */
    reject(id) {
      return queue.run(async () => {
        const cur = items.get(id)
        if (!cur) throw new Error(`memory ${id} not found`)
        await tombstones.put(`${cur.subjectId}\u0000${cur.fingerprint}`, { subjectId: cur.subjectId, fingerprint: cur.fingerprint, createdAt: now() })
        await items.put(id, { ...cur, status: 'archived' })
        return { id }
      })
    },
    /** 召回统计：同一条记忆被本轮引用时计数，供排序加分（封顶由调用方决定）。 */
    markRecalled(ids) {
      return queue.run(async () => {
        for (const id of ids) {
          const cur = items.get(id)
          if (cur) await items.put(id, { ...cur, recalls: (cur.recalls ?? 0) + 1 })
        }
      })
    },
    list: (subjectId) => ofSubject(subjectId),
    get: (id) => items.get(id),
  }
}
