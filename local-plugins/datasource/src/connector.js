/**
 * 数据源连接器（只读）：列元数据、行数、单列采样。
 * 所有查询走只读事务 / 只读会话设置。cfg 为数据源记录去掉密文字段后的连接参数。
 */
import { createRequire } from 'node:module'
import { groupCatalog, parseTableRef } from './catalog.js'

const require = createRequire(import.meta.url)
const SAMPLE_CAP = 1000000

async function openPg(cfg) {
  const pg = require('pg')
  const client = new pg.Client({
    host: cfg.host, port: cfg.port, database: cfg.database,
    user: cfg.username, password: cfg.password, connectionTimeoutMillis: 8000,
  })
  await client.connect()
  return client
}

async function openMysql(cfg) {
  const mysql = require('mysql2/promise')
  return mysql.createConnection({
    host: cfg.host, port: cfg.port, database: cfg.database,
    user: cfg.username, password: cfg.password, connectTimeout: 8000, timezone: 'Z',
  })
}

/** 在只读事务中执行回调；回调返回后提交（实际只读）。 */
export async function withReadonly(cfg, fn) {
  if (cfg.type === 'postgresql') {
    const client = await openPg(cfg)
    try {
      await client.query('BEGIN READ ONLY')
      try {
        const out = await fn({
          query: async (sql, params = []) => (await client.query(sql, params)).rows,
          type: 'postgresql',
        })
        await client.query('COMMIT')
        return out
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {})
        throw err
      }
    } finally {
      await client.end().catch(() => {})
    }
  }
  if (cfg.type === 'mysql') {
    const conn = await openMysql(cfg)
    try {
      await conn.query('SET SESSION TRANSACTION READ ONLY')
      return await fn({
        query: async (sql, params = []) => (await conn.query(sql, params))[0],
        type: 'mysql',
      })
    } finally {
      await conn.end().catch(() => {})
    }
  }
  throw new Error(`unsupported datasource type: ${cfg.type}`)
}

/** 列出可勾选的库/模式和表。PostgreSQL 的其他库只返回名字，展开时再带 database 查询。 */
export async function listCatalog(cfg, { database } = {}) {
  if (cfg.type === 'mysql') {
    const rows = await withReadonly(cfg, (db) => db.query(
      `SELECT table_schema AS schema_name, table_name AS table_name
         FROM information_schema.tables
        WHERE table_type = 'BASE TABLE'
        ORDER BY table_schema, table_name`,
    ))
    return { database: cfg.database, groups: groupCatalog(rows, { type: cfg.type, database: cfg.database }), siblings: [] }
  }
  const target = typeof database === 'string' && database !== '' ? database : cfg.database
  return withReadonly({ ...cfg, database: target }, async (db) => {
    const rows = await db.query(
      `SELECT table_schema AS schema_name, table_name AS table_name
         FROM information_schema.tables
        WHERE table_type = 'BASE TABLE'
        ORDER BY table_schema, table_name`,
    )
    const groups = groupCatalog(rows, { type: cfg.type, database: target })
    if (database) return { database: target, groups, siblings: [] }
    const names = await db.query(
      `SELECT datname FROM pg_database WHERE datallowconn AND NOT datistemplate ORDER BY datname`,
    )
    return {
      database: target,
      groups,
      siblings: names.map((row) => row.datname).filter((name) => name !== target && /^[A-Za-z0-9_]+$/.test(name)),
    }
  })
}

/** 列出范围内的表与列：[{ table, name, dataType, comment, ordinal }] */
export async function readColumns(cfg, { tables = null } = {}) {
  if (tables) return readSelectedColumns(cfg, tables)
  return withReadonly(cfg, async (db) => {
    let rows
    if (db.type === 'postgresql') {
      rows = await db.query(
        `SELECT c.table_name AS table, c.column_name AS name, c.data_type AS "dataType",
                col_description(format('%I.%I', c.table_schema, c.table_name)::regclass, c.ordinal_position) AS comment,
                c.ordinal_position AS ordinal
           FROM information_schema.columns c
           JOIN information_schema.tables t
             ON t.table_schema = c.table_schema AND t.table_name = c.table_name
          WHERE c.table_schema = 'public' AND t.table_type = 'BASE TABLE'
          ORDER BY c.table_name, c.ordinal_position`,
      )
    } else {
      rows = await db.query(
        `SELECT c.table_name AS \`table\`, c.column_name AS name, c.data_type AS dataType,
                c.column_comment AS comment, c.ordinal_position AS ordinal
           FROM information_schema.columns c
           JOIN information_schema.tables t
             ON t.table_schema = c.table_schema AND t.table_name = c.table_name
          WHERE c.table_schema = DATABASE() AND t.table_type = 'BASE TABLE'
          ORDER BY c.table_name, c.ordinal_position`,
      )
    }
    const want = tables ? new Set(tables) : null
    return rows
      .filter((r) => !want || want.has(r.table))
      .map((r) => ({ table: r.table, name: r.name, dataType: r.dataType, comment: r.comment || null, ordinal: Number(r.ordinal) }))
  })
}

