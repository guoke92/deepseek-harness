import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildDbAssertions } from '../../contracts/src/index.js'
import { toRawMaterial } from '../../analyst/src/deposit.js'
import { createWikiService } from '../src/service.js'
import { createMemoryTable } from '../src/store.js'
import { codeMaterial, docMaterial } from '../src/ingest.js'

function domain() {
  const tables = new Map()
  return {
    table(name) {
      if (!tables.has(name)) tables.set(name, createMemoryTable())
      return tables.get(name)
    },
  }
}

function evidence(rowCount = 2) {
  return {
    kind: 'db.table',
    table: 'ca_fee_order',
    comment: '年费订单',
    rowCount,
    sampleRows: rowCount,
    sampleMode: 'physical-prefix',
    primaryKey: ['id'],
    indexes: [],
    declaredForeignKeys: [],
    columns: [
      {
        name: 'order_status', dataType: 'varchar(16)', nullable: false, defaultValue: null, comment: '订单状态',
        role: 'enum', nullCount: 0, nonNullCount: 2, distinctCount: 2, distinctApprox: false, sampleRows: rowCount,
        domain: { kind: 'values', values: [{ value: 'PAID', count: 1, share: 0.5 }, { value: 'CLOSED', count: 1, share: 0.5 }] },
        dictionary: true,
      },
    ],
    relations: [],
    terms: [{ term: '订单状态', column: 'order_status' }],
  }
}

test('compile projects retrieval hits and resolve finds fields and terms', async () => {
  const svc = createWikiService({ domain: domain() })
  const base = await svc.bases.create({ name: '演示库', description: '', datasourceIds: [1] })
  await svc.bases.setPacks(base.id, ['scf'])
  const built = buildDbAssertions(evidence(2))
  await svc.materials.capture({
    sourceType: 'db',
    sourceRef: 'db:ds1/ca_fee_order',
    datasourceId: 1,
    knowledgeBaseId: base.id,
    content: '表文档',
    evidence: evidence(2),
    ...built,
  })
  const result = await svc.compile({ knowledgeBaseId: base.id })
  assert.equal(result.decided, 1)
  assert.deepEqual(result.packIds, ['scf'])
  assert.equal(svc.page('entity/ca_fee_order', base.id).status, 'published')
  assert.deepEqual(svc.bases.get(base.id).packIds, ['scf'])
  const resolved = svc.resolve('订单状态', { knowledgeBaseId: base.id })
  assert.ok(resolved.hits.length >= 1)
  assert.ok(resolved.hits.some((hit) => hit.facet === 'biz_label' || hit.display.includes('order_status')))
  assert.ok(resolved.generation >= 1)
  const cov = svc.coverage(base.id)
  assert.equal(cov.knowledgeBaseId, base.id)
  assert.ok((cov.items ?? []).some((item) => item.severity === 'pack_gap' || item.ref.includes('pack:scf')))
})

test('code material compiles into enum and mapping retrieval hits', async () => {
  const svc = createWikiService({ domain: domain() })
  const base = await svc.bases.create({ name: '演示库', description: '' })
  const material = codeMaterial({
    kind: 'code.module',
    module: 'order',
    path: 'src/order/status.ts',
    enums: [{ fqn: 'OrderStatus', members: [{ value: 'PAID', label: '已支付' }, { value: 'CLOSED', label: '已关闭' }] }],
    mappings: [{ from: 'statusCode', to: 'ca_fee_order.order_status' }],
    flows: [{ machine: 'pay', transitions: [{ from: 'INIT', to: 'PAID', trigger: 'pay' }] }],
  }, { knowledgeBaseId: base.id })
  await svc.materials.capture(material)
  const result = await svc.compile({ knowledgeBaseId: base.id })
  assert.equal(result.decided, 1)
  const resolved = svc.resolve('OrderStatus', { knowledgeBaseId: base.id })
  assert.ok(resolved.hits.some((hit) => hit.objectKind === 'enum' && hit.display === 'OrderStatus'))
  assert.ok(svc.resolve('已支付', { knowledgeBaseId: base.id }).hits.some((hit) => hit.facet === 'value'))
  assert.ok(svc.listCanonical(base.id).some((row) => row.kind === 'mapping'))
  assert.ok(svc.listCanonical(base.id).some((row) => row.kind === 'process' && row.title === 'pay'))
})

