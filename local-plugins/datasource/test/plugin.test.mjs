import { test } from 'node:test'
import assert from 'node:assert/strict'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { rm } from 'node:fs/promises'
import { apply, name, inject } from '../src/plugin.js'

function stubCtx() {
  const registered = []
  const tables = new Map()
  const table = (n) => {
    if (!tables.has(n)) {
      const rows = new Map()
      tables.set(n, {
        get: (k) => rows.get(k),
        entries: () => rows.entries(),
        put: async (k, v) => { rows.set(k, structuredClone(v)) },
        delete: async (k) => rows.delete(k),
      })
    }
    return tables.get(n)
  }
  return {
    registered,
    logger: { error: () => {} },
    effect: (fn) => { fn() },
    provide: () => () => {},
    storageDomain: { open: async () => ({ table, close: async () => {} }) },
    tools: { register: (def) => { registered.push(def); return () => {} } },
  }
}

test('plugin name and injections', () => {
  assert.equal(name, 'datasource')
  assert.deepEqual(inject, ['tools', 'storageDomain'])
})

test('registers management tools and lists an empty registry', async () => {
  const ctx = stubCtx()
  const keyPath = join(tmpdir(), `datasource-test-${process.pid}-${Date.now()}.key`)
  const { ready } = apply(ctx, { keyPath })
  assert.deepEqual(ctx.registered.map((tool) => tool.name).sort(), ['datasource_add', 'datasource_list'])
  const listed = JSON.parse(await ctx.registered.find((tool) => tool.name === 'datasource_list').execute({}))
  assert.deepEqual(listed, [])
  await ready
  await rm(keyPath, { force: true })
})
