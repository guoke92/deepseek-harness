/**
 * @local/datasource 宿主入口。
 * 向其他插件提供 localDatasource：列出与新增数据源、剖析（返回原料，不落库）、只读 SQL。
 * 模型可见的只有数据源管理工具。问数执行与原料入库分别属于 analyst 和 wiki。
 */
import { join } from 'node:path'
import { homedir } from 'node:os'
import { datasourceDomainSpec } from './domain.js'
import { createDatasourceService } from './service.js'
import { dispatchDatasource } from './panel.js'
import { listCatalog, probeConnection } from './connector.js'
import { probeConfig } from './datasources.js'

export const name = 'datasource'
export const inject = ['tools', 'storageDomain']

/** @param {{keyPath?: string, dataDir?: string}} config */
export function apply(ctx, config = {}) {
  const keyPath = config.keyPath ?? join(config.dataDir ?? join(homedir(), '.dsh-datasource'), 'secret.key')
  const ready = (async () => {
    const domain = await ctx.storageDomain.open(datasourceDomainSpec)
    ctx.effect(() => () => domain.close(), 'datasource.domainClose')
    return createDatasourceService({ domain, keyPath })
  })()
  ready.catch((err) => ctx.logger?.error?.(`datasource: startup failed: ${String(err?.message ?? err)}`))

  const api = {
    list: async () => {
      const service = await ready
      return service.datasources.list().map((view) => service.withConnection(view))
    },
    /**
     * 读取一个数据源的掩码视图。没有这条记录时返回 null。
     * @param {number|string} id
     */
    get: async (id) => {
      const service = await ready
      const view = service.datasources.get(id)
      return view ? service.withConnection(view) : null
    },
    add: async (input) => (await ready).datasources.add(input),
    update: async (id, patch) => (await ready).datasources.update(id, patch),
    remove: async (id) => (await ready).datasources.remove(id),
    progress: async (id) => (await ready).progress(id),
    collect: async (id, opts) => (await ready).collect(id, opts),
    /**
     * 列出库和表。已保存的数据源只传 id，database 是可选的单库过滤。
     * 还没有 id 时传连接字段，database 是连接库，databaseFilter 才是单库过滤。
     * 带连接字段的读取不写连通状态；按 id 读取成功或失败才会写。
     * @param {{id?: number, type?: string, host?: string, port?: number, database?: string, username?: string, password?: string, databaseFilter?: string}} body
     */
    catalog: async (body) => {
      const service = await ready
      const id = body?.id ?? null
      const inline = typeof body?.host === 'string' && body.host.trim() !== ''
      const stored = id != null ? service.datasources.connectionFor(id) : null
      if (id != null && !stored) throw new Error(`datasource ${id} not found`)
      if (!inline && stored == null) throw new Error('id is required')
      const source = inline ? probeConfig(body, stored?.password) : stored
      const filter = inline ? body?.databaseFilter : body?.database
      try {
        const listed = await listCatalog(source, { database: typeof filter === 'string' && filter !== '' ? filter : undefined })
        if (id != null && !inline) await service.datasources.setConnection(id, 'ok')
        return listed
      } catch (err) {
        if (id != null && !inline) await service.datasources.setConnection(id, 'failed', String(err?.message ?? err))
        throw err
      }
    },
    /**
     * 按表单参数探测连接。编辑时密码留空则用已保存的凭据。
     * 探测本身不改已保存的连通状态，按 id 的结构读取会再写一次。
     * @param {{id?: number, type?: string, host?: string, port?: number, database?: string, username?: string, password?: string}} body
     * @returns {Promise<{ok: true}>}
     */
    check: async (body) => {
      const service = await ready
      const id = body?.id
      let storedPassword
      if ((typeof body?.password === 'string' ? body.password : '') === '' && id != null) {
        const stored = service.datasources.connectionFor(id)
        if (!stored) throw new Error(`datasource ${id} not found`)
        storedPassword = stored.password
      }
      await probeConnection(probeConfig(body, storedPassword))
      return { ok: true }
    },
    runReadonly: async (id, sql, safety) => (await ready).runReadonly(id, sql, safety),
  }
  ctx.effect(() => ctx.provide('localDatasource', api), 'datasource.provide')

  const tool = (def) => ctx.tools.register({
    name: def.name,
    description: def.description,
    parameters: {
      type: 'object',
      properties: def.properties ?? {},
      ...(def.required?.length ? { required: def.required } : {}),
      additionalProperties: false,
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: String(value) }],
    },
    execute: async (args) => {
      try {
        return JSON.stringify(await def.run(args ?? {}), null, 2)
      } catch (err) {
        return JSON.stringify({ error: String(err?.message ?? err) })
      }
    },
  })

  tool({
    name: 'datasource_list',
    description: '列出已配置的数据源（凭据已掩码）。',
    run: () => api.list(),
  })
  tool({
    name: 'datasource_add',
    description: '新增 PostgreSQL 或 MySQL 数据源。凭据加密保存。建议使用只读账号。',
    properties: {
      name: { type: 'string', description: '显示名' },
      type: { type: 'string', description: 'postgresql 或 mysql' },
      host: { type: 'string', description: '主机' },
      port: { type: 'number', description: '端口，缺省 5432 或 3306' },
      database: { type: 'string', description: '库名' },
      username: { type: 'string', description: '用户名' },
      password: { type: 'string', description: '密码（加密存储，不回显）' },
    },
    required: ['name', 'type', 'host', 'database'],
    run: (args) => api.add(args),
  })

  const commands = typeof ctx.get === 'function' ? ctx.get('commands') : undefined
  if (commands?.register) {
    ctx.effect(() => commands.register({
      name: 'datasource',
      description: '数据源面板操作。参数是 JSON：{op:list|add|update|remove|catalog|check|progress, id?, database?, name?, type?, host?, port?, username?, password?}',
      recordInput: false,
      recordResult: false,
      recordLifecycle: false,
      listed: false,
      handler: async (invocation) => {
        try {
          const body = JSON.parse(String(invocation.rawInput ?? '').trim() || '{}')
          return { kind: 'success', text: JSON.stringify(await dispatchDatasource(api, body)) }
        } catch (err) {
          return { kind: 'error', text: String(err?.message ?? err) }
        }
      },
    }), 'datasource.command')
  }

  return { ready }
}
