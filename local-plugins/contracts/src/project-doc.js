/**
 * 文档粗加工：按亚型生成术语/场景/流程/规则断言，并投影为业务候选。
 */
import { hashStable, validateAssertions } from './assertions.js'
import { dbSlugPart } from './db-document.js'
import { finish, isObj, isStr } from './common.js'

export const DOC_EVIDENCE_KIND = 'doc.artifact'
export const DOC_SUBTYPES = Object.freeze([
  'glossary', 'data_dict', 'prd', 'design', 'manual', 'api', 'policy', 'faq',
])

/**
 * @param {object} evidence
 */
export function validateDocArtifactEvidence(evidence) {
  if (!isObj(evidence)) return finish(['evidence must be an object'])
  const e = []
  if (evidence.kind !== DOC_EVIDENCE_KIND) e.push(`evidence.kind must be ${DOC_EVIDENCE_KIND}`)
  if (!isStr(evidence.title)) e.push('evidence.title is required')
  if (!isStr(evidence.docUri)) e.push('evidence.docUri is required')
  if (!DOC_SUBTYPES.includes(evidence.subtype)) e.push(`evidence.subtype must be one of ${DOC_SUBTYPES.join(', ')}`)
  if (evidence.definitions !== undefined && !Array.isArray(evidence.definitions)) e.push('definitions must be an array')
  if (evidence.processes !== undefined && !Array.isArray(evidence.processes)) e.push('processes must be an array')
  if (evidence.policies !== undefined && !Array.isArray(evidence.policies)) e.push('policies must be an array')
  if (evidence.scenarios !== undefined && !Array.isArray(evidence.scenarios)) e.push('scenarios must be an array')
  return finish(e)
}

/**
 * @param {object} evidence
 */
export function buildDocAssertions(evidence) {
  const checked = validateDocArtifactEvidence(evidence)
  if (!checked.ok) throw new Error(checked.errors.join('; '))
  const assertions = [{
    key: 'artifact',
    kind: 'artifact',
    stance: 'observed',
    payload: {
      title: evidence.title,
      docUri: evidence.docUri,
      subtype: evidence.subtype,
    },
  }]
  for (const item of evidence.definitions ?? []) {
    const term = String(item.term ?? '').trim()
    if (!term) continue
    assertions.push({
      key: `def:${term}`,
      kind: 'definition',
      stance: 'proposed',
      payload: {
        term,
        aliases: (item.aliases ?? []).map(String),
        text: String(item.text ?? ''),
        fieldHints: (item.fieldHints ?? []).map(String),
      },
    })
  }
  for (const item of evidence.processes ?? []) {
    const name = String(item.name ?? '').trim()
    if (!name) continue
    assertions.push({
      key: `proc:${name}`,
      kind: 'processStep',
      stance: 'proposed',
      payload: {
        process: name,
        steps: (item.steps ?? []).map((step, index) => ({
          activity: String(step.activity ?? step.name ?? `step_${index + 1}`),
          seq: Number(step.seq ?? index + 1),
          role: step.role != null ? String(step.role) : null,
          documentType: step.documentType != null ? String(step.documentType) : null,
        })),
      },
    })
  }
  for (const item of evidence.policies ?? []) {
    const name = String(item.name ?? item.title ?? '').trim()
    if (!name) continue
    assertions.push({
      key: `pol:${name}`,
      kind: 'policyDraft',
      stance: 'proposed',
      payload: {
        name,
        text: String(item.text ?? ''),
        formula: item.formula != null ? String(item.formula) : null,
      },
    })
  }
  for (const item of evidence.scenarios ?? []) {
    const name = String(item.name ?? '').trim()
    if (!name) continue
    assertions.push({
      key: `scn:${name}`,
      kind: 'scenario',
      stance: 'proposed',
      payload: {
        name,
        actors: (item.actors ?? []).map(String),
        summary: String(item.summary ?? ''),
      },
    })
  }
  const observed = assertions.filter((row) => row.stance === 'observed')
  const proposed = assertions.filter((row) => row.stance === 'proposed')
  return {
    emphasis: `doc.${evidence.subtype}`,
    assertions,
    structureHash: hashStable(observed),
    profileHash: hashStable(proposed),
  }
}

