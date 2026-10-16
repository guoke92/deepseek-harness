/**
 * 固定原料回放：从 corpus 的真实库采集（只读）取得原料，再用确定性决策替身跑 wiki 流水线。
 * 决策规则是固定表（不是启发式评分）：按原料 sourceRef 决定 action 与 confidence。
 * 用法：node scripts/replay-corpus.mjs <corpusRoot> <pgConnectionJson>
 */
import { createRequire } from 'node:module'
const corpusRoot = process.argv[2]
const conn = JSON.parse(process.argv[3])
const require = createRequire(corpusRoot + '/package.json')
const { createCorpusService } = await import(corpusRoot + '/src/service.js')
const { createWikiService, createMemoryTable } = await import('../src/index.js')

function memDomain() {
  const tables = new Map()
  return { table(n) { if (!tables.has(n)) tables.set(n, createMemoryTable()); return tables.get(n) } }
}
let tick = 0
const now = () => new Date(Date.parse('2026-10-16T10:00:00+08:00') + tick++ * 1000).toISOString()

const corpusDomain = memDomain()
const corpus = await createCorpusService({ domain: corpusDomain, keyPath: '/tmp/replay-' + process.pid + '/secret.key' })
const ds = await corpus.datasources.add({ ...conn, name: 'replay-ds' })
const collected = await corpus.collect(ds.id, { policy: { profileSampleRows: 10000, minhashK: 128, dictDistinctMax: 32, highDefaultRatio: 0.05 } })
const materials = corpus.materials.list().map((m) => ({ id: m.id, sourceRef: m.sourceRef, content: m.content, status: 'captured' }))

// 固定决策表：按 sourceRef 中的表.列 决定 slug 与置信度（人工确定的替身，非模型评分）
function scripted(material) {
  const ref = material.sourceRef.split('/public.')[1] ?? material.sourceRef
  const [table, column] = ref.split('.')
  if (!column) {
    return [{ schemaVersion: 1, action: 'new', slug: `entity/${table}`, pageType: 'entity', confidence: 0.9,
      rationale: '表级剖析，注释覆盖', evidenceRefs: [material.id], body: `# ${table}\n\n来自原料 ${material.id}。` }]
  }
  if (column === 'status') {
    return [{ schemaVersion: 1, action: 'new', slug: `concept/${table}_${column}`, pageType: 'concept', confidence: 0.6,
      rationale: '低基数码表，待确认', evidenceRefs: [material.id], body: `# ${table}.${column}\n\n## 条目\n- PAID：已缴费` }]
  }
  if (column === 'name') {
    return [{ schemaVersion: 1, action: 'delete', slug: `entity/${table}`, confidence: 0.95, rationale: '样例数据，疑似下线', evidenceRefs: [material.id], body: null }]
  }
  return [{ schemaVersion: 1, action: 'new', slug: `concept/${table}_${column}`, pageType: 'concept', confidence: 0.4,
    rationale: '证据不足', evidenceRefs: [material.id], body: `# ${column}` }]
}

const wiki = await createWikiService({ domain: memDomain(), now })
const result = await wiki.decideMaterials(materials, {
  decide: async ([m]) => scripted(m),
  context: () => ({}),
  materials: { transition: async () => {} },
})
const pages = wiki.pages().map((p) => ({ slug: p.slug, status: p.status, version: p.version, links: p.links }))
console.log(JSON.stringify({
  collected: { captured: collected.captured, dicts: collected.dicts },
  replay: { decided: result.decided, failed: result.failed },
  pages,
  proposals: wiki.proposals().map((p) => ({ slug: p.slug, kind: p.kind, status: p.status })),
  lint: wiki.lint(),
}, null, 2))
