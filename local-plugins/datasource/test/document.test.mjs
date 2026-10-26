import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sketch } from '../src/minhash.js'
import { buildTableFacts, discoverRelations, evidenceFor, judgeRelation, judgeOverlap, declaredEndpoints } from '../src/document.js'
import { tableMaterial } from '../src/deliver.js'
import { validateMaterialInput } from '@local/contracts'

const rows = Array.from({ length: 24 }, (_, index) => {
  const slot = index % 6
  return {
    id: `9000000000000000${String(100 + index)}`,
    order_status: ['PAID', 'PAID', 'CLOSED', 'CLOSED', 'OPEN', 'OPEN'][slot],
    close_reason: ['用户取消', '用户取消', '已完成', '已完成', '超时', '超时'][slot],
    annual_fee: ['1.50', '2.50', '3.50', '4.50', '5.50', '6.50'][slot],
    company_name: `公司${index}`,
    region: index % 2 === 0 ? 'north campus building' : 'south campus building',
    mobile: index === 0 ? null : '13800138000',
  }
})

const meta = {
  tableKey: 'ca_fee_order',
  comment: '年费订单',
  rowCount: rows.length,
  primaryKey: ['id'],
  foreignKeys: [],
  indexes: [],
  columns: [
    { name: 'id', dataType: 'bigint', nullable: false, comment: '主键' },
    { name: 'order_status', dataType: 'varchar(16)', nullable: false, comment: '订单状态' },
    { name: 'close_reason', dataType: 'varchar(32)', nullable: true, comment: '关闭原因' },
    { name: 'annual_fee', dataType: 'decimal(10,2)', nullable: true, comment: '年费' },
    { name: 'company_name', dataType: 'varchar(64)', nullable: true, comment: '企业名称' },
    { name: 'region', dataType: 'varchar(64)', nullable: true, comment: '园区' },
    { name: 'mobile', dataType: 'varchar(20)', nullable: true, comment: '手机' },
  ],
}

