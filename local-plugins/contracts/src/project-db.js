/**
 * 由 db 原料投影检索命中与覆盖项（精加工 Project 步的纯函数部分）。
 */
import { associationObjectId, dbSlugPart } from './db-document.js'
import { assertionsOf } from './derive-assertions.js'

export { associationObjectId }

/**
 * @param {object} material
 * @param {{knowledgeBaseId: string}} ctx
 * @returns {{hits: object[], objects: object[], coverageItems: object[], generationHint: string}}
 */
export function projectDbMaterial(material, ctx) {
  const knowledgeBaseId = ctx.knowledgeBaseId
  const { assertions } = assertionsOf(material)
  const evidenceId = material.id
  const table = assertions.find((item) => item.kind === 'table')?.payload?.name
    ?? material.evidence?.table
  if (!table) return { hits: [], objects: [], coverageItems: [], generationHint: evidenceId }

  const tableId = `tech_tbl:${knowledgeBaseId}:${table}`
  const objects = [{
    id: tableId,
    kind: 'table',
    knowledgeBaseId,
    identity: { table },
    title: table,
    comment: assertions.find((item) => item.kind === 'table')?.payload?.comment ?? null,
    evidenceIds: [evidenceId],
  }]
  const hits = [{
    id: `hit:${tableId}`,
    facet: 'tech_name',
    objectKind: 'table',
    objectId: tableId,
    score: 0,
    display: table,
    aliases: [],
    haystack: String(assertions.find((item) => item.kind === 'table')?.payload?.comment ?? ''),
    evidenceIds: [evidenceId],
    caliber: 'accepted',
    knowledgeBaseId,
    neighbors: [],
  }]

  const columns = assertions.filter((item) => item.kind === 'column')
  const profiles = new Map(
    assertions.filter((item) => item.kind === 'columnProfile').map((item) => [item.payload.column, item.payload]),
  )
  const coverageItems = []

  for (const column of columns) {
    const name = column.payload.name
    const columnId = `tech_col:${knowledgeBaseId}:${table}.${name}`
    const profile = profiles.get(name)
    const comment = column.payload.comment ?? ''
    objects.push({
      id: columnId,
      kind: 'column',
      knowledgeBaseId,
      identity: { table, column: name },
      title: `${table}.${name}`,
      comment,
      role: profile?.role ?? null,
      dictionary: Boolean(profile?.dictionary),
      domain: profile?.domain ?? null,
      evidenceIds: [evidenceId],
    })
    hits.push({
      id: `hit:${columnId}`,
      facet: 'tech_name',
      objectKind: 'column',
      objectId: columnId,
      score: 0,
      display: `${table}.${name}`,
      aliases: [name, comment].filter(Boolean),
      haystack: `${comment} ${profile?.role ?? ''}`,
      evidenceIds: [evidenceId],
      caliber: 'accepted',
      knowledgeBaseId,
      neighbors: [{ objectId: tableId, rel: 'member' }],
    })
    if (profile?.dictionary && profile.domain?.kind === 'values') {
      for (const item of profile.domain.values ?? []) {
        const text = String(item.value ?? '').trim()
        if (!text) continue
        const valueId = `tech_val:${knowledgeBaseId}:${table}.${name}:${text}`
        hits.push({
          id: `hit:${valueId}`,
          facet: 'value',
          objectKind: 'enum_member',
          objectId: valueId,
          score: 0,
          display: text,
          aliases: [],
          haystack: `${table}.${name}`,
          evidenceIds: [evidenceId],
          caliber: 'accepted',
          knowledgeBaseId,
          neighbors: [{ objectId: columnId, rel: 'value_of' }],
        })
      }
    }
    if (!comment) coverageItems.push({ severity: 'unbound_column', ref: columnId, detail: 'column has no comment' })
  }

  for (const assoc of assertions.filter((item) => item.kind === 'assocCandidate')) {
    const rel = assoc.payload
    if (rel.verdict === 'drop') continue
    const assocId = associationObjectId(knowledgeBaseId, rel)
    const caliber = rel.verdict === 'accepted' ? 'accepted' : 'proposed'
    objects.push({
      id: assocId,
      kind: 'association',
      knowledgeBaseId,
      identity: rel,
      title: `${rel.fromTable}.${rel.fromColumn} → ${rel.toTable}.${rel.toColumn}`,
      evidenceIds: [evidenceId],
      caliber,
    })
    hits.push({
      id: `hit:${assocId}`,
      facet: 'assoc',
      objectKind: 'association',
      objectId: assocId,
      score: 0,
      display: `${rel.fromTable}.${rel.fromColumn} → ${rel.toTable}.${rel.toColumn}`,
      aliases: [rel.fromColumn, rel.toColumn],
      haystack: `${rel.verdict} ${rel.containment}`,
      evidenceIds: [evidenceId],
      caliber,
      knowledgeBaseId,
      neighbors: [
        { objectId: `tech_col:${knowledgeBaseId}:${rel.fromTable}.${rel.fromColumn}`, rel: 'from' },
        { objectId: `tech_col:${knowledgeBaseId}:${rel.toTable}.${rel.toColumn}`, rel: 'to' },
      ],
    })
  }

  for (const term of assertions.filter((item) => item.kind === 'termHint')) {
    const { term: label, column } = term.payload
    const text = String(label ?? '').trim()
    if (!text) continue
    const conceptId = `biz_cpt:${knowledgeBaseId}:${dbSlugPart(text)}`
    objects.push({
      id: conceptId,
      kind: 'concept',
      knowledgeBaseId,
      identity: { preferred: text },
      title: text,
      evidenceIds: [evidenceId],
      caliber: 'proposed',
      packRef: null,
    })
    const columnId = `tech_col:${knowledgeBaseId}:${table}.${column}`
    hits.push({
      id: `hit:${conceptId}:${column}`,
      facet: 'biz_label',
      objectKind: 'concept',
      objectId: conceptId,
      score: 0,
      display: text,
      aliases: [column, `${table}.${column}`],
      haystack: commentHaystack(columns, column),
      evidenceIds: [evidenceId],
      caliber: 'proposed',
      knowledgeBaseId,
      neighbors: [{ objectId: columnId, rel: 'grounding' }],
    })
  }

  return {
    hits,
    objects,
    coverageItems,
    generationHint: `${evidenceId}:${material.structureHash ?? ''}:${material.profileHash ?? ''}`,
  }
}

function commentHaystack(columns, columnName) {
  return String(columns.find((item) => item.payload.name === columnName)?.payload?.comment ?? '')
}