/**
 * @param {object} material
 * @param {{knowledgeBaseId: string}} ctx
 */
export function projectDocMaterial(material, ctx) {
  const knowledgeBaseId = ctx.knowledgeBaseId
  const evidence = material.evidence
  const checked = validateDocArtifactEvidence(evidence)
  if (!checked.ok) throw new Error(checked.errors.join('; '))
  const built = Array.isArray(material.assertions) && material.assertions.length
    ? { assertions: material.assertions }
    : buildDocAssertions(evidence)
  const ok = validateAssertions(built.assertions)
  if (!ok.ok) throw new Error(ok.errors.join('; '))

  const docId = `tech_doc:${knowledgeBaseId}:${evidence.docUri}`
  const objects = [{
    id: docId,
    kind: 'document',
    knowledgeBaseId,
    title: evidence.title,
    identity: { docUri: evidence.docUri, subtype: evidence.subtype },
    evidenceIds: [material.id],
    caliber: 'accepted',
  }]
  const hits = [{
    id: `hit:${docId}`,
    facet: 'tech_name',
    objectKind: 'document',
    objectId: docId,
    score: 0,
    display: evidence.title,
    aliases: [evidence.docUri, evidence.subtype],
    haystack: evidence.subtype,
    evidenceIds: [material.id],
    caliber: 'accepted',
    knowledgeBaseId,
    neighbors: [],
  }]
  const coverageItems = []

  for (const assertion of built.assertions) {
    if (assertion.kind === 'definition') {
      const term = assertion.payload.term
      const conceptId = `biz_cpt:${knowledgeBaseId}:doc:${dbSlugPart(term)}`
      objects.push({
        id: conceptId,
        kind: 'concept',
        knowledgeBaseId,
        title: term,
        identity: { preferred: term },
        definition: assertion.payload.text,
        aliases: assertion.payload.aliases,
        evidenceIds: [material.id],
        caliber: 'proposed',
      })
      hits.push({
        id: `hit:${conceptId}`,
        facet: 'biz_label',
        objectKind: 'concept',
        objectId: conceptId,
        score: 0,
        display: term,
        aliases: assertion.payload.aliases,
        haystack: `${assertion.payload.text}\n${(assertion.payload.fieldHints ?? []).join(' ')}`,
        evidenceIds: [material.id],
        caliber: 'proposed',
        knowledgeBaseId,
        neighbors: (assertion.payload.fieldHints ?? []).map((field) => ({
          objectId: `tech_col:${knowledgeBaseId}:${field}`,
          rel: 'grounding',
        })),
      })
      coverageItems.push({
        severity: 'term_proposed',
        ref: conceptId,
        detail: `document term ${term} awaiting acceptance`,
      })
    }
    if (assertion.kind === 'processStep') {
      const name = assertion.payload.process
      const processId = `biz_prc:${knowledgeBaseId}:doc:${dbSlugPart(name)}`
      objects.push({
        id: processId,
        kind: 'process',
        knowledgeBaseId,
        title: name,
        identity: { process: name },
        steps: assertion.payload.steps,
        evidenceIds: [material.id],
        caliber: 'proposed',
      })
      hits.push({
        id: `hit:${processId}`,
        facet: 'process',
        objectKind: 'process',
        objectId: processId,
        score: 0,
        display: name,
        aliases: (assertion.payload.steps ?? []).map((step) => step.activity),
        haystack: (assertion.payload.steps ?? []).map((step) => step.activity).join(' '),
        evidenceIds: [material.id],
        caliber: 'proposed',
        knowledgeBaseId,
        neighbors: [{ objectId: docId, rel: 'from_doc' }],
      })
      for (const step of assertion.payload.steps ?? []) {
        if (!step.activity) continue
        const activityId = `biz_act:${knowledgeBaseId}:doc:${dbSlugPart(`${name}:${step.activity}`)}`
        objects.push({
          id: activityId,
          kind: 'activity',
          knowledgeBaseId,
          title: step.activity,
          identity: { process: name, seq: step.seq },
          role: step.role,
          documentType: step.documentType,
          evidenceIds: [material.id],
          caliber: 'proposed',
        })
      }
    }
    if (assertion.kind === 'policyDraft') {
      const name = assertion.payload.name
      const policyId = `biz_pol:${knowledgeBaseId}:doc:${dbSlugPart(name)}`
      objects.push({
        id: policyId,
        kind: 'policy',
        knowledgeBaseId,
        title: name,
        text: assertion.payload.text,
        formula: assertion.payload.formula,
        evidenceIds: [material.id],
        caliber: 'draft',
      })
      hits.push({
        id: `hit:${policyId}`,
        facet: 'policy',
        objectKind: 'policy',
        objectId: policyId,
        score: 0,
        display: name,
        aliases: [],
        haystack: `${assertion.payload.text}\n${assertion.payload.formula ?? ''}`,
        evidenceIds: [material.id],
        caliber: 'draft',
        knowledgeBaseId,
        neighbors: [{ objectId: docId, rel: 'from_doc' }],
      })
    }
    if (assertion.kind === 'scenario') {
      const name = assertion.payload.name
      const scenarioId = `biz_scn:${knowledgeBaseId}:doc:${dbSlugPart(name)}`
      objects.push({
        id: scenarioId,
        kind: 'case',
        knowledgeBaseId,
        title: name,
        identity: { scenario: name },
        actors: assertion.payload.actors,
        summary: assertion.payload.summary,
        evidenceIds: [material.id],
        caliber: 'proposed',
      })
      hits.push({
        id: `hit:${scenarioId}`,
        facet: 'case',
        objectKind: 'case',
        objectId: scenarioId,
        score: 0,
        display: name,
        aliases: assertion.payload.actors ?? [],
        haystack: assertion.payload.summary ?? '',
        evidenceIds: [material.id],
        caliber: 'proposed',
        knowledgeBaseId,
        neighbors: [{ objectId: docId, rel: 'from_doc' }],
      })
      for (const actor of assertion.payload.actors ?? []) {
        const roleId = `biz_role:${knowledgeBaseId}:doc:${dbSlugPart(actor)}`
        objects.push({
          id: roleId,
          kind: 'role',
          knowledgeBaseId,
          title: actor,
          identity: { preferred: actor },
          evidenceIds: [material.id],
          caliber: 'proposed',
        })
        hits.push({
          id: `hit:${roleId}`,
          facet: 'biz_label',
          objectKind: 'role',
          objectId: roleId,
          score: 0,
          display: actor,
          aliases: [],
          haystack: name,
          evidenceIds: [material.id],
          caliber: 'proposed',
          knowledgeBaseId,
          neighbors: [{ objectId: scenarioId, rel: 'actor_in' }],
        })
      }
    }
  }

  return { hits, objects, coverageItems, okWithoutDecisions: true }
}

