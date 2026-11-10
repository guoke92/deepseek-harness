/**
 * 精加工投影：把原料写入 canonical / retrieval / coverage。
 */
import {
  CODE_EVIDENCE_KIND, DOC_EVIDENCE_KIND, isDepositMaterial, projectCodeMaterial, projectDbMaterial,
  projectDepositMaterial, projectDocMaterial, resolveRetrievalHits, validateRetrievalHit,
} from '@local/contracts'
import { alignPackToObjects, expandPackPriors, getPack } from './packs.js'

/**
 * @param {{canonical: {put: Function, get: Function, entries: Function}, retrieval: {put: Function, delete: Function, entries: Function}, coverage: {put: Function, get: Function}, proposals?: {add: Function, get: Function}}} tables
 * @param {object} material
 * @param {{knowledgeBaseId: string, packId?: string|null, packIds?: string[]|null, projection?: object}} ctx
 */
export async function projectMaterial(tables, material, ctx) {
  const knowledgeBaseId = ctx.knowledgeBaseId
  if (!knowledgeBaseId) throw new Error('knowledgeBaseId is required for projection')

  let projection = ctx.projection
  if (!projection) {
    if (material.sourceType === 'db' || material.evidence?.kind === 'db.table') {
      projection = projectDbMaterial(material, { knowledgeBaseId })
    } else if (material.sourceType === 'code' || material.evidence?.kind === CODE_EVIDENCE_KIND) {
      projection = projectCodeMaterial(material, { knowledgeBaseId })
    } else if (material.sourceType === 'doc' || material.evidence?.kind === DOC_EVIDENCE_KIND) {
      projection = projectDocMaterial(material, { knowledgeBaseId })
    } else if (isDepositMaterial(material)) {
      projection = projectDepositMaterial(material, { knowledgeBaseId })
    } else {
      return { projected: false, reason: 'no projector' }
    }
  }

  if (projection.okWithoutDecisions === false && projection.reason) {
    throw new Error(projection.reason)
  }

  let hits = [...(projection.hits ?? [])]
  let objects = [...(projection.objects ?? [])]
  let coverageItems = [...(projection.coverageItems ?? [])]

  for (const object of objects) {
    await tables.canonical.put(object.id, object)
  }

  const packIds = resolvePackIds(ctx)
  const packCoverageById = new Map()
  if (packIds.length) {
    const allObjects = [
      ...tables.canonical.entries().map(([, row]) => row).filter((row) => row.knowledgeBaseId === knowledgeBaseId),
    ]
    for (const packId of packIds) {
      const pack = getPack(packId)
      if (!pack) continue
      const priors = expandPackPriors(pack, knowledgeBaseId)
      for (const object of priors.objects) await tables.canonical.put(object.id, object)
      hits = [...hits, ...priors.hits]
      objects = [...objects, ...priors.objects]
      const aligned = alignPackToObjects(pack, [...allObjects, ...objects], knowledgeBaseId)
      for (const object of aligned.objects) await tables.canonical.put(object.id, object)
      hits = [...hits, ...aligned.hits]
      objects = [...objects, ...aligned.objects]
      packCoverageById.set(packId, [...priors.coverageItems, ...aligned.coverageItems])
    }
  }

  await replaceObjectHits(tables, knowledgeBaseId, material.id, hits)
  for (const proposal of projection.proposals ?? []) {
    if (!tables.proposals?.get(proposal.id)) tables.proposals?.add(proposal)
  }
  await mergeCoverage(tables, knowledgeBaseId, coverageItems, material.id)
  for (const [packId, items] of packCoverageById) {
    await mergeCoverage(tables, knowledgeBaseId, items, `__pack__:${packId}`)
  }
  return {
    projected: true,
    hits: hits.length,
    objects: objects.length,
    okWithoutDecisions: Boolean(projection.okWithoutDecisions),
  }
}

function resolvePackIds(ctx) {
  if (Array.isArray(ctx.packIds) && ctx.packIds.length) return [...new Set(ctx.packIds.map(String))]
  if (ctx.packId) return [String(ctx.packId)]
  return []
}

async function replaceObjectHits(tables, knowledgeBaseId, materialId, hits) {
  for (const [key, row] of tables.retrieval.entries()) {
    if (row.knowledgeBaseId !== knowledgeBaseId) continue
    if ((row.evidenceIds ?? []).includes(materialId)) await tables.retrieval.delete(key)
  }
  for (const hit of hits) {
    const checked = validateRetrievalHit(hit)
    if (!checked.ok) throw new Error(checked.errors.join('; '))
    await tables.retrieval.put(hit.id, hit)
  }
}

async function mergeCoverage(tables, knowledgeBaseId, items, materialId) {
  const current = tables.coverage.get(knowledgeBaseId) ?? {
    knowledgeBaseId,
    generation: 0,
    items: [],
    stats: {},
  }
  const kept = (current.items ?? []).filter((item) => item.materialId !== materialId)
  const nextItems = [
    ...kept,
    ...items.map((item) => ({ ...item, materialId })),
  ]
  const next = {
    knowledgeBaseId,
    generation: Number(current.generation ?? 0) + 1,
    items: nextItems,
    stats: {
      openGaps: nextItems.length,
      updatedAt: new Date().toISOString(),
    },
    batchHint: materialId,
  }
  await tables.coverage.put(knowledgeBaseId, next)
  return next
}

/**
 * @param {{retrieval: {entries: Function}, coverage: {get: Function}, canonical: {get: Function, entries: Function}}} tables
 * @param {string} knowledgeBaseId
 * @param {string} query
 * @param {{limit?: number, facets?: string[], includeDrafts?: boolean}} [opts]
 */
export function resolveKnowledge(tables, knowledgeBaseId, query, opts = {}) {
  const hits = tables.retrieval.entries()
    .map(([, row]) => row)
    .filter((row) => row.knowledgeBaseId === knowledgeBaseId)
  const resolved = resolveRetrievalHits(hits, query, {
    limit: opts.limit ?? 8,
    facets: opts.facets,
    acceptedOnly: opts.includeDrafts === false,
  })
  const coverage = tables.coverage.get(knowledgeBaseId) ?? null
  const subgraph = []
  for (const hit of resolved) {
    for (const neighbor of hit.neighbors ?? []) {
      const object = tables.canonical.get(neighbor.objectId)
      if (object) subgraph.push({ via: hit.objectId, rel: neighbor.rel, object })
    }
  }
  return {
    hits: resolved,
    subgraph,
    generation: coverage?.generation ?? 0,
  }
}
