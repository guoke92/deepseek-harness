/**
 * wiki 的 storage domain：原料与页面、提议、版本、日志。同一来源只保留一条原料。
 * 从数据源加工出的原料由本插件保存。细节校验由 @local/contracts 完成。
 */
import { z } from 'zod'

const domainTable = (schema) => ({ valueSchema: schema })

export const WIKI_DOMAIN_VERSION = 1

export const pageRecord = z.object({
  schemaVersion: z.literal(1),
  slug: z.string().min(1),
  pageType: z.enum(['entity', 'concept', 'relation', 'summary', 'index', 'synthesis', 'comparison']),
  title: z.string(),
  status: z.enum(['draft_only', 'published', 'published_with_draft', 'archived']),
  version: z.number().int().nonnegative(),
  published: z.record(z.string(), z.unknown()).nullable(),
  draft: z.record(z.string(), z.unknown()).nullable(),
  links: z.array(z.string()),
  backlinks: z.array(z.string()),
  knowledgeBaseId: z.string().min(1).optional(),
}).passthrough()

export const proposalRecord = z.object({
  id: z.string().min(1),
  // pack_gap 仅兼容历史行；新代码不再写入
  kind: z.enum(['delete', 'review', 'label', 'grounding', 'assoc', 'term_bind', 'policy', 'conflict', 'pack_gap']),
  status: z.enum(['open', 'accepted', 'rejected']),
  decisionId: z.string().min(1).optional(),
  createdAt: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  knowledgeBaseId: z.string().min(1).optional(),
}).passthrough()

export const revisionRecord = z.object({
  slug: z.string().min(1),
  version: z.number().int().positive(),
  source: z.enum(['pipeline', 'agent', 'user', 'revert']),
  snapshot: z.record(z.string(), z.unknown()),
  createdAt: z.string().min(1),
}).passthrough()

export const materialRecord = z.object({
  schemaVersion: z.literal(1),
  id: z.string().regex(/^raw_[0-9A-Za-z]{6,}$/),
  sourceType: z.enum(['db', 'code', 'sql', 'doc', 'conversation']),
  sourceRef: z.string().min(1).max(300),
  datasourceId: z.number().int().positive().nullable(),
  content: z.string(),
  contentHash: z.string().regex(/^[0-9a-f]{64}$/),
  evidence: z.record(z.string(), z.unknown()),
  status: z.enum(['captured', 'decided', 'failed']),
  decisionId: z.string().min(1).nullable(),
  failureReason: z.string().optional(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1).optional(),
  knowledgeBaseId: z.string().min(1).optional(),
  emphasis: z.string().min(1).optional(),
  assertions: z.array(z.record(z.string(), z.unknown())).optional(),
  structureHash: z.string().regex(/^[0-9a-f]{64}$/).optional(),
  profileHash: z.string().regex(/^[0-9a-f]{64}$/).optional(),
  refreshKind: z.enum(['profile']).optional(),
}).passthrough()

export const baseRecord = z.object({
  schemaVersion: z.literal(1),
  id: z.string().regex(/^kb_[0-9a-z]+$/),
  name: z.string().min(1).max(80),
  description: z.string().max(300),
  datasourceIds: z.array(z.number().int().positive()),
  scopes: z.record(z.string(), z.object({ tables: z.array(z.string().min(1)) })).optional(),
  isDefault: z.boolean().optional(),
  focused: z.boolean().optional(),
  collects: z.record(z.string(), z.object({
    state: z.enum(['done', 'failed', 'cancelled']),
    error: z.string().nullable(),
    finishedAt: z.string().nullable(),
  })).optional(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
}).passthrough()

export const canonicalRecord = z.object({
  id: z.string().min(1),
  kind: z.string().min(1),
  knowledgeBaseId: z.string().min(1),
}).passthrough()

export const retrievalRecord = z.object({
  id: z.string().min(1),
  facet: z.string().min(1),
  objectKind: z.string().min(1),
  objectId: z.string().min(1),
  knowledgeBaseId: z.string().min(1),
}).passthrough()

export const coverageRecord = z.object({
  knowledgeBaseId: z.string().min(1),
  generation: z.number().int().nonnegative(),
}).passthrough()

export const wikiDomainSpec = {
  name: 'wiki',
  version: WIKI_DOMAIN_VERSION,
  tables: {
    materials: domainTable(materialRecord),
    pages: domainTable(pageRecord),
    proposals: domainTable(proposalRecord),
    revisions: domainTable(revisionRecord),
    log: domainTable(z.string()),
    bases: domainTable(baseRecord),
    canonical: domainTable(canonicalRecord),
    retrieval: domainTable(retrievalRecord),
    coverage: domainTable(coverageRecord),
  },
}
