/**
 * 数据源注册表。凭据只以密文保存；列表与描述接口只返回掩码。
 * 写入经单写者队列。存储表由调用方注入（storage domain 的 table 或内存表）。
 */
import { SCHEMA_VERSION } from '@local/contracts'

const DATASOURCE_TYPES = ['postgresql', 'mysql']
const finish = (errors) => ({ ok: errors.length === 0, errors })
import { createSerialQueue } from './queue.js'

const MASK = '******'

/** 校验数据源配置（不含凭据明文以外的字段）。 */
export function validateDatasourceConfig(input) {
  const e = []
  if (!DATASOURCE_TYPES.includes(input?.type)) e.push(`type must be one of ${DATASOURCE_TYPES.join(', ')}`)
  if (typeof input?.host !== 'string' || input.host.trim() === '') e.push('host is required')
  if (typeof input?.database !== 'string' || input.database.trim() === '') e.push('database is required')
  const port = input?.port ?? (input?.type === 'mysql' ? 3306 : 5432)
  if (!Number.isInteger(port) || port <= 0 || port > 65535) e.push('port must be 1..65535')
  if (input?.username !== undefined && typeof input.username !== 'string') e.push('username must be a string')
  if (input?.password !== undefined && typeof input.password !== 'string') e.push('password must be a string')
  if (input?.scope !== undefined) {
    const s = input.scope
    if (typeof s !== 'object' || s === null) e.push('scope must be an object')
    else {
      for (const k of ['schemas', 'tables']) {
        if (s[k] !== undefined && !(Array.isArray(s[k]) && s[k].every((x) => typeof x === 'string'))) e.push(`scope.${k} must be string[]`)
      }
    }
  }
  return finish(e)
}

/**
 * @param {{table: object, sealer: {seal: (s: string) => string, open: (s: string) => string}, now?: () => string}} deps
 */
export function createDatasourceRegistry({ table, sealer, now = () => new Date().toISOString() }) {
  const queue = createSerialQueue()
  // 存储键统一为字符串（storage domain 的 KV 键语义），调用方可以传数字 id。
  const keyOf = (id) => String(id)
  const rawTable = table
  table = {
    get: (id) => rawTable.get(keyOf(id)),
    list: () => rawTable.list(),
    put: (id, row) => rawTable.put(keyOf(id), row),
    delete: (id) => rawTable.delete(keyOf(id)),
  }

  const asView = (row) => ({
    id: row.id,
    name: row.name,
    type: row.type,
    host: row.host,
    port: row.port,
    database: row.database,
    username: row.username ?? '',
    password: row.passwordSealed ? MASK : '',
    scope: row.scope ?? {},
    schemaVersion: SCHEMA_VERSION,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  })

  function nextId() {
    const ids = table.list().map((r) => r.id)
    return ids.length === 0 ? 1 : Math.max(...ids) + 1
  }

  return {
    /** @returns {object[]} 掩码视图 */
    list: () => table.list().map(asView).sort((a, b) => a.id - b.id),
    /** @returns {object|undefined} 掩码视图 */
    get: (id) => {
      const row = table.get(id)
      return row ? asView(row) : undefined
    },
    /**
     * 只在内部使用：解开凭据，供采集器与只读 SQL 连接。
     * @returns {{type, host, port, database, username, password, scope}|undefined}
     */
    connectionFor(id) {
      const row = table.get(id)
      if (!row) return undefined
      return {
        type: row.type,
        host: row.host,
        port: row.port,
        database: row.database,
        username: row.username ?? '',
        password: row.passwordSealed ? sealer.open(row.passwordSealed) : '',
        scope: row.scope ?? {},
      }
    },
    add(input) {
      const checked = validateDatasourceConfig(input)
      if (!checked.ok) return Promise.reject(new Error(checked.errors.join('; ')))
      if (typeof input.name !== 'string' || input.name.trim() === '') return Promise.reject(new Error('name is required'))
      return queue.run(async () => {
        const id = nextId()
        const at = now()
        const row = {
          id,
          name: input.name.trim(),
          type: input.type,
          host: input.host.trim(),
          port: input.port ?? (input.type === 'mysql' ? 3306 : 5432),
          database: input.database.trim(),
          username: input.username ?? '',
          passwordSealed: input.password ? sealer.seal(input.password) : null,
          scope: input.scope ?? {},
          createdAt: at,
          updatedAt: at,
        }
        await table.put(id, row)
        return asView(row)
      })
    },
    /** 更新：未提供的字段保持不变；password 为空字符串表示不修改。 */
    update(id, patch) {
      return queue.run(async () => {
        const cur = table.get(id)
        if (!cur) throw new Error(`datasource ${id} not found`)
        const merged = { ...cur, ...pickDefined(patch, ['name', 'type', 'host', 'port', 'database', 'username', 'scope']) }
        const checked = validateDatasourceConfig({ ...merged, password: undefined })
        if (!checked.ok) throw new Error(checked.errors.join('; '))
        if (patch.password !== undefined && patch.password !== '') merged.passwordSealed = sealer.seal(patch.password)
        merged.updatedAt = now()
        await table.put(id, merged)
        return asView(merged)
      })
    },
    remove(id) {
      return queue.run(async () => {
        const ok = await table.delete(id)
        if (!ok) throw new Error(`datasource ${id} not found`)
        return true
      })
    },
  }
}

function pickDefined(obj, keys) {
  const out = {}
  for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k]
  return out
}

export { MASK }
