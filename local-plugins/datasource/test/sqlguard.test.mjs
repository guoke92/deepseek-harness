import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkReadonlySql as guard } from '../src/sqlguard.js'

const allowed = (sql, dialect = 'postgresql', opts = {}) => {
  const r = guard(sql, { dialect, ...opts })
  assert.equal(r.ok, true, `expected allow for ${sql}: ${r.reason}`)
  return r
}
const denied = (sql, dialect = 'postgresql', opts = {}) => {
  const r = guard(sql, { dialect, ...opts })
  assert.equal(r.ok, false, `expected deny for ${sql}`)
  return r
}

test('# is a bitwise operator in PostgreSQL and a comment in MySQL; the guard never truncates', () => {
  const pg = allowed('select 5 # 3 as bitxor', 'postgresql')
  assert.equal(pg.sql, 'select 5 # 3 as bitxor')
  allowed('select 5 # 3 as bitxor', 'mysql')
})

test('-- inside a string literal is not a comment', () => {
  allowed("select '--x' as v from t", 'postgresql')
  allowed("select '--x' as v from t", 'mysql')
})

test('keywords inside string literals and identifiers are not write operations', () => {
  allowed("select 'delete me' as v from t")
  allowed('SELECT "update" FROM t')
  allowed("select 'a''b' from t")
  allowed("select 'it''s update' from t")
})

test('load, lock, replace used as column names or function calls are allowed in MySQL', () => {
  allowed('select load, lock, replace from t', 'mysql')
  allowed("select replace(name, 'a', 'b') from t", 'mysql')
})

test('writes are rejected at statement start and inside CTEs or subqueries', () => {
  denied('delete from t')
  denied('update t set a = 1')
  denied('with x as (select 1) delete from t')
  denied('select * from (delete from t)')
  denied('select 1 for update')
  denied('lock table t')
})

test('multiple statements are rejected; a trailing semicolon is allowed', () => {
  denied('select * from t; drop table t')
  allowed('select * from t;')
})

test('comments do not hide a write; a block comment containing a keyword is ignored', () => {
  allowed('select * from t /* drop */ where a=1')
  denied('/* x */ delete from t')
})

test('INTO OUTFILE and dangerous PostgreSQL functions are rejected', () => {
  denied('select 1 into outfile "/tmp/x"', 'mysql')
  denied("select pg_read_file('/etc/passwd')")
})

test('unterminated literals and backticks in PostgreSQL fail loud', () => {
  denied("select 'unterminated from t")
  denied('select `x` from t', 'postgresql')
})

test('forbidden tables are matched case-insensitively and across schema qualifiers', () => {
  denied('select * from ca_fee_order', 'postgresql', { forbiddenTables: ['CA_FEE_ORDER'] })
  denied('select * from public.secret_t', 'postgresql', { forbiddenTables: ['secret_t'] })
  allowed('select * from public.other_t', 'postgresql', { forbiddenTables: ['secret_t'] })
})

test('forbidden columns are rejected when referenced', () => {
  denied('select id, phone from cust', 'postgresql', { forbiddenColumns: ['phone'] })
  allowed('select id from cust', 'postgresql', { forbiddenColumns: ['phone'] })
})

test('WITH ... SELECT is allowed; empty input and unknown dialects are rejected', () => {
  allowed('with x as (select 1 as a) select a from x')
  denied('')
  denied('   ')
  denied('select 1', 'oracle')
})
