/**
 * Domain Pack 注册表。先验一律 suggested，只参与对齐提示与覆盖缺口。
 */

const packs = new Map()

/** 供应链金融最小包（内置，与 packs/scf/pack.yaml 对齐，免解析 YAML）。 */
export const SCF_PACK = Object.freeze({
  id: 'scf',
  version: '1.0.0',
  title: '供应链金融（最小先验包）',
  competencyQuestions: [
    { id: 'cq.confirm', text: '确权对应哪些字段与单据状态？' },
    { id: 'cq.finance_balance', text: '融资余额如何计算？' },
    { id: 'cq.roles', text: '核心企业与供应商分别是什么角色？' },
  ],
  domains: [
    { id: 'asset', name: '资产', summary: '应收账款等可融资资产' },
    { id: 'confirm', name: '确权', summary: '核心企业对资产的确认' },
    { id: 'finance', name: '融资', summary: '融资申请、审批与放款' },
  ],
  concepts: [
    {
      id: 'confirm_right',
      preferred: '确权',
      aliases: ['确认债权', '资产确权'],
      domain: 'confirm',
      definition: '核心企业确认应付责任的动作或状态',
      columnRegex: /(confirm|确权)/i,
      labelRegex: /(confirm|确权|债权)/i,
    },
    {
      id: 'finance_balance',
      preferred: '融资余额',
      aliases: ['在贷余额'],
      domain: 'finance',
      definition: '已放款且未结清的融资金额合计',
      columnRegex: /(balance|余额|financ)/i,
      labelRegex: /(余额|financ|在贷)/i,
    },
    {
      id: 'receivable',
      preferred: '应收账款',
      aliases: ['应收', 'AR'],
      domain: 'asset',
      definition: '供应商对核心企业的未收账款债权',
      tableRegex: /(recv|receivable|asset|应收)/i,
      labelRegex: /(应收|receivable|AR)/i,
    },
  ],
  documentTypes: [
    { id: 'receivable_doc', name: '应收单据', domain: 'asset', states: ['草稿', '已准入', '已确权', '已融资', '已结清'] },
    { id: 'confirm_doc', name: '确权单', domain: 'confirm', states: ['待确权', '已确权', '已拒绝'] },
    { id: 'finance_app', name: '融资申请单', domain: 'finance', states: ['已提交', '审批中', '已放款', '已拒绝'] },
  ],
  processes: [
    {
      id: 'finance_main',
      name: '融资主流程',
      steps: [
        { activity: '资产准入', seq: 1, documentType: 'receivable_doc' },
        { activity: '确权', seq: 2, documentType: 'confirm_doc', role: '核心企业' },
        { activity: '融资申请', seq: 3, documentType: 'finance_app' },
        { activity: '放款', seq: 4 },
        { activity: '还款结清', seq: 5 },
      ],
    },
  ],
  roles: [
    { id: 'supplier', name: '供应商' },
    { id: 'core_enterprise', name: '核心企业' },
    { id: 'funder', name: '资金方' },
  ],
  events: [
    { id: 'confirmed', name: '确权完成' },
    { id: 'disbursed', name: '放款成功' },
  ],
})

registerPack(SCF_PACK)

/**
 * @param {object} pack
 */
export function registerPack(pack) {
  packs.set(`${pack.id}@${pack.version}`, pack)
  packs.set(pack.id, pack)
  return () => {
    packs.delete(`${pack.id}@${pack.version}`)
    if (packs.get(pack.id) === pack) packs.delete(pack.id)
  }
}

/** @param {string} id */
export function getPack(id) {
  return packs.get(id) ?? null
}

export function listPacks() {
  return [...new Set([...packs.values()])]
}

/**
 * 展开 Pack 先验对象（domain / role / document_type / process / event），一律 proposed。
 * @param {object} pack
 * @param {string} knowledgeBaseId
 */
