/**
 * 代码粗加工：由结构化代码证据生成断言；精加工投影枚举、映射与流转。
 */
import { hashStable, validateAssertions } from './assertions.js'
import { finish, isObj, isStr } from './common.js'

export const CODE_EVIDENCE_KIND = 'code.module'

/**
 * @param {object} evidence
 */
export function validateCodeModuleEvidence(evidence) {
  if (!isObj(evidence)) return finish(['evidence must be an object'])
  const e = []
  if (evidence.kind !== CODE_EVIDENCE_KIND) e.push(`evidence.kind must be ${CODE_EVIDENCE_KIND}`)
  if (!isStr(evidence.module)) e.push('evidence.module is required')
  if (evidence.enums !== undefined && !Array.isArray(evidence.enums)) e.push('evidence.enums must be an array')
  if (evidence.mappings !== undefined && !Array.isArray(evidence.mappings)) e.push('evidence.mappings must be an array')
  if (evidence.flows !== undefined && !Array.isArray(evidence.flows)) e.push('evidence.flows must be an array')
  if (evidence.apis !== undefined && !Array.isArray(evidence.apis)) e.push('evidence.apis must be an array')
  return finish(e)
}

/**
 * @param {object} evidence 已通过 validateCodeModuleEvidence
 */
export function buildCodeAssertions(evidence) {
  const checked = validateCodeModuleEvidence(evidence)
  if (!checked.ok) throw new Error(checked.errors.join('; '))
  const assertions = []
  assertions.push({
    key: 'module',
    kind: 'module',
    stance: 'observed',
    payload: { module: evidence.module, path: evidence.path ?? null },
  })
  for (const item of evidence.enums ?? []) {
    const fqn = String(item.fqn ?? item.name ?? '')
    if (!fqn) continue
    assertions.push({
      key: `enum:${fqn}`,
      kind: 'enum',
      stance: 'observed',
      payload: {
        fqn,
        members: (item.members ?? []).map((member) => ({
          value: String(member.value),
          label: member.label != null ? String(member.label) : null,
        })),
      },
    })
  }
  for (const item of evidence.mappings ?? []) {
    const from = String(item.from ?? '')
    const to = String(item.to ?? '')
    if (!from || !to) continue
    assertions.push({
      key: `map:${from}->${to}`,
      kind: 'mapping',
      stance: 'observed',
      payload: { from, to },
    })
  }
  for (const item of evidence.flows ?? []) {
    const machine = String(item.machine ?? item.name ?? 'flow')
    assertions.push({
      key: `flow:${machine}`,
      kind: 'transition',
      stance: 'inferred',
      payload: {
        machine,
        transitions: (item.transitions ?? []).map((row) => ({
          from: String(row.from),
          to: String(row.to),
          trigger: row.trigger != null ? String(row.trigger) : null,
        })),
        reads: (item.reads ?? []).map(String),
        writes: (item.writes ?? []).map(String),
      },
    })
  }
  for (const item of evidence.apis ?? []) {
    const path = String(item.path ?? '')
    const method = String(item.method ?? 'POST')
    if (!path) continue
    assertions.push({
      key: `api:${method}:${path}`,
      kind: 'api',
      stance: 'observed',
      payload: {
        method,
        path,
        fields: (item.fields ?? []).map(String),
        errors: (item.errors ?? []).map(String),
      },
    })
  }
  const structure = assertions.filter((row) => row.stance === 'observed')
  const inferred = assertions.filter((row) => row.stance === 'inferred')
  return {
    emphasis: 'code.module+code.enum+code.mapping+code.flow',
    assertions,
    structureHash: hashStable(structure),
    profileHash: hashStable(inferred),
  }
}

/**
 * @param {object} material
 * @param {{knowledgeBaseId: string}} ctx
 */
