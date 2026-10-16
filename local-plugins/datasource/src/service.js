/**
 * 数据源宿主服务。拥有连接、加密凭据、结构剖析与只读 SQL。
 * 剖析结果以原料投递的形式返回，由 wiki 追加；本服务不写页面，也不保存原料。
 */
import { createDatasourceRegistry } from './datasources.js'
import { createSecretBox, loadOrCreateKey } from './crypto.js'
import { profileDatasource } from './pipeline.js'
import { triageAll } from './dict-triage.js'
import { materialFromProfile } from './deliver.js'
import { checkReadonlySql } from './sqlguard.js'
import { readFile, writeFile, stat, mkdir } from 'node:fs/promises'

function domainTableAdapter(table) {
  return {
    get: (id) => table.get(String(id)),
    list: () => [...table.entries()].map(([, v]) => v),
    put: (id, row) => table.put(String(id), row),
    delete: (id) => table.delete(String(id)),
  }
}

/**
 * @param {{domain: object, keyPath: string, fs?: object}} deps
 */
export async function createDatasourceService({ domain, keyPath, fs = { stat, readFile, writeFile, mkdir } }) {
  const key = await loadOrCreateKey(keyPath, fs)
  const sealer = createSecretBox(key)
  const datasources = createDatasourceRegistry({
    table: domainTableAdapter(domain.table('datasources')),
    sealer,
  })
  const collections = domain.table('collections')

  return {
    datasources,
    progress: (datasourceId) => collections.get(String(datasourceId)),
    /**
     * 读结构并剖析。返回 wiki 可直接 capture 的原料，以及字典分流计数。
     * @param {number} datasourceId
     * @param {{tables?: string[]|null, policy: object}} opts policy 是策略的 wiki 段
     */
    async collect(datasourceId, opts) {
      const conn = datasources.connectionFor(datasourceId)
      if (!conn) throw new Error(`datasource ${datasourceId} not found`)
      const at = new Date().toISOString()
      await collections.put(String(datasourceId), {
        datasourceId, state: 'running', phase: 'start', done: 0, total: 0, startedAt: at, finishedAt: null, error: null,
      })
      try {
        const { profiles, candidates } = await profileDatasource(conn, {
          datasourceId,
          tables: opts.tables ?? null,
          policy: opts.policy,
        })
        const dicts = triageAll(candidates, { dictDistinctMax: opts.policy.dictDistinctMax })
        await collections.put(String(datasourceId), {
          datasourceId, state: 'done', phase: 'done', done: profiles.length, total: profiles.length,
          startedAt: at, finishedAt: new Date().toISOString(), error: null,
        })
        return {
          materials: profiles.map((profile) => materialFromProfile(profile, datasourceId)),
          profiles,
          dicts,
        }
      } catch (err) {
        await collections.put(String(datasourceId), {
          datasourceId, state: 'failed', phase: 'failed', done: 0, total: 0,
          startedAt: at, finishedAt: new Date().toISOString(), error: String(err?.message ?? err),
        })
        throw err
      }
    },
    /**
     * 只读 SQL。守卫在这里再检查一次，调用方传入的禁用表列不能绕过。
     * @param {number} datasourceId
     * @param {string} sql
     * @param {{maxRows: number, forbiddenTables?: string[], forbiddenColumns?: string[]}} safety
     */
    async runReadonly(datasourceId, sql, safety) {
      const conn = datasources.connectionFor(datasourceId)
      if (!conn) throw new Error(`datasource ${datasourceId} not found`)
      const checked = checkReadonlySql(sql, {
        dialect: conn.type,
        forbiddenTables: safety.forbiddenTables ?? [],
        forbiddenColumns: safety.forbiddenColumns ?? [],
      })
      if (!checked.ok) throw new Error(`sql rejected: ${checked.reason}`)
      const { withReadonly } = await import('./connector.js')
      const limit = Math.min(Math.max(1, safety.maxRows), 1000)
      return withReadonly(conn, async (db) => {
        const rows = await db.query(checked.sql)
        return { rows: rows.slice(0, limit), truncated: rows.length > limit }
      })
    },
  }
}
