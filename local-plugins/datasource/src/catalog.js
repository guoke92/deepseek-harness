/**
 * 把 information_schema 的行收成库/模式 → 表。标识符只保留字母、数字和下划线。
 * 表 id 带上库或模式，供知识库绑定多选后按范围采集。
 */

const IDENT = /^[A-Za-z0-9_]+$/
const MYSQL_SKIP = new Set(['mysql', 'information_schema', 'performance_schema', 'sys'])
const PG_SKIP = new Set(['pg_catalog', 'information_schema', 'pg_toast'])

/**
 * @param {string} ref
 * @param {'postgresql'|'mysql'} type
 * @param {string} fallbackDatabase
 * @returns {{database: string, schema: string, table: string, key: string}}
 */
export function parseTableRef(ref, type, fallbackDatabase) {
  const parts = String(ref).split('.')
  if (parts.length === 0 || parts.some((part) => !IDENT.test(part))) throw new Error(`invalid table ref: ${ref}`)
  if (type === 'mysql') {
    if (parts.length > 2) throw new Error(`invalid table ref: ${ref}`)
    const database = parts.length === 2 ? parts[0] : fallbackDatabase
    const table = parts[parts.length - 1]
    return { database, schema: database, table, key: database === fallbackDatabase ? table : `${database}.${table}` }
  }
  if (parts.length > 3) throw new Error(`invalid table ref: ${ref}`)
  const database = parts.length === 3 ? parts[0] : fallbackDatabase
  const schema = parts.length === 1 ? 'public' : parts[parts.length - 2]
  const table = parts[parts.length - 1]
  const key = database === fallbackDatabase && schema === 'public' ? table : parts.length === 1 ? table : ref
  return { database, schema, table, key }
}

/**
 * @param {{schema_name?: string, table_name?: string, table_comment?: string|null, schema_comment?: string|null}[]} rows
 * @param {{type: string, database: string, databaseComment?: string|null}} origin
 * @returns {{id: string, label: string, kind: string, description: string, tables: {id: string, label: string, description: string}[]}[]}
 */
export function groupCatalog(rows, { type, database, databaseComment = '' }) {
  const skip = type === 'mysql' ? MYSQL_SKIP : PG_SKIP
  const groups = new Map()
  for (const row of rows) {
    const schema = row.schema_name
    const table = row.table_name
    if (typeof schema !== 'string' || typeof table !== 'string' || skip.has(schema)) continue
    if (!IDENT.test(schema) || !IDENT.test(table) || !IDENT.test(database)) continue
    const groupId = type === 'mysql' ? schema : `${database}.${schema}`
    if (!groups.has(groupId)) {
      const schemaComment = typeof row.schema_comment === 'string' ? row.schema_comment.trim() : ''
      groups.set(groupId, {
        id: groupId,
        label: type === 'mysql' ? schema : `${database} / ${schema}`,
        kind: type === 'mysql' ? 'database' : 'schema',
        description: type === 'mysql'
          ? (schema === database ? String(databaseComment || '').trim() : schemaComment)
          : String(databaseComment || schemaComment || '').trim(),
        tables: [],
      })
    }
    const id = type === 'mysql' ? `${schema}.${table}` : `${database}.${schema}.${table}`
    const description = typeof row.table_comment === 'string' ? row.table_comment.trim() : ''
    groups.get(groupId).tables.push({ id, label: table, description })
  }
  return [...groups.values()]
}