test('doc material compiles glossary terms into proposed concepts', async () => {
  const svc = createWikiService({ domain: domain() })
  const base = await svc.bases.create({ name: '演示库', description: '' })
  const material = docMaterial({
    kind: 'doc.artifact',
    title: '订单术语表',
    docUri: 'docs/glossary.md',
    subtype: 'glossary',
    definitions: [{
      term: '确权',
      aliases: ['资产确权'],
      text: '核心企业确认应付责任',
      fieldHints: ['ca_fee_order.confirm_status'],
    }],
    processes: [{
      name: '融资申请',
      steps: [{ activity: '提交申请', seq: 1, role: '供应商' }, { activity: '审批', seq: 2, role: '资金方' }],
    }],
  }, { knowledgeBaseId: base.id })
  await svc.materials.capture(material)
  const result = await svc.compile({ knowledgeBaseId: base.id })
  assert.equal(result.decided, 1)
  const resolved = svc.resolve('确权', { knowledgeBaseId: base.id })
  assert.ok(resolved.hits.some((hit) => hit.facet === 'biz_label' && hit.caliber === 'proposed'))
  assert.ok(svc.resolve('融资申请', { knowledgeBaseId: base.id }).hits.some((hit) => hit.facet === 'process'))
  const cov = svc.coverage(base.id)
  assert.ok((cov.items ?? []).some((item) => item.severity === 'term_proposed'))
})

test('bound pack expands domains and aligns doc concepts', async () => {
  const svc = createWikiService({ domain: domain() })
  const base = await svc.bases.create({ name: '演示库', description: '' })
  await svc.bases.setPacks(base.id, ['scf'])
  const material = docMaterial({
    kind: 'doc.artifact',
    title: '术语',
    docUri: 'docs/g.md',
    subtype: 'glossary',
    definitions: [{ term: '确权', aliases: ['资产确权'], text: '确认应付' }],
  }, { knowledgeBaseId: base.id })
  await svc.materials.capture(material)
  await svc.compile({ knowledgeBaseId: base.id })
  assert.ok(svc.listCanonical(base.id).some((row) => row.kind === 'domain' && row.title === '确权'))
  assert.ok(svc.resolve('确权', { knowledgeBaseId: base.id, facets: ['domain', 'biz_label'] }).hits.length >= 1)
  const cov = svc.coverage(base.id)
  assert.ok((cov.items ?? []).some((item) => item.severity === 'pack_cq'))
  assert.ok(svc.resolve('确权', { knowledgeBaseId: base.id }).hits.some((hit) => (
    hit.objectKind === 'concept' && (hit.neighbors ?? []).some((n) => n.rel === 'same_as')
  )))
})

test('label deposit compiles into a proposed value hit and open proposal', async () => {
  const svc = createWikiService({ domain: domain() })
  const base = await svc.bases.create({ name: '演示库', description: '' })
  const deposited = toRawMaterial({
    kind: 'label_corrected',
    field: 'ca_fee_order.order_status',
    value: 'PAIDING',
    label: '待支付',
  }, { sessionId: 'sess_1' })
  assert.equal(deposited.ok, true, deposited.reason)
  await svc.materials.capture({ ...deposited.material, knowledgeBaseId: base.id })
  const result = await svc.compile({ knowledgeBaseId: base.id })
  assert.equal(result.decided, 1)
  assert.ok(svc.resolve('待支付', { knowledgeBaseId: base.id }).hits.some((hit) => hit.facet === 'value'))
  assert.ok(svc.proposals(base.id).some((item) => item.kind === 'label' && item.status === 'open'))
})

test('deposit sql compiles into an accepted case hit', async () => {
  const svc = createWikiService({ domain: domain() })
  const base = await svc.bases.create({ name: '演示库', description: '', datasourceIds: [1] })
  const deposited = toRawMaterial({
    kind: 'sql_confirmed',
    executed: true,
    rowCount: 3,
    sql: 'SELECT order_status FROM ca_fee_order',
    question: '订单状态有哪些',
    fields: ['ca_fee_order.order_status'],
  }, { datasourceId: 1, sessionId: 'sess_1' })
  assert.equal(deposited.ok, true, deposited.reason)
  await svc.materials.capture({ ...deposited.material, knowledgeBaseId: base.id })
  const result = await svc.compile({ knowledgeBaseId: base.id })
  assert.equal(result.decided, 1)
  const resolved = svc.resolve('订单状态有哪些', { knowledgeBaseId: base.id })
  assert.ok(resolved.hits.some((hit) => hit.facet === 'case' && hit.caliber === 'accepted'))
  assert.ok(svc.listCanonical(base.id).some((row) => row.kind === 'case'))
})

