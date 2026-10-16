import { test } from 'node:test'
import assert from 'node:assert/strict'
import { groupCatalog, parseTableRef } from '../src/catalog.js'

test('catalog groups databases and skips system schemas', () => {
  const mysql = groupCatalog([
    { schema_name: 'app', table_name: 'orders' },
    { schema_name: 'billing', table_name: 'invoices' },
    { schema_name: 'mysql', table_name: 'user' },
    { schema_name: 'bad-name', table_name: 't' },
  ], { type: 'mysql', database: 'app' })
  assert.deepEqual(mysql.map((group) => group.id), ['app', 'billing'])
  assert.equal(mysql[0].tables[0].id, 'app.orders')

  const pg = groupCatalog([
    { schema_name: 'public', table_name: 'orders' },
    { schema_name: 'pg_catalog', table_name: 'pg_class' },
  ], { type: 'postgresql', database: 'analytics' })
  assert.equal(pg[0].id, 'analytics.public')
  assert.equal(pg[0].tables[0].id, 'analytics.public.orders')
})

test('the connection default database keeps the bare table key', () => {
  assert.equal(parseTableRef('app.orders', 'mysql', 'app').key, 'orders')
  assert.equal(parseTableRef('billing.invoices', 'mysql', 'app').key, 'billing.invoices')
  assert.equal(parseTableRef('analytics.public.orders', 'postgresql', 'analytics').key, 'orders')
  assert.equal(parseTableRef('analytics.audit.orders', 'postgresql', 'analytics').key, 'analytics.audit.orders')
  assert.throws(() => parseTableRef('app.bad-name', 'mysql', 'app'), /invalid table ref/)
})