/**
 * @param {object} evidence
 */
export function renderDocArtifact(evidence) {
  const lines = [`# ${evidence.title}`, '', `来源：${evidence.docUri}`, `亚型：${evidence.subtype}`, '']
  if (evidence.definitions?.length) {
    lines.push('## 术语', '')
    for (const item of evidence.definitions) {
      lines.push(`### ${item.term}`)
      if (item.aliases?.length) lines.push(`别名：${item.aliases.join('、')}`)
      if (item.text) lines.push(item.text)
      lines.push('')
    }
  }
  if (evidence.processes?.length) {
    lines.push('## 流程', '')
    for (const item of evidence.processes) {
      lines.push(`### ${item.name}`)
      for (const step of item.steps ?? []) {
        lines.push(`${step.seq ?? ''}. ${step.activity ?? step.name}${step.role ? `（${step.role}）` : ''}`)
      }
      lines.push('')
    }
  }
  if (evidence.policies?.length) {
    lines.push('## 规则', '')
    for (const item of evidence.policies) {
      lines.push(`### ${item.name ?? item.title}`)
      if (item.text) lines.push(item.text)
      if (item.formula) lines.push(`公式：${item.formula}`)
      lines.push('')
    }
  }
  return `${lines.join('\n').trim()}\n`
}