export function expandPackPriors(pack, knowledgeBaseId) {
  const packRef = `${pack.id}@${pack.version}`
  const objects = []
  const hits = []
  const coverageItems = []

  for (const domain of pack.domains ?? []) {
    const id = `biz_dom:${knowledgeBaseId}:pack:${pack.id}:${domain.id}`
    objects.push({
      id, kind: 'domain', knowledgeBaseId, title: domain.name,
      identity: { packDomainId: domain.id }, summary: domain.summary ?? null,
      caliber: 'proposed', packRef, evidenceIds: [],
    })
    hits.push({
      id: `hit:${id}`, facet: 'domain', objectKind: 'domain', objectId: id, score: 0,
      display: domain.name, aliases: [domain.id], haystack: domain.summary ?? '',
      evidenceIds: [], caliber: 'proposed', knowledgeBaseId, neighbors: [],
    })
  }

  for (const role of pack.roles ?? []) {
    const id = `biz_role:${knowledgeBaseId}:pack:${pack.id}:${role.id}`
    objects.push({
      id, kind: 'role', knowledgeBaseId, title: role.name,
      identity: { packRoleId: role.id }, caliber: 'proposed', packRef, evidenceIds: [],
    })
    hits.push({
      id: `hit:${id}`, facet: 'biz_label', objectKind: 'role', objectId: id, score: 0,
      display: role.name, aliases: [role.id], haystack: '',
      evidenceIds: [], caliber: 'proposed', knowledgeBaseId, neighbors: [],
    })
  }

  for (const docType of pack.documentTypes ?? []) {
    const id = `biz_dtype:${knowledgeBaseId}:pack:${pack.id}:${docType.id}`
    objects.push({
      id, kind: 'document_type', knowledgeBaseId, title: docType.name,
      identity: { packDocumentTypeId: docType.id, domain: docType.domain ?? null },
      states: docType.states ?? [], caliber: 'proposed', packRef, evidenceIds: [],
    })
    hits.push({
      id: `hit:${id}`, facet: 'biz_label', objectKind: 'document_type', objectId: id, score: 0,
      display: docType.name, aliases: [...(docType.states ?? []), docType.id],
      haystack: (docType.states ?? []).join(' '),
      evidenceIds: [], caliber: 'proposed', knowledgeBaseId, neighbors: [],
    })
  }

  for (const process of pack.processes ?? []) {
    const id = `biz_prc:${knowledgeBaseId}:pack:${pack.id}:${process.id}`
    objects.push({
      id, kind: 'process', knowledgeBaseId, title: process.name,
      identity: { packProcessId: process.id }, steps: process.steps ?? [],
      caliber: 'proposed', packRef, evidenceIds: [],
    })
    hits.push({
      id: `hit:${id}`, facet: 'process', objectKind: 'process', objectId: id, score: 0,
      display: process.name,
      aliases: (process.steps ?? []).map((step) => step.activity).filter(Boolean),
      haystack: (process.steps ?? []).map((step) => step.activity).join(' '),
      evidenceIds: [], caliber: 'proposed', knowledgeBaseId, neighbors: [],
    })
  }

  for (const event of pack.events ?? []) {
    const id = `biz_evt:${knowledgeBaseId}:pack:${pack.id}:${event.id}`
    objects.push({
      id, kind: 'event_type', knowledgeBaseId, title: event.name,
      identity: { packEventId: event.id }, caliber: 'proposed', packRef, evidenceIds: [],
    })
    hits.push({
      id: `hit:${id}`, facet: 'process', objectKind: 'event_type', objectId: id, score: 0,
      display: event.name, aliases: [event.id], haystack: '',
      evidenceIds: [], caliber: 'proposed', knowledgeBaseId, neighbors: [],
    })
  }

  for (const cq of pack.competencyQuestions ?? []) {
    coverageItems.push({
      severity: 'pack_cq',
      ref: `pack:${pack.id}:cq:${cq.id}`,
      detail: cq.text,
    })
  }

  return { objects, hits, coverageItems }
}

/**
 * 用 Pack 概念对列 / 枚举 / 文档概念做弱对齐。
 * @param {object} pack
 * @param {object[]} canonicalObjects
 * @param {string} knowledgeBaseId
 */