export function projectCodeMaterial(material, ctx) {
  const knowledgeBaseId = ctx.knowledgeBaseId
  const evidence = material.evidence
  const checked = validateCodeModuleEvidence(evidence)
  if (!checked.ok) throw new Error(checked.errors.join('; '))
  const built = Array.isArray(material.assertions) && material.assertions.length
    ? { assertions: material.assertions }
    : buildCodeAssertions(evidence)
  const ok = validateAssertions(built.assertions)
  if (!ok.ok) throw new Error(ok.errors.join('; '))

  const moduleName = evidence.module
  const moduleId = `tech_mod:${knowledgeBaseId}:${moduleName}`
  const objects = [{
    id: moduleId,
    kind: 'module',
    knowledgeBaseId,
    title: moduleName,
    identity: { module: moduleName, path: evidence.path ?? null },
    evidenceIds: [material.id],
    caliber: 'accepted',
  }]
  const hits = [{
    id: `hit:${moduleId}`,
    facet: 'tech_name',
    objectKind: 'module',
    objectId: moduleId,
    score: 0,
    display: moduleName,
    aliases: [evidence.path].filter(Boolean),
    haystack: String(evidence.path ?? ''),
    evidenceIds: [material.id],
    caliber: 'accepted',
    knowledgeBaseId,
    neighbors: [],
  }]

  for (const assertion of built.assertions) {
    if (assertion.kind === 'enum') {
      const fqn = assertion.payload.fqn
      const enumId = `tech_enum:${knowledgeBaseId}:${fqn}`
      objects.push({
        id: enumId,
        kind: 'enum',
        knowledgeBaseId,
        title: fqn,
        identity: { fqn },
        members: assertion.payload.members,
        evidenceIds: [material.id],
        caliber: 'accepted',
      })
      hits.push({
        id: `hit:${enumId}`,
        facet: 'tech_name',
        objectKind: 'enum',
        objectId: enumId,
        score: 0,
        display: fqn,
        aliases: assertion.payload.members.map((member) => member.label || member.value).filter(Boolean),
        haystack: assertion.payload.members.map((member) => `${member.value} ${member.label ?? ''}`).join(' '),
        evidenceIds: [material.id],
        caliber: 'accepted',
        knowledgeBaseId,
        neighbors: [{ objectId: moduleId, rel: 'member' }],
      })
      for (const member of assertion.payload.members) {
        const valueId = `tech_enum_val:${knowledgeBaseId}:${fqn}:${member.value}`
        hits.push({
          id: `hit:${valueId}`,
          facet: 'value',
          objectKind: 'enum_member',
          objectId: valueId,
          score: 0,
          display: String(member.label || member.value),
          aliases: [member.value, member.label].filter(Boolean),
          haystack: fqn,
          evidenceIds: [material.id],
          caliber: 'accepted',
          knowledgeBaseId,
          neighbors: [{ objectId: enumId, rel: 'value_of' }],
        })
      }
    }
    if (assertion.kind === 'mapping') {
      const to = assertion.payload.to
      const from = assertion.payload.from
      const mapId = `tech_map:${knowledgeBaseId}:${from}->${to}`
      objects.push({
        id: mapId,
        kind: 'mapping',
        knowledgeBaseId,
        title: `${from} → ${to}`,
        identity: { from, to },
        evidenceIds: [material.id],
        caliber: 'accepted',
      })
      hits.push({
        id: `hit:${mapId}`,
        facet: 'assoc',
        objectKind: 'mapping',
        objectId: mapId,
        score: 0,
        display: `${from} → ${to}`,
        aliases: [from, to],
        haystack: 'code mapping',
        evidenceIds: [material.id],
        caliber: 'accepted',
        knowledgeBaseId,
        neighbors: [
          { objectId: `tech_col:${knowledgeBaseId}:${to}`, rel: 'maps_to' },
        ],
      })
    }
    if (assertion.kind === 'transition') {
      const machine = assertion.payload.machine
      const flowId = `tech_flow:${knowledgeBaseId}:${moduleName}:${machine}`
      objects.push({
        id: flowId,
        kind: 'process',
        knowledgeBaseId,
        title: machine,
        identity: { machine, module: moduleName },
        transitions: assertion.payload.transitions,
        reads: assertion.payload.reads,
        writes: assertion.payload.writes,
        evidenceIds: [material.id],
        caliber: 'proposed',
      })
      hits.push({
        id: `hit:${flowId}`,
        facet: 'process',
        objectKind: 'process',
        objectId: flowId,
        score: 0,
        display: machine,
        aliases: [...(assertion.payload.reads ?? []), ...(assertion.payload.writes ?? [])],
        haystack: (assertion.payload.transitions ?? []).map((row) => `${row.from}->${row.to}`).join(' '),
        evidenceIds: [material.id],
        caliber: 'proposed',
        knowledgeBaseId,
        neighbors: [{ objectId: moduleId, rel: 'flow_of' }],
      })
    }
    if (assertion.kind === 'api') {
      const method = assertion.payload.method
      const path = assertion.payload.path
      const apiId = `tech_api:${knowledgeBaseId}:${method}:${path}`
      objects.push({
        id: apiId,
        kind: 'module',
        knowledgeBaseId,
        title: `${method} ${path}`,
        identity: { method, path, module: moduleName },
        fields: assertion.payload.fields,
        errors: assertion.payload.errors,
        evidenceIds: [material.id],
        caliber: 'accepted',
      })
      hits.push({
        id: `hit:${apiId}`,
        facet: 'tech_name',
        objectKind: 'module',
        objectId: apiId,
        score: 0,
        display: `${method} ${path}`,
        aliases: [path, ...(assertion.payload.fields ?? [])],
        haystack: `${method} ${path} ${(assertion.payload.errors ?? []).join(' ')}`,
        evidenceIds: [material.id],
        caliber: 'accepted',
        knowledgeBaseId,
        neighbors: [{ objectId: moduleId, rel: 'api_of' }],
      })
    }
  }

  return { hits, objects, coverageItems: [], okWithoutDecisions: true }
}

/**
 * @param {object} evidence
 * @param {string} [repoRef]
 */
export function renderCodeModule(evidence) {
  const lines = [`# ${evidence.module}`, '']
  if (evidence.path) lines.push(`路径：${evidence.path}`, '')
  if (evidence.enums?.length) {
    lines.push('## 枚举', '')
    for (const item of evidence.enums) {
      lines.push(`### ${item.fqn ?? item.name}`)
      for (const member of item.members ?? []) {
        lines.push(`- ${member.value}${member.label ? `（${member.label}）` : ''}`)
      }
      lines.push('')
    }
  }
  if (evidence.mappings?.length) {
    lines.push('## 字段映射', '')
    for (const item of evidence.mappings) lines.push(`- ${item.from} → ${item.to}`)
    lines.push('')
  }
  if (evidence.flows?.length) {
    lines.push('## 流转', '')
    for (const item of evidence.flows) {
      lines.push(`### ${item.machine ?? item.name ?? 'flow'}`)
      for (const row of item.transitions ?? []) {
        lines.push(`- ${row.from} → ${row.to}${row.trigger ? `（${row.trigger}）` : ''}`)
      }
      lines.push('')
    }
  }
  return `${lines.join('\n').trim()}\n`
}
