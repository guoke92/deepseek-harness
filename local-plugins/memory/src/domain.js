/**
 * memory 的 storage domain 记录形状（zod）。写入路径（store.js）产生的字段必须全部匹配。
 * 与 @local/contracts 的 validateMemoryItem 保持一致的枚举与边界。
 */
import { z } from 'zod'

export const MEMORY_KINDS = ['profile', 'preference', 'interest', 'fact', 'task']

export const memoryItemRecord = z.object({
  id: z.string().min(1),
  subjectId: z.string().min(1),
  kind: z.enum(MEMORY_KINDS),
  content: z.string().min(1).max(300),
  origin: z.enum(['explicit', 'extracted', 'manual']),
  topic: z.string().max(80).nullable(),
  confidence: z.number().min(0).max(1),
  status: z.enum(['active', 'pending', 'superseded', 'archived']),
  supersedes: z.string().nullable(),
  fingerprint: z.string().min(1),
  createdAt: z.string().min(1),
  recalls: z.number().int().nonnegative(),
})

export const memoryTombstoneRecord = z.object({
  subjectId: z.string().min(1),
  fingerprint: z.string().min(1),
  createdAt: z.string().min(1),
})

const domainTable = (schema) => ({ valueSchema: schema })

export const memoryDomainSpec = {
  name: 'memory',
  version: 1,
  tables: {
    items: domainTable(memoryItemRecord),
    tombstones: domainTable(memoryTombstoneRecord),
  },
}
