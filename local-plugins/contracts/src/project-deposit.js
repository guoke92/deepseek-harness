/**
 * 对话沉淀原料的精加工投影：Case、口径草稿、码值指称提议。
 */
import { finish, isObj, isStr } from './common.js'

/**
 * @param {object} material
 * @param {{knowledgeBaseId: string}} ctx
 */
export function projectDepositMaterial(material, ctx) {
  const knowledgeBaseId = ctx.knowledgeBaseId
  const evidence = material?.evidence
  if (!isObj(evidence) || !isStr(evidence.kind)) {
    return { hits: [], objects: [], proposals: [], coverageItems: [], okWithoutDecisions: false, reason: 'deposit evidence missing' }
  }

  if (evidence.kind === 'sql_confirmed') {
    const caseId = `biz_case:${knowledgeBaseId}:${material.id}`
    const question = isStr(evidence.question) ? evidence.question : ''
    const sql = isStr(evidence.sql) ? evidence.sql : String(material.content ?? '')
    const fields = Array.isArray(evidence.fields) ? evidence.fields.map(String) : []
    const object = {
      id: caseId,
      kind: 'case',
      knowledgeBaseId,
      title: question || sql.slice(0, 80),
      sql,
      fields,
      rowCount: evidence.rowCount ?? null,
      sessionId: evidence.sessionId ?? null,
      evidenceIds: [material.id],
      caliber: 'accepted',
    }
    const hit = {
      id: `hit:${caseId}`,
      facet: 'case',
      objectKind: 'case',
      objectId: caseId,
      score: 0,
      display: object.title,
      aliases: fields,
      haystack: `${question}\n${sql}`,
      evidenceIds: [material.id],
      caliber: 'accepted',
      knowledgeBaseId,
      neighbors: fields.map((field) => ({
        objectId: `tech_col:${knowledgeBaseId}:${field}`,
        rel: 'uses',
      })),
    }
    return {
      hits: [hit],
      objects: [object],
      proposals: [],
      coverageItems: [],
      okWithoutDecisions: true,
    }
  }

  if (evidence.kind === 'caliber_confirmed') {
    const policyId = `biz_pol:${knowledgeBaseId}:${material.id}`
    const text = isStr(evidence.text) ? evidence.text : String(material.content ?? '')
    const object = {
      id: policyId,
      kind: 'policy',
      knowledgeBaseId,
      title: text.slice(0, 80),
      text,
      evidenceIds: [material.id],
      caliber: 'draft',
    }
    const hit = {
      id: `hit:${policyId}`,
      facet: 'policy',
      objectKind: 'policy',
      objectId: policyId,
      score: 0,
      display: object.title,
      aliases: [],
      haystack: text,
      evidenceIds: [material.id],
      caliber: 'draft',
      knowledgeBaseId,
      neighbors: [],
    }
    return {
      hits: [hit],
      objects: [object],
      proposals: [],
      coverageItems: [{ severity: 'policy_draft', ref: policyId, detail: 'caliber awaiting review' }],
      okWithoutDecisions: true,
    }
  }

  if (evidence.kind === 'label_corrected') {
    const field = evidence.field
    const value = evidence.value
    const label = evidence.label
    if (!isStr(field) || !isStr(value) || !isStr(label)) {
      return { hits: [], objects: [], proposals: [], coverageItems: [], okWithoutDecisions: false, reason: 'label deposit incomplete' }
    }
    const proposal = {
      id: `prop_label_${material.id}`,
      kind: 'label',
      status: 'open',
      knowledgeBaseId,
      field,
      value,
      label,
      evidenceIds: [material.id],
      createdAt: material.updatedAt ?? material.createdAt,
      decisionId: `dec_${material.id}`,
    }
    const hit = {
      id: `hit:label:${material.id}`,
      facet: 'value',
      objectKind: 'enum_member',
      objectId: `tech_val:${knowledgeBaseId}:${field}:${value}`,
      score: 0,
      display: label,
      aliases: [value, field],
      haystack: `${field} ${value} ${label}`,
      evidenceIds: [material.id],
      caliber: 'proposed',
      knowledgeBaseId,
      neighbors: [{ objectId: `tech_col:${knowledgeBaseId}:${field}`, rel: 'label_of' }],
    }
    return {
      hits: [hit],
      objects: [],
      proposals: [proposal],
      coverageItems: [],
      okWithoutDecisions: true,
    }
  }

  return { hits: [], objects: [], proposals: [], coverageItems: [], okWithoutDecisions: false, reason: `unsupported deposit kind ${evidence.kind}` }
}

/** @param {object} material */
export function isDepositMaterial(material) {
  const kind = material?.evidence?.kind
  return kind === 'sql_confirmed' || kind === 'caliber_confirmed' || kind === 'label_corrected'
}

/** @param {object} projection */
export function validateDepositProjection(projection) {
  if (!isObj(projection)) return finish(['projection must be an object'])
  return finish([])
}