test('one table sample becomes a document without dumping identifiers, names or phone numbers', () => {
  const facts = buildTableFacts(meta, { rows, sampleMode: 'latest-by-primary-key' }, { dictDistinctMax: 32, minhashK: 32 })
  const evidence = evidenceFor(facts, [], [])
  const material = tableMaterial(evidence, 3)
  assert.equal(material.sourceRef, 'db:ds3/ca_fee_order')
  assert.equal(validateMaterialInput(material).ok, true, validateMaterialInput(material).errors.join('; '))
  const byName = Object.fromEntries(evidence.columns.map((column) => [column.name, column]))
  assert.equal(byName.id.domain.kind, 'range')
  assert.equal(byName.id.cardinality, 24)
  assert.equal(byName.id.selectivity, 1)
  assert.equal(byName.id.nullRate, 0)
  assert.equal(byName.mobile.cardinality, null)
  assert.equal(byName.mobile.nullRate, 0.0417)
  assert.equal(byName.id.domain.min, '9000000000000000100')
  assert.equal(byName.id.domain.max, '9000000000000000123')
  assert.equal(byName.order_status.dictionary, true)
  assert.equal(byName.close_reason.dictionary, true)
  assert.ok(byName.close_reason.domain.values.some((item) => item.value === '用户取消'))
  assert.equal(byName.annual_fee.dictionary, false)
  assert.equal(byName.annual_fee.domain.kind, 'range')
  assert.equal(byName.company_name.domain.kind, 'summary')
  assert.equal(byName.region.dictionary, false)
  assert.equal(byName.region.domain.kind, 'values')
  assert.equal(byName.mobile.domain.kind, 'redacted')
  const packed = JSON.stringify(evidence) + material.content
  assert.equal(packed.includes('9000000000000000110'), false)
  assert.equal(packed.includes('13800138000'), false)
  assert.equal(packed.includes('公司1'), false)
  assert.match(material.content, /订单状态/)
  assert.match(material.content, /字典/)
  assert.match(material.content, /north campus building/)
  assert.doesNotMatch(material.content, /用户取消/)
  assert.doesNotMatch(material.content, /## 术语/)
  assert.doesNotMatch(material.content, /高频值/)
})

test('time columns are not relation keys', () => {
  const dated = Array.from({ length: 30 }, (_, index) => ({
    id: String(index + 1),
    create_time: `2024-01-${String((index % 28) + 1).padStart(2, '0')} 00:00:00`,
  }))
  const facts = buildTableFacts({
    tableKey: 'orders',
    comment: null,
    rowCount: dated.length,
    primaryKey: ['id'],
    indexes: [],
    foreignKeys: [],
    columns: [
      { name: 'id', dataType: 'bigint', nullable: false, comment: '主键' },
      { name: 'create_time', dataType: 'datetime', nullable: false, comment: '创建时间' },
    ],
  }, { rows: dated, sampleMode: 'physical-prefix' }, { minhashK: 16 })
  assert.equal(facts.columns.find((column) => column.name === 'create_time').role, 'time')
  assert.equal(facts.keys.some((key) => key.column === 'create_time'), false)
})

test('a tiny table does not mint dictionaries or relation keys', () => {
  const tinyRows = [0, 1, 2, 3].map((index) => ({
    id: String(index + 1),
    order_status: index % 2 === 0 ? 'PAID' : 'CLOSED',
    company_id: '1',
  }))
  const tiny = buildTableFacts({
    ...meta,
    rowCount: tinyRows.length,
    columns: [
      { name: 'id', dataType: 'bigint', nullable: false, comment: '主键' },
      { name: 'order_status', dataType: 'varchar(16)', nullable: false, comment: '订单状态' },
      { name: 'company_id', dataType: 'bigint', nullable: true, comment: '企业' },
    ],
  }, { rows: tinyRows, sampleMode: 'physical-prefix' }, { dictDistinctMax: 32, minhashK: 16 })
  const status = tiny.columns.find((column) => column.name === 'order_status')
  assert.equal(status.dictionary, false)
  assert.equal(status.domain.note, 'sample-small')
  assert.equal(tiny.keys.length, 0)
  const empty = buildTableFacts({ ...meta, rowCount: 0 }, { rows: [], sampleMode: 'physical-prefix' })
  assert.equal(empty.columns.every((column) => column.dictionary === false && column.domain.note === 'empty'), true)
})

test('containment against a key is directed, id against id is skipped, and a declared foreign key is not inferred again', () => {
  const child = { table: 'ca_fee_order', column: 'company_id', distinct: 30, nonNull: 80, uniqueness: 0.375, bareId: false }
  const parent = { table: 'ca_fee_company', column: 'id', distinct: 100, nonNull: 100, uniqueness: 1, bareId: true }
  const directed = judgeRelation(child, parent, 0.5)
  assert.equal(directed.kind, 'directed')
  assert.equal(directed.verdict, 'accepted')
  assert.equal(directed.fromColumn, 'company_id')
  assert.equal(directed.toColumn, 'id')
  const weak = judgeRelation(child, parent, 0.16)
  assert.equal(weak.verdict, 'review')
  const crowded = judgeRelation(
    { table: 'ca_fee_company', column: 'source_project_id', distinct: 41, uniqueness: 0.04 },
    { table: 'ca_fee_order', column: 'project_id', distinct: 42, uniqueness: 0.03 },
    0.98,
  )
  assert.equal(crowded.verdict, 'review')
  assert.equal(crowded.hold, 'overlap-small')
  assert.match(crowded.holdText, /少于 50/)
  const none = judgeRelation(child, parent, 0.01)
  assert.equal(none, null)

  const ids = Array.from({ length: 100 }, (_, index) => String(index + 1))
  const childIds = ids.slice(0, 30)
  const keys = [
    { ...parent, mins: sketch(ids, 64) },
    { ...child, mins: sketch(childIds, 64) },
    { table: 'other', column: 'id', distinct: 100, nonNull: 100, uniqueness: 1, bareId: true, mins: sketch(ids, 64) },
  ]
  const found = discoverRelations(keys)
  assert.equal(found.some((rel) => rel.fromColumn === 'id' && rel.toColumn === 'id'), false)
  assert.equal(found.some((rel) => rel.fromColumn === 'company_id' && rel.toColumn === 'id' && rel.verdict === 'accepted'), true)
  const declared = [{ fromTable: 'ca_fee_order', fromColumn: 'company_id', toTable: 'ca_fee_company', toColumn: 'id' }]
  const skipped = discoverRelations(keys, declared)
  assert.equal(skipped.some((rel) => rel.toTable === 'ca_fee_company' && rel.fromColumn === 'company_id'), false)
  const tiny = { table: 'tiny', column: 'company_id', distinct: 25, nonNull: 25, uniqueness: 1, bareId: false, rowCount: 3, mins: sketch(['1'], 64) }
  assert.equal(discoverRelations([...keys, tiny]).some((rel) => rel.fromTable === 'tiny' || rel.toTable === 'tiny'), false)
})

test('complete samples compare the value sets themselves', () => {
  const ids = Array.from({ length: 100 }, (_, index) => String(index + 1))
  const found = discoverRelations([
    { table: 'ca_fee_company', column: 'id', distinct: 100, nonNull: 100, uniqueness: 1, bareId: true, rowCount: 100, values: ids },
    { table: 'ca_fee_order', column: 'company_id', distinct: 30, nonNull: 80, uniqueness: 0.375, bareId: false, rowCount: 80, values: ids.slice(0, 30) },
  ])
  assert.equal(found.length, 1)
  assert.equal(found[0].kind, 'directed')
  assert.equal(found[0].verdict, 'accepted')
  assert.equal(found[0].fromColumn, 'company_id')
  const partial = discoverRelations([
    { table: 'cust_company_info', column: 'id', distinct: 10000, nonNull: 10000, uniqueness: 1, bareId: true, rowCount: 95252, partial: true, values: ids },
    { table: 'ca_fee_order', column: 'company_id', distinct: 30, nonNull: 80, uniqueness: 0.375, bareId: false, rowCount: 80, values: ids.slice(0, 30) },
  ])
  assert.equal(partial.length, 0)
  const probed = judgeOverlap(
    { table: 'ca_fee_order', column: 'company_id', distinct: 30, nonNull: 80, uniqueness: 0.375, bareId: false, rowCount: 1583 },
    { table: 'cust_company_info', column: 'id', distinct: 90000, nonNull: 95252, uniqueness: 0.94, bareId: true, rowCount: 95252 },
    28,
  )
  assert.equal(probed.kind, 'directed')
  assert.equal(probed.fromColumn, 'company_id')
  assert.equal(probed.toColumn, 'id')
})

test('audit actors and lock versions are not listed, certificate types keep their values', () => {
  const sampled = Array.from({ length: 24 }, (_, index) => ({
    id: String(index + 1),
    create_by: index % 5 === 0 ? '1000000000000000019' : String(index % 5),
    create_user: ['甲', '乙', '丙', '丁'][index % 4],
    version: String(index % 3),
    legal_certification_type: ['ID_CARD', 'PASSPORT'][index % 2],
  }))
  const facts = buildTableFacts({
    tableKey: 'cust_company_info',
    comment: null,
    rowCount: sampled.length,
    primaryKey: ['id'],
    indexes: [],
    foreignKeys: [],
    columns: [
      { name: 'id', dataType: 'bigint', nullable: false, comment: '主键' },
      { name: 'create_by', dataType: 'varchar(100)', nullable: true, comment: '创建人id' },
      { name: 'create_user', dataType: 'varchar(100)', nullable: true, comment: '创建人名称' },
      { name: 'version', dataType: 'int', nullable: false, comment: '乐观锁版本号' },
      { name: 'legal_certification_type', dataType: 'varchar(64)', nullable: true, comment: '法人证件类型' },
    ],
  }, { rows: sampled, sampleMode: 'physical-prefix' }, { dictDistinctMax: 32, minhashK: 16 })
  const byName = Object.fromEntries(facts.columns.map((column) => [column.name, column]))
  assert.equal(byName.create_by.dictionary, false)
  assert.equal(byName.create_by.domain.kind, 'range')
  assert.equal(byName.create_user.dictionary, false)
  assert.equal(byName.create_user.domain.kind, 'summary')
  assert.equal(byName.version.dictionary, false)
  assert.equal(byName.version.domain.kind, 'range')
  assert.equal(byName.legal_certification_type.dictionary, true)
  assert.equal(byName.legal_certification_type.domain.kind, 'values')
  assert.equal(byName.legal_certification_type.domain.values.length, 2)
})

test('declared foreign keys are attached to both endpoints', () => {
  const order = buildTableFacts(meta, { rows, sampleMode: 'physical-prefix' }, { minhashK: 16 })
  const company = buildTableFacts({
    ...meta,
    tableKey: 'ca_fee_company',
    columns: [{ name: 'id', dataType: 'bigint', nullable: false, comment: '主键' }],
    foreignKeys: [],
  }, { rows: rows.map((row) => ({ id: row.id })), sampleMode: 'physical-prefix' }, { minhashK: 16 })
  order.meta.foreignKeys = [{ columns: ['company_id'], refTable: 'ca_fee_company', refColumns: ['id'] }]
  const declared = declaredEndpoints([order, company])
  const evidence = evidenceFor(company, [], declared.foreignKeys)
  assert.equal(evidence.declaredForeignKeys.length, 1)
  assert.equal(evidence.declaredForeignKeys[0].fromTable, 'ca_fee_order')
})
