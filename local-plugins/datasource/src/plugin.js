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
import { listCatalog } from './connector.js'

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
    list: async () => (await ready).datasources.list(),
    add: async (input) => (await ready).datasources.add(input),
    update: async (id, patch) => (await ready).datasources.update(id, patch),
    remove: async (id) => (await ready).datasources.remove(id),
    progress: async (id) => (await ready).progress(id),
    collect: async (id, opts) => (await ready).collect(id, opts),
    catalog: async (id, opts) => {
      const service = await ready
      const conn = service.datasources.connectionFor(id)
      if (!conn) throw new Error(`datasource ${id} not found`)
      return listCatalog(conn, opts ?? {})
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
      description: '数据源面板操作。参数是 JSON：{op:list|add|update|remove|catalog|progress, id?, database?, name?, type?, host?, port?, username?, password?}',
      recordInput: false,
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