test('profile-only refresh reprojects without requiring page decisions', async () => {
  const svc = createWikiService({ domain: domain() })
  const base = await svc.bases.create({ name: '演示库', description: '', datasourceIds: [1] })
  const first = evidence(2)
  const built1 = buildDbAssertions(first)
  await svc.materials.capture({
    sourceType: 'db', sourceRef: 'db:ds1/ca_fee_order', datasourceId: 1, knowledgeBaseId: base.id,
    content: 'v1', evidence: first, ...built1,
  })
  await svc.compile({ knowledgeBaseId: base.id })
  const second = evidence(9)
  const built2 = buildDbAssertions(second)
  assert.equal(built1.structureHash, built2.structureHash)
  assert.notEqual(built1.profileHash, built2.profileHash)
  const again = await svc.materials.capture({
    sourceType: 'db', sourceRef: 'db:ds1/ca_fee_order', datasourceId: 1, knowledgeBaseId: base.id,
    content: 'v2-profile', evidence: second, ...built2,
  })
  assert.equal(again.created, false)
  const material = svc.materials.get(again.id)
  assert.equal(material.status, 'captured')
  assert.equal(material.refreshKind, 'profile')
  const result = await svc.compile({ knowledgeBaseId: base.id })
  assert.equal(result.decided, 1)
  assert.equal(svc.materials.get(again.id).status, 'decided')
  assert.equal(svc.materials.get(again.id).refreshKind, undefined)
})

test('identical collect reopen clears decided without profile shortcut', async () => {
  const svc = createWikiService({ domain: domain() })
  const base = await svc.bases.create({ name: '演示库', description: '', datasourceIds: [1] })
  const first = evidence(2)
  const built = buildDbAssertions(first)
  const captured = await svc.materials.capture({
    sourceType: 'db', sourceRef: 'db:ds1/ca_fee_order', datasourceId: 1, knowledgeBaseId: base.id,
    content: 'same', evidence: first, ...built,
  })
  await svc.compile({ knowledgeBaseId: base.id })
  assert.equal(svc.materials.get(captured.id).status, 'decided')
  const again = await svc.materials.capture({
    sourceType: 'db', sourceRef: 'db:ds1/ca_fee_order', datasourceId: 1, knowledgeBaseId: base.id,
    content: 'same', evidence: first, ...built,
  })
  assert.equal(again.reopened, true)
  assert.equal(svc.materials.get(again.id).status, 'captured')
  assert.equal(svc.materials.get(again.id).refreshKind, undefined)
})

test('accepting a relation review upgrades assoc caliber; rejecting keeps proposed', async () => {
  const svc = createWikiService({ domain: domain() })
  const base = await svc.bases.create({ name: '演示库', description: '', datasourceIds: [1] })
  const withReview = {
    ...evidence(2),
    relations: [{
      kind: 'directed', fromTable: 'ca_fee_order', fromColumn: 'project_id', toTable: 'project', toColumn: 'id',
      containment: 0.62, reverseContainment: 0.2, jaccard: 0.18, fromDistinct: 30, toDistinct: 80, toUniqueness: 1,
      verdict: 'review', reason: '包含率 62.0%，未达到外键阈值',
    }],
  }
  const built = buildDbAssertions(withReview)
  await svc.materials.capture({
    sourceType: 'db', sourceRef: 'db:ds1/ca_fee_order', datasourceId: 1, knowledgeBaseId: base.id,
    content: '表', evidence: withReview, ...built,
  })
  await svc.compile({ knowledgeBaseId: base.id })
  const proposal = svc.proposals(base.id).find((item) => item.kind === 'review' && item.status === 'open')
  assert.ok(proposal?.objectId)
  const objectId = proposal.objectId
  assert.equal(svc.listCanonical(base.id).find((row) => row.id === objectId)?.caliber, 'proposed')
  assert.ok(svc.resolve('project_id', { knowledgeBaseId: base.id, facets: ['assoc'] }).hits.some((hit) => hit.caliber === 'proposed'))

  await svc.resolveProposal(proposal.id, 'accepted')
  assert.equal(svc.listCanonical(base.id).find((row) => row.id === objectId)?.caliber, 'accepted')
  assert.ok(svc.resolve('project_id', { knowledgeBaseId: base.id, facets: ['assoc'] }).hits.some((hit) => (
    hit.objectId === objectId && hit.caliber === 'accepted'
  )))
  assert.equal(svc.page(proposal.slug, base.id)?.status, 'published')

  const base2 = await svc.bases.create({ name: '拒审库', description: '', datasourceIds: [1] })
  await svc.materials.capture({
    sourceType: 'db', sourceRef: 'db:ds1/ca_fee_order', datasourceId: 1, knowledgeBaseId: base2.id,
    content: '表', evidence: withReview, ...built,
  })
  await svc.compile({ knowledgeBaseId: base2.id })
  const rejected = svc.proposals(base2.id).find((item) => item.kind === 'review' && item.status === 'open')
  const rejectedId = rejected.objectId
  await svc.resolveProposal(rejected.id, 'rejected')
  const obj = svc.listCanonical(base2.id).find((row) => row.id === rejectedId)
  assert.equal(obj?.caliber, 'proposed')
  assert.equal(obj?.reviewStatus, 'rejected')
  assert.equal(svc.pages(base2.id).some((page) => page.slug === rejected.slug), false)
})

