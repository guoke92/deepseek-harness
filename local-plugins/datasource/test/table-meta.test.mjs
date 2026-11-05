import { test } from 'node:test'
import assert from 'node:assert/strict'
import { groupTableMeta } from '../src/table-meta.js'

test('columns, primary key, foreign key and index group onto one table', () => {
  const tables = groupTableMeta(
    [
      { tableKey: 'ca_fee_order', name: 'id', dataType: 'bigint', nullable: false, comment: '主键', ordinal: 1, primary: true, tableComment: '年费订单' },
      { tableKey: 'ca_fee_order', name: 'company_id', dataType: 'bigint', nullable: true, comment: null, ordinal: 2, primary: false, tableComment: '年费订单' },
    ],
    [
      { tableKey: 'ca_fee_order', column: 'company_id', refTable: 'ca_fee_company', refColumn: 'id', constraint: 'fk_company', ordinal: 1 },
    ],
    [
      { tableKey: 'ca_fee_order', name: 'idx_company', unique: false, column: 'company_id', seq: 1 },
    ],
  )
  assert.equal(tables.length, 1)
  assert.deepEqual(tables[0].primaryKey, ['id'])
  assert.equal(tables[0].comment, '年费订单')
  assert.deepEqual(tables[0].foreignKeys, [{ columns: ['company_id'], refTable: 'ca_fee_company', refColumns: ['id'] }])
  assert.deepEqual(tables[0].indexes, [{ name: 'idx_company', unique: false, columns: ['company_id'] }])
})
