/** 合法样例：每个对象一份，测试以浅拷贝派生非法样例。 */
export const iso = '2026-10-16T10:00:00+08:00'
export const sha = 'a'.repeat(64)

export const material = {
  schemaVersion: 1,
  id: 'raw_abc123',
  sourceType: 'db',
  sourceRef: 'postgres:ds3/public.ca_fee_order.order_status',
  datasourceId: 3,
  content: '字段 order_status 为订单状态，取值 PAID（已缴费）、CLOSED（已关闭）。',
  contentHash: '',
  evidence: { rowCount: 50, nullCount: 0, distinctCount: 2, topK: [{ value: 'PAID', count: 30 }] },
  status: 'captured',
  decisionId: null,
  createdAt: iso,
}

export const decisionNew = {
  schemaVersion: 1,
  action: 'new',
  slug: 'entity/ca_fee_order',
  pageType: 'entity',
  confidence: 0.9,
  rationale: '表页注释覆盖率高，字段语义明确',
  evidenceRefs: ['raw_abc123'],
  body: '# ca_fee_order\n\n订单表，关联 [[entity/cust_account_info]]。',
}

export const decisionUpdate = {
  schemaVersion: 1,
  action: 'update',
  slug: 'concept/order_status',
  confidence: 0.7,
  rationale: '补充码值 CLOSED',
  evidenceRefs: ['raw_abc123'],
  body: null,
  patch: { upsert: { CLOSED: '已关闭' }, remove: [] },
}

export const decisionDelete = {
  schemaVersion: 1,
  action: 'delete',
  slug: 'summary/legacy_import',
  confidence: 0.95,
  rationale: '源表已下线',
  evidenceRefs: ['raw_abc123'],
  body: null,
}

export const page = {
  schemaVersion: 1,
  slug: 'entity/ca_fee_order',
  pageType: 'entity',
  title: 'ca_fee_order',
  status: 'published',
  version: 2,
  published: {
    summary: '订单表',
    body: '# ca_fee_order\n\n见 [[concept/order_status]]。',
    confidence: 0.9,
    aliases: ['订单'],
    sources: ['raw_abc123'],
    editSource: 'pipeline',
    editedAt: iso,
  },
  draft: null,
  links: ['concept/order_status'],
  backlinks: [],
}

export const memoryItem = {
  id: 'mem_1',
  subjectId: 'tenant:1|user:alice',
  kind: 'preference',
  status: 'active',
  origin: 'explicit',
  content: '回答默认用中文，表格金额单位为元',
  topic: '回答语言',
  confidence: 1,
  supersedes: null,
  sourceConversationId: 'conv_1',
  createdAt: iso,
}

export const policyOverride = {
  query: { output: { chart: 'off' } },
  memory: { autoExtract: true },
}