test('removing a knowledge base cascades pages proposals materials and projections', async () => {
  const svc = createWikiService({ domain: domain() })
  const base = await svc.bases.create({ name: '演示库', description: '', datasourceIds: [1] })
  const built = buildDbAssertions(evidence(2))
  await svc.materials.capture({
    sourceType: 'db', sourceRef: 'db:ds1/ca_fee_order', datasourceId: 1, knowledgeBaseId: base.id,
    content: '表', evidence: evidence(2), ...built,
  })
  await svc.compile({ knowledgeBaseId: base.id })
  assert.ok(svc.pages(base.id).length > 0)
  assert.ok(svc.listMaterials(base.id).length > 0)
  assert.ok(svc.listCanonical(base.id).length > 0)
  await svc.bases.remove(base.id)
  assert.equal(svc.bases.get(base.id), undefined)
  assert.equal(svc.pages(base.id).length, 0)
  assert.equal(svc.proposals(base.id).length, 0)
  assert.equal(svc.listMaterials(base.id).length, 0)
  assert.equal(svc.listCanonical(base.id).length, 0)
  assert.deepEqual(svc.coverage(base.id).items ?? [], [])
})

test('startup orphan reconcile drops proposals for missing bases', async () => {
  const shared = domain()
  const svc = createWikiService({ domain: shared })
  const base = await svc.bases.create({ name: '临时库', description: '' })
  const captured = await svc.materials.capture({
    sourceType: 'db', sourceRef: 'db:ds1/orphan', datasourceId: 1, knowledgeBaseId: base.id,
    content: 'orphan', evidence: {},
  })
  const decided = await svc.decide({
    schemaVersion: 1, action: 'new', slug: 'relation/orphan_link', pageType: 'relation',
    confidence: 0.6, rationale: '采样', evidenceRefs: [captured.id], body: '# orphan\n\n待核。\n',
    review: {
      reasons: ['采样'],
      objectId: `tech_rel:${base.id}:a.id->b.id`,
      publish: {
        schemaVersion: 1, action: 'new', slug: 'relation/orphan_link', pageType: 'relation',
        confidence: 0.95, rationale: '采样', evidenceRefs: [captured.id], body: '# orphan\n\n待核。\n',
      },
    },
  }, { source: 'pipeline', decisionId: 'dec_orphan', knowledgeBaseId: base.id })
  assert.equal(decided.outcome, 'proposal')
  assert.equal(svc.proposals(base.id).length, 1)
  // 直接删 base 行模拟旧版未级联残留
  await shared.table('bases').delete(base.id)
  assert.equal(svc.proposals().filter((item) => item.knowledgeBaseId === base.id).length, 1)
  const cleaned = await svc.reconcileOrphans()
  assert.ok(cleaned.proposals >= 1)
  assert.ok(cleaned.materials >= 1)
  assert.equal(svc.proposals().filter((item) => item.knowledgeBaseId === base.id).length, 0)
  assert.equal(svc.listMaterials().filter((item) => item.knowledgeBaseId === base.id).length, 0)
})
