import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolvePolicy, clipOutline, buildQueryPrompt } from '../src/policy.js'
import { defaultPolicy } from '@local/contracts'

test('resolvePolicy: global only is validated and returned unchanged', () => {
  const r = resolvePolicy(defaultPolicy())
  assert.deepEqual(r.errors, [])
  assert.equal(r.policy.query.output.chart, 'auto')
})

test('resolvePolicy: datasource override applies only the differences', () => {
  const r = resolvePolicy(defaultPolicy(), { query: { output: { chart: 'off' } } })
  assert.deepEqual(r.errors, [])
  assert.equal(r.policy.query.output.chart, 'off')
  assert.equal(r.policy.query.output.tables, true)
})

test('resolvePolicy: an override that loosens safety is reported', () => {
  const r = resolvePolicy(defaultPolicy(), { query: { safety: { readonly: false } } })
  assert.ok(r.errors.length > 0)
})

test('clipOutline: keeps whole lines within the limit and marks truncation', () => {
  const text = ['第一行', '第二行', '第三行很长很长很长'].join('\n')
  const out = clipOutline(text, 10)
  assert.ok(out.includes('第一行'))
  assert.ok(!out.includes('第三行'))
  assert.match(out, /大纲已截断/)
  assert.equal(clipOutline('短', 100), '短')
})

test('buildQueryPrompt: includes outline only when preload is on, and reflects output policy', () => {
  const p = defaultPolicy()
  const with_ = buildQueryPrompt(p, { outline: '# 索引\n- [[tables/a]]' })
  assert.match(with_, /知识大纲/)
  assert.match(with_, /Markdown 表格/)
  const off = structuredClone(p)
  off.query.preload.wikiOutline = false
  assert.doesNotMatch(buildQueryPrompt(off, { outline: 'X' }), /知识大纲/)
})

test('buildQueryPrompt: draft caliber must be labelled; drafts disabled is stated', () => {
  const p = defaultPolicy()
  assert.match(buildQueryPrompt(p), /草稿口径，未审核/)
  const noDraft = structuredClone(p)
  noDraft.query.retrieval.includeDrafts = false
  assert.match(buildQueryPrompt(noDraft), /只来自已发布页面/)
})

test('buildQueryPrompt: safety constraints are always present and never loosened by text', () => {
  const p = defaultPolicy()
  p.query.safety.forbiddenTables = ['cust_secret']
  const t = buildQueryPrompt(p)
  assert.match(t, /只执行只读 SELECT/)
  assert.match(t, /禁止访问的表：cust_secret/)
  assert.match(t, /不得出现在回答中/)
})

test('buildQueryPrompt: clarify rules are rendered as policy, not hard-coded', () => {
  const p = defaultPolicy()
  p.query.clarify.requireWhen = ['统计口径未指定时间范围']
  p.query.clarify.maxQuestions = 1
  const t = buildQueryPrompt(p)
  assert.match(t, /统计口径未指定时间范围/)
  assert.match(t, /不超过 1 个问题/)
})
