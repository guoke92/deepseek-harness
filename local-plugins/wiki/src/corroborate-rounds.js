/**
 * CompileJudgement 闸门写入（lead / wiki_corroborate_apply 调用）。
 * 宿主自建印证多轮环已退役。
 */
import { businessCandidateKey, groundingId, validateRetrievalHit } from '@local/contracts'

/**
 * @param {object} tables
 * @param {string} knowledgeBaseId
 * @param {object} judgement
 */
export async function applyCompileJudgement(tables, knowledgeBaseId, judgement) {
  if (judgement.action === 'flag_coverage') {
    await putCoverageGap(tables, knowledgeBaseId, [{
      severity: 'compile_flag',
      ref: judgement.ref ?? 'flag',
      detail: judgement.detail,
    }], `__flag__:${judgement.ref ?? Date.now()}`)
    return
  }
  if (judgement.action === 'reject') return
  if (judgement.action === 'merge_identity') {
    const keep = tables.canonical.get(judgement.keepId)
    const drop = tables.canonical.get(judgement.dropId)
    if (!keep || !drop) return
    await tables.canonical.put(keep.id, {
      ...keep,
      aliases: [...new Set([...(keep.aliases ?? []), drop.title, ...(drop.aliases ?? [])].filter(Boolean))],
      evidenceIds: [...new Set([...(keep.evidenceIds ?? []), ...(drop.evidenceIds ?? [])])],
      corroboration: {
        ...(keep.corroboration ?? {}),
        mergedFrom: [...new Set([...(keep.corroboration?.mergedFrom ?? []), drop.id])],
      },
    })
    await tables.canonical.delete(drop.id)
    return
  }
  if (judgement.action === 'ground') {
    const id = groundingId(judgement.bizId, judgement.predicate, judgement.techId)
    const caliber = judgement.caliber === 'accepted' ? 'proposed' : (judgement.caliber || 'proposed')
    const object = {
      id,
      kind: 'grounding',
      knowledgeBaseId,
      title: `${judgement.predicate}:${judgement.bizId}->${judgement.techId}`,
      identity: {
        bizId: judgement.bizId,
        techId: judgement.techId,
        predicate: judgement.predicate,
      },
      caliber,
      evidenceIds: (judgement.evidenceAnchors ?? []).map((a) => a.materialId).filter(Boolean),
      evidenceAnchors: judgement.evidenceAnchors,
      corroboration: judgement.corroboration ?? null,
    }
    await tables.canonical.put(id, object)
    const hit = {
      id: `hit:${id}`,
      facet: 'biz_label',
      objectKind: 'concept',
      objectId: judgement.bizId,
      score: 0,
      display: judgement.predicate,
      aliases: [],
      haystack: `${judgement.bizId} ${judgement.techId}`,
      evidenceIds: object.evidenceIds,
      caliber,
      knowledgeBaseId,
      neighbors: [
        { objectId: judgement.bizId, rel: judgement.predicate },
        { objectId: judgement.techId, rel: 'grounds' },
      ],
    }
    const checked = validateRetrievalHit(hit)
    if (checked.ok) await tables.retrieval.put(hit.id, hit)
    return
  }
  if (judgement.action === 'judge_association') {
    const objectId = judgement.objectId || judgement.techId
    if (!objectId) return
    const cur = tables.canonical.get(objectId)
    if (!cur) return
    const caliber = judgement.verdict === 'accepted' ? 'accepted' : 'proposed'
    await tables.canonical.put(objectId, {
      ...cur,
      caliber,
      corroboration: judgement.corroboration ?? cur.corroboration,
    })
    return
  }
  if (judgement.action === 'upsert_canonical') {
    const raw = judgement.object
    const preferred = raw.title || raw.identity?.preferred || raw.id
    const candidateKey = businessCandidateKey(knowledgeBaseId, raw.kind || 'concept', preferred)
    const existing = tables.canonical.entries()
      .map(([, row]) => row)
      .find((row) => row.knowledgeBaseId === knowledgeBaseId && row.candidateKey === candidateKey)
    const id = existing?.id
      || raw.id
      || `biz_${raw.kind || 'cpt'}:${knowledgeBaseId}:${hashShort(candidateKey)}`
    let caliber = raw.caliber || 'proposed'
    if (caliber === 'accepted') caliber = 'proposed'
    if (raw.support === 'implicit') caliber = 'hypothesized'
    const hitCaliber = caliber === 'hypothesized' ? 'proposed' : caliber
    const object = {
      id,
      kind: raw.kind || 'concept',
      knowledgeBaseId,
      title: preferred,
      identity: raw.identity ?? { preferred },
      candidateKey,
      definition: raw.definition ?? null,
      aliases: raw.aliases ?? [],
      caliber,
      evidenceIds: (judgement.evidenceAnchors ?? []).map((a) => a.materialId).filter(Boolean),
      evidenceAnchors: judgement.evidenceAnchors,
      corroboration: judgement.corroboration ?? null,
      support: raw.support ?? null,
    }
    await tables.canonical.put(id, object)
    const objectKind = ['concept', 'document_type', 'process', 'activity', 'event_type', 'policy', 'case', 'domain', 'role', 'metric', 'grounding'].includes(object.kind)
      ? object.kind
      : 'concept'
    const hit = {
      id: `hit:${id}`,
      facet: raw.kind === 'process' ? 'process' : raw.kind === 'policy' ? 'policy' : raw.kind === 'domain' ? 'domain' : 'biz_label',
      objectKind,
      objectId: id,
      score: 0,
      display: object.title,
      aliases: object.aliases,
      haystack: `${object.definition ?? ''} ${(object.aliases ?? []).join(' ')}`,
      evidenceIds: object.evidenceIds,
      caliber: hitCaliber,
      knowledgeBaseId,
      neighbors: [],
    }
    const checked = validateRetrievalHit(hit)
    if (checked.ok) await tables.retrieval.put(hit.id, hit)
  }
}

/**
 * @param {object} tables
 * @param {string} knowledgeBaseId
 * @param {object[]} items
 * @param {string} batchHint
 */
export async function putCoverageGap(tables, knowledgeBaseId, items, batchHint) {
  const current = tables.coverage.get(knowledgeBaseId) ?? {
    knowledgeBaseId,
    generation: 0,
    items: [],
    stats: {},
  }
  const kept = (current.items ?? []).filter((item) => item.materialId !== batchHint)
  const nextItems = [...kept, ...items.map((item) => ({ ...item, materialId: batchHint }))]
  await tables.coverage.put(knowledgeBaseId, {
    knowledgeBaseId,
    generation: Number(current.generation ?? 0) + 1,
    items: nextItems,
    stats: { openGaps: nextItems.length, updatedAt: new Date().toISOString() },
    batchHint,
  })
}

function hashShort(text) {
  let h = 0
  const s = String(text)
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return Math.abs(h).toString(36).slice(0, 10)
}
