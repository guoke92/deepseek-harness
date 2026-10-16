import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { createSecretBox, loadOrCreateKey } from '../src/crypto.js'
import { createDatasourceRegistry, validateDatasourceConfig, MASK } from '../src/datasources.js'

test('secret box round-trips and never returns the plaintext in the sealed form', () => {
  const box = createSecretBox(randomBytes(32))
  const sealed = box.seal('p@ss:word')
  assert.ok(!sealed.includes('p@ss'))
  assert.equal(box.open(sealed), 'p@ss:word')
  assert.notEqual(box.seal('same'), box.seal('same'))
})

test('a sealed value with a flipped byte fails authentication; a foreign key cannot open it', () => {
  const key = randomBytes(32)
  const box = createSecretBox(key)
  const sealed = box.seal('secret')
  const parts = sealed.split(':')
  const tampered = [parts[0], parts[1], parts[2], Buffer.from('xxxxxx').toString('base64url')].join(':')
  assert.throws(() => box.open(tampered))
  assert.throws(() => createSecretBox(randomBytes(32)).open(sealed))
  assert.throws(() => createSecretBox(key).open('v2:a:b:c'))
})

test('key must be 32 bytes', () => {
  assert.throws(() => createSecretBox(randomBytes(16)), /32 bytes/)
})

test('key file is created with mode 600 and reused; a looser mode is refused', async () => {
  const files = new Map()
  const modes = new Map()
  const dirs = []
  const fsImpl = {
    async mkdir(p) { dirs.push(p) },
    async stat(p) {
      if (!files.has(p)) { const e = new Error('nope'); e.code = 'ENOENT'; throw e }
      return { mode: modes.get(p) }
    },
    async readFile(p) { return files.get(p) },
    async writeFile(p, data, opts) {
      if (files.has(p)) { const e = new Error('exists'); e.code = 'EEXIST'; throw e }
      files.set(p, Buffer.from(data)); modes.set(p, opts.mode)
    },
  }
  const k1 = await loadOrCreateKey('/x/key', fsImpl)
  assert.deepEqual(dirs, ['/x'])
  assert.equal(modes.get('/x/key'), 0o600)
  const k2 = await loadOrCreateKey('/x/key', fsImpl)
  assert.deepEqual(k1, k2)
  modes.set('/x/key', 0o644)
  await assert.rejects(loadOrCreateKey('/x/key', fsImpl), /mode 600/)
})

const cfg = { type: 'postgresql', host: '127.0.0.1', database: 'sqlbot_sq_test', username: 'ro', password: 'pw-1' }

test('datasource config validation: type, host, database, port, scope shape', () => {
  assert.equal(validateDatasourceConfig(cfg).ok, true)
  assert.equal(validateDatasourceConfig({ ...cfg, type: 'oracle' }).ok, false)
  assert.equal(validateDatasourceConfig({ ...cfg, host: '' }).ok, false)
  assert.equal(validateDatasourceConfig({ ...cfg, port: 70000 }).ok, false)
  assert.equal(validateDatasourceConfig({ ...cfg, scope: { tables: 'a' } }).ok, false)
  assert.equal(validateDatasourceConfig({ ...cfg, scope: { tables: ['a'] } }).ok, true)
})

test('registry stores passwords sealed, lists them masked, and exposes them only through connectionFor', async () => {
  const rows = new Map()
  const table = {
    get: (id) => (rows.has(id) ? structuredClone(rows.get(id)) : undefined),
    list: () => [...rows.values()].map((r) => structuredClone(r)),
    async put(id, row) { rows.set(id, structuredClone(row)) },
    async delete(id) { return rows.delete(id) },
  }
  const box = createSecretBox(randomBytes(32))
  const reg = createDatasourceRegistry({ table, sealer: box })
  const added = await reg.add({ ...cfg, name: '测试库' })
  assert.equal(added.id, 1)
  assert.equal(added.password, MASK)
  assert.equal(reg.list()[0].password, MASK)
  const raw = JSON.stringify([...rows.values()])
  assert.ok(!raw.includes('pw-1'), 'stored record must not contain the plaintext password')
  assert.equal(reg.connectionFor(1).password, 'pw-1')
  const updated = await reg.update(1, { host: '10.0.0.2' })
  assert.equal(updated.host, '10.0.0.2')
  assert.equal(reg.connectionFor(1).password, 'pw-1', 'empty password keeps the existing secret')
  await assert.rejects(reg.add({ ...cfg, name: '' }), /name is required/)
})