/** 每表行数（精确 COUNT）。带点的表名按库/模式限定。 */
export async function readRowCounts(cfg, tables) {
  const out = {}
  const groups = new Map()
  for (const table of tables) {
    const ref = locate(cfg, table)
    const list = groups.get(ref.database) ?? []
    list.push(ref)
    groups.set(ref.database, list)
  }
  for (const [database, refs] of groups) {
    await withReadonly({ ...cfg, database }, async (db) => {
      for (const ref of refs) {
        const rows = await db.query(`SELECT COUNT(*) AS n FROM ${fromClause(db.type, ref)}`)
        out[ref.key] = Number(rows[0].n)
      }
    })
  }
  return out
}

/**
 * 采样一列的值（最多 limit 行）。
 * 说明：LIMIT 采样偏向物理前部，后续可改为随机采样；这里先保证确定性与只读。
 */
export async function sampleColumn(cfg, table, column, limit = 10000) {
  const cap = Math.min(Math.max(Number(limit) || 10000, 1), SAMPLE_CAP)
  const ref = locate(cfg, table)
  return withReadonly({ ...cfg, database: ref.database }, async (db) => {
    const quoted = quoteIdent(db.type, column)
    const rows = await db.query(`SELECT ${quoted} AS v FROM ${fromClause(db.type, ref)} LIMIT ${cap}`)
    return rows.map((r) => r.v)
  })
}

function locate(cfg, table) {
  if (String(table).includes('.')) return parseTableRef(table, cfg.type, cfg.database)
  if (cfg.type === 'postgresql') return { database: cfg.database, schema: 'public', table, key: table }
  return { database: cfg.database, schema: cfg.database, table, key: table }
}

function quoteIdent(type, name) {
  if (!/^[A-Za-z0-9_]+$/.test(name)) throw new Error(`invalid identifier: ${name}`)
  return type === 'postgresql' ? `"${name}"` : `\`${name}\``
}

function fromClause(type, ref) {
  if (type === 'postgresql') return `${quoteIdent(type, ref.schema)}.${quoteIdent(type, ref.table)}`
  return `${quoteIdent(type, ref.database)}.${quoteIdent(type, ref.table)}`
}

async function readSelectedColumns(cfg, tables) {
  const refs = tables.map((table) => parseTableRef(table, cfg.type, cfg.database))
  const byDatabase = new Map()
  for (const ref of refs) {
    const list = byDatabase.get(ref.database) ?? []
    list.push(ref)
    byDatabase.set(ref.database, list)
  }
  const out = []
  for (const [database, items] of byDatabase) {
    const schemas = [...new Set(items.map((item) => item.schema))]
    const rows = await withReadonly({ ...cfg, database }, async (db) => {
      if (db.type === 'postgresql') {
        return db.query(
          `SELECT c.table_schema AS schema, c.table_name AS "table", c.column_name AS name,
                  c.data_type AS "dataType",
                  col_description(format('%I.%I', c.table_schema, c.table_name)::regclass, c.ordinal_position) AS comment,
                  c.ordinal_position AS ordinal
             FROM information_schema.columns c
             JOIN information_schema.tables t
               ON t.table_schema = c.table_schema AND t.table_name = c.table_name
            WHERE c.table_schema = ANY($1) AND t.table_type = 'BASE TABLE'
            ORDER BY c.table_name, c.ordinal_position`,
          [schemas],
        )
      }
      const marks = schemas.map(() => '?').join(', ')
      return db.query(
        `SELECT c.table_schema AS \`schema\`, c.table_name AS \`table\`, c.column_name AS name,
                c.data_type AS dataType, c.column_comment AS comment, c.ordinal_position AS ordinal
           FROM information_schema.columns c
           JOIN information_schema.tables t
             ON t.table_schema = c.table_schema AND t.table_name = c.table_name
          WHERE c.table_schema IN (${marks}) AND t.table_type = 'BASE TABLE'
          ORDER BY c.table_name, c.ordinal_position`,
        schemas,
      )
    })
    const want = new Map(items.map((item) => [`${item.schema}.${item.table}`, item]))
    for (const row of rows) {
      const ref = want.get(`${row.schema}.${row.table}`)
      if (!ref) continue
      out.push({
        table: ref.key,
        name: row.name,
        dataType: row.dataType,
        comment: row.comment || null,
        ordinal: Number(row.ordinal),
      })
    }
  }
  return out
}