export function alignPackToObjects(pack, canonicalObjects, knowledgeBaseId) {
  const scoped = canonicalObjects.filter((row) => row.knowledgeBaseId === knowledgeBaseId)
  const columns = scoped.filter((row) => row.kind === 'column')
  const enums = scoped.filter((row) => row.kind === 'enum' || row.kind === 'enum_member')
  const concepts = scoped.filter((row) => row.kind === 'concept' && !String(row.id).includes(':pack:'))
  const hits = []
  const objects = []
  const coverageItems = []

  for (const concept of pack.concepts ?? []) {
    const conceptId = `biz_cpt:${knowledgeBaseId}:pack:${pack.id}:${concept.id}`
    objects.push({
      id: conceptId,
      kind: 'concept',
      knowledgeBaseId,
      title: concept.preferred,
      identity: { preferred: concept.preferred, packConceptId: concept.id, domain: concept.domain ?? null },
      definition: concept.definition,
      caliber: 'proposed',
      packRef: `${pack.id}@${pack.version}`,
      evidenceIds: [],
    })
    let matched = false

    for (const column of columns) {
      const hay = `${column.title}\n${column.comment ?? ''}`
      const byColumn = concept.columnRegex instanceof RegExp && concept.columnRegex.test(hay)
      const byTable = concept.tableRegex instanceof RegExp && concept.tableRegex.test(String(column.identity?.table ?? ''))
      if (!byColumn && !byTable) continue
      matched = true
      hits.push(groundingHit(conceptId, concept, knowledgeBaseId, column, hay, 'grounding'))
    }

    for (const row of enums) {
      const hay = [
        row.title,
        ...(row.aliases ?? []),
        ...(row.members ?? []).map((member) => `${member.value} ${member.label ?? ''}`),
      ].join('\n')
      const byLabel = concept.labelRegex instanceof RegExp && concept.labelRegex.test(hay)
      const byColumn = concept.columnRegex instanceof RegExp && concept.columnRegex.test(hay)
      if (!byLabel && !byColumn) continue
      matched = true
      hits.push(groundingHit(conceptId, concept, knowledgeBaseId, row, hay, 'grounds_enum'))
    }

    for (const row of concepts) {
      const hay = `${row.title}\n${(row.aliases ?? []).join('\n')}\n${row.definition ?? ''}`
      const byLabel = concept.labelRegex instanceof RegExp && concept.labelRegex.test(hay)
      const aliasHit = (concept.aliases ?? []).some((alias) => hay.toLowerCase().includes(String(alias).toLowerCase()))
      const titleHit = hay.toLowerCase().includes(String(concept.preferred).toLowerCase())
      if (!byLabel && !aliasHit && !titleHit) continue
      matched = true
      hits.push(groundingHit(conceptId, concept, knowledgeBaseId, row, hay, 'same_as'))
    }

    if (!matched) {
      coverageItems.push({
        severity: 'pack_gap',
        ref: conceptId,
        detail: `pack concept ${concept.preferred} not grounded`,
      })
    }
  }
  return { hits, objects, coverageItems }
}

/** @deprecated 使用 alignPackToObjects */
export function alignPackToColumns(pack, canonicalObjects, knowledgeBaseId) {
  return alignPackToObjects(pack, canonicalObjects, knowledgeBaseId)
}

function groundingHit(conceptId, concept, knowledgeBaseId, target, hay, rel) {
  return {
    id: `hit:${conceptId}:${target.id}`,
    facet: 'biz_label',
    objectKind: 'concept',
    objectId: conceptId,
    score: 0,
    display: concept.preferred,
    aliases: [...(concept.aliases ?? []), target.title].filter(Boolean),
    haystack: `${concept.definition ?? ''}\n${hay}`,
    evidenceIds: target.evidenceIds ?? [],
    caliber: 'proposed',
    knowledgeBaseId,
    neighbors: [{ objectId: target.id, rel }],
  }
}
