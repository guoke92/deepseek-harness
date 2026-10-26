/**
 * 数据源宿主服务。拥有连接、加密凭据、结构剖析与只读 SQL。
 * 剖析结果以原料投递的形式返回，由 wiki 追加；本服务不写页面，也不保存原料。
 */
import { createDatasourceRegistry } from './datasources.js'
import { createSecretBox, loadOrCreateKey } from './crypto.js'
import { profileDatasource } from './pipeline.js'
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
    /**
     * 还没有单独的连通记录时，用最近一次采集是否连上库来补。采集进度本身不在这里解释。
     * @param {object} view datasources.list 的一项
     */
    withConnection(view) {
      if (view.connection?.status && view.connection.status !== 'unknown') return view
      const prior = collections.get(String(view.id))
      if (prior?.state === 'done') {
        return { ...view, connection: { status: 'ok', checkedAt: prior.finishedAt ?? null, error: null } }
      }
      if (prior?.state === 'failed') {
        return { ...view, connection: { status: 'failed', checkedAt: prior.finishedAt ?? null, error: prior.error ?? null } }
      }
      return view
    },
    progress: (datasourceId) => collections.get(String(datasourceId)),
    /**
     * 读结构并生成每表一条 db.table 原料。dicts.keep 是标成字典的列。
     * @param {number} datasourceId
     * @param {{tables?: string[]|null, policy: object}} opts policy 是策略的 wiki 段
     */
    async collect(datasourceId, opts) {
      const conn = datasources.connectionFor(datasourceId)
      if (!conn) throw new Error(`datasource ${datasourceId} not found`)
      const at = new Date().toISOString()
      let connected = false
      const markConnected = () => {
        if (connected) return
        connected = true
        return datasources.setConnection(datasourceId, 'ok')
      }
      await collections.put(String(datasourceId), {
        datasourceId, state: 'running', phase: 'start', done: 0, total: 0, startedAt: at, finishedAt: null, error: null,
      })
      try {
        const produced = await profileDatasource(conn, {
          datasourceId,
          tables: opts.tables ?? null,
          policy: opts.policy,
          onProgress: (progress) => {
            if (progress.phase === 'count' || progress.phase === 'profile') void markConnected()
            opts.onProgress?.(progress)
          },
          signal: opts.signal,
          gate: opts.gate,
        })
        await markConnected()
        await collections.put(String(datasourceId), {
          datasourceId, state: 'done', phase: 'done', done: produced.materials.length, total: produced.materials.length,
          startedAt: at, finishedAt: new Date().toISOString(), error: null,
        })
        return produced
      } catch (err) {
        const cancelled = err?.code === 'cancelled'
        if (!connected && !cancelled) await datasources.setConnection(datasourceId, 'failed', String(err?.message ?? err))
        await collections.put(String(datasourceId), {
          datasourceId, state: cancelled ? 'cancelled' : 'failed', phase: cancelled ? 'cancelled' : 'failed', done: 0, total: 0,
          startedAt: at, finishedAt: new Date().toISOString(), error: cancelled ? null : String(err?.message ?? err),
        })
        throw err
      }
    },
    /**
     * 只读 SQL。守卫在这里再检查一次，调用方传入的禁用表列不能绕过。
     * @param {number} datasourceId
     * @param {string} sql
     * @param {{maxRows: number, forbiddenTables?: string[], forbiddenColumns?: string[], allowedTables?: string[]|null}} safety
     * `allowedTables` 有值时，语句里的表必须落在这份范围里。
     */
    async runReadonly(datasourceId, sql, safety) {
      const conn = datasources.connectionFor(datasourceId)
      if (!conn) throw new Error(`datasource ${datasourceId} not found`)
      const checked = checkReadonlySql(sql, {
        dialect: conn.type,
        forbiddenTables: safety.forbiddenTables ?? [],
        forbiddenColumns: safety.forbiddenColumns ?? [],
        allowedTables: safety.allowedTables,
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
