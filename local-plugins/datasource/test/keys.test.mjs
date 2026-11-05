import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createDatasourceRegistry } from '../src/datasources.js'
import { createSecretBox } from '../src/crypto.js'
import { randomBytes } from 'node:crypto'

/** 字符串键的存储表（与 storage domain 的 KV 语义一致：键只能是字符串）。 */
function stringKeyTable() {
  const rows = new Map()
  const key = (k) => {
    if (typeof k !== 'string') throw new TypeError(`key must be a string, got ${typeof k}`)
    return k
  }
  return {
    get: (k) => (rows.has(key(k)) ? structuredClone(rows.get(key(k))) : undefined),
    list: () => [...rows.values()].map((r) => structuredClone(r)),
    put: async (k, v) => { rows.set(key(k), structuredClone(v)) },
    delete: async (k) => rows.delete(key(k)),
  }
}

test('datasource written with a numeric id is found by connectionFor with the same numeric id', async () => {
  const reg = createDatasourceRegistry({ table: stringKeyTable(), sealer: createSecretBox(randomBytes(32)) })
  await reg.add({ name: 'x', type: 'postgresql', host: 'h', database: 'd', username: 'u', password: 'p' })
  const conn = reg.connectionFor(1)
  assert.ok(conn, 'connectionFor(1) must find the datasource written as id 1')
  assert.equal(conn.password, 'p')
})
