import { test } from 'node:test'
import assert from 'node:assert/strict'
import { tableMaterial } from '../src/deliver.js'
import { validateMaterialInput } from '@local/contracts'

test('a table document becomes one db material', () => {
  const evidence = {
    kind: 'db.table',
    table: 'ca_fee_order',
    comment: null,
    rowCount: 2,
    sampleRows: 2,
    sampleMode: 'physical-prefix',
    primaryKey: [],
    indexes: [],
    declaredForeignKeys: [],
    relations: [],
    terms: [],
    columns: [
      {
        name: 'order_status', dataType: 'varchar(16)', nullable: false, defaultValue: null, comment: '订单状态',
        role: 'enum', nullCount: 0, nonNullCount: 2, distinctCount: 2, distinctApprox: false, sampleRows: 2,
        domain: { kind: 'values', values: [{ value: 'PAID', count: 1, share: 0.5 }] }, dictionary: true,
      },
      {
        name: 'annual_fee', dataType: 'decimal(10,2)', nullable: true, defaultValue: null, comment: '年费',
        role: 'measure', nullCount: 0, nonNullCount: 2, distinctCount: 2, distinctApprox: false, sampleRows: 2,
        domain: { kind: 'range', min: '1', max: '2' }, dictionary: false,
      },
    ],
  }
  const material = tableMaterial(evidence, 3)
  assert.equal(material.sourceRef, 'db:ds3/ca_fee_order')
  assert.equal(validateMaterialInput(material).ok, true, validateMaterialInput(material).errors.join('; '))
  assert.match(material.content, /\| order_status \|/)
  assert.match(material.content, /\| annual_fee \|/)
  assert.match(material.content, /字典 \[\[concept\/ca_fee_order_order_status\]\]/)
  assert.match(material.content, /1 \.\. 2/)
  assert.match(material.content, /订单状态/)
})
