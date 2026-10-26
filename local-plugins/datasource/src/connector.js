/**
 * 数据源连接器（只读）：列元数据、表结构、行数、整表采样。
 * 所有查询走只读事务 / 只读会话设置。cfg 为数据源记录去掉密文字段后的连接参数。
 */
import { createRequire } from 'node:module'
import { groupCatalog, parseTableRef } from './catalog.js'
import { groupTableMeta } from './table-meta.js'

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
    supportBigNumbers: true, bigNumberStrings: true, dateStrings: true,
    supportBigNumbers: true, bigNumberStrings: true, dateStrings: true,
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

/** 用只读会话执行一次 `SELECT 1`，确认主机、端口、库名和凭据可用。 */
export async function probeConnection(cfg) {
  await withReadonly(cfg, (db) => db.query('SELECT 1 AS ok'))
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
 * 读取表注释、列、主键、索引和声明的外键。
 * @param {object} cfg
 * @param {string[]|null} tables
 */
export async function readTableMetas(cfg, tables = null) {
  const refs = tables?.length
    ? tables.map((table) => parseTableRef(table, cfg.type, cfg.database))
    : await listBaseRefs(cfg)
  const byDatabase = new Map()
  for (const ref of refs) {
    const list = byDatabase.get(ref.database) ?? []
    list.push(ref)
    byDatabase.set(ref.database, list)
  }
  const columns = []
  const foreignKeys = []
  const indexes = []
  for (const [database, items] of byDatabase) {
    const loaded = await withReadonly({ ...cfg, database }, (db) => loadMeta(db, items))
    columns.push(...loaded.columns)
    foreignKeys.push(...loaded.foreignKeys)
    indexes.push(...loaded.indexes)
  }
  return groupTableMeta(columns, foreignKeys, indexes)
}

/**
 * 一次读出整表采样。单列主键时按主键倒序，否则取物理前部。
 * @param {object} cfg
 * @param {{tableKey: string, columns: {name: string}[], primaryKey?: string[]}} meta
 * @param {number} limit
 * @returns {Promise<{rows: object[], sampleMode: string}>}
 */
export async function sampleTable(cfg, meta, limit = 10000) {
  const cap = Math.min(Math.max(Number(limit) || 10000, 1), SAMPLE_CAP)
  if (!meta.columns?.length) return { rows: [], sampleMode: 'physical-prefix' }
  const ref = locate(cfg, meta.tableKey)
  return withReadonly({ ...cfg, database: ref.database }, async (db) => {
    const selected = meta.columns.map((column) => quoteIdent(db.type, column.name)).join(', ')
    let order = ''
    let sampleMode = 'physical-prefix'
    if (meta.primaryKey?.length === 1) {
      order = ` ORDER BY ${quoteIdent(db.type, meta.primaryKey[0])} DESC`
      sampleMode = 'latest-by-primary-key'
    }
    const rows = await db.query(`SELECT ${selected} FROM ${fromClause(db.type, ref)}${order} LIMIT ${cap}`)
    return { rows, sampleMode }
  })
}

/**
 * 精确包含：每个任务给出小表的不同值，统计这些值在目标列里命中多少，以及目标列的全表不同值和行数。
 * 采样没覆盖全表时，用它补关联，而不是拿最新主键样本去比。
 * @param {object} cfg
 * @param {{table: string, column: string, values: string[]}[]} jobs
 * @returns {Promise<{distinct: number, nonNull: number, hits: number}[]>}
 */
export async function measureOverlaps(cfg, jobs) {
  const results = jobs.map(() => ({ distinct: 0, nonNull: 0, hits: 0 }))
  const groups = new Map()
  jobs.forEach((job, index) => {
    const ref = locate(cfg, job.table)
    const list = groups.get(ref.database) ?? []
    list.push({ ...job, index, ref })
    groups.set(ref.database, list)
  })
  for (const [database, list] of groups) {
    await withReadonly({ ...cfg, database }, async (db) => {
      const stats = new Map()
      for (const job of list) {
        const col = quoteIdent(db.type, job.column)
        const from = fromClause(db.type, job.ref)
        const mark = `${job.ref.key}\0${job.column}`
        if (!stats.has(mark)) {
          const rows = await db.query(
            `SELECT COUNT(DISTINCT ${col}) AS distinct_count, SUM(CASE WHEN ${col} IS NULL THEN 0 ELSE 1 END) AS non_null_count FROM ${from}`,
          )
          stats.set(mark, { distinct: Number(rows[0].distinct_count), nonNull: Number(rows[0].non_null_count) })
        }
        const base = stats.get(mark)
        let hits = 0
        const values = job.values ?? []
        for (let i = 0; i < values.length; i += 500) {
          const part = values.slice(i, i + 500)
          const placeholders = part.map((_, n) => (db.type === 'postgresql' ? `$${n + 1}` : '?')).join(', ')
          const rows = await db.query(
            `SELECT COUNT(DISTINCT ${col}) AS hits FROM ${from} WHERE ${col} IN (${placeholders})`,
            part,
          )
          hits += Number(rows[0].hits)
        }
        results[job.index] = { distinct: base.distinct, nonNull: base.nonNull, hits }
      }
    })
  }
  return results
}

async function listBaseRefs(cfg) {
  if (cfg.type === 'mysql') {
    const rows = await withReadonly(cfg, (db) => db.query(
      `SELECT table_schema AS schema_name, table_name
         FROM information_schema.tables
        WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'
        ORDER BY table_name`,
    ))
    return rows.map((row) => parseTableRef(`${row.schema_name}.${row.table_name}`, 'mysql', cfg.database))
  }
  const rows = await withReadonly(cfg, (db) => db.query(
    `SELECT table_schema AS schema_name, table_name
       FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name`,
  ))
  return rows.map((row) => parseTableRef(`${row.schema_name}.${row.table_name}`, 'postgresql', cfg.database))
}

async function loadMeta(db, items) {
  const schemas = [...new Set(items.map((item) => item.schema))]
  const want = new Map(items.map((item) => [`${item.schema}.${item.table}`, item]))
  const keyOf = (schema, table) => want.get(`${schema}.${table}`)?.key ?? null
  if (db.type === 'postgresql') return loadPg(db, schemas, keyOf)
  return loadMysql(db, schemas, keyOf)
}

async function loadMysql(db, schemas, keyOf) {
  const marks = schemas.map(() => '?').join(', ')
  const columns = await db.query(
    `SELECT c.table_schema AS schema_name, c.table_name, c.column_name, c.column_type AS data_type,
            c.is_nullable, c.column_default, c.column_comment, c.ordinal_position, c.column_key, t.table_comment
       FROM information_schema.columns c
       JOIN information_schema.tables t
         ON t.table_schema = c.table_schema AND t.table_name = c.table_name
      WHERE c.table_schema IN (${marks}) AND t.table_type = 'BASE TABLE'
      ORDER BY c.table_name, c.ordinal_position`,
    schemas,
  )
  const foreignKeys = await db.query(
    `SELECT table_schema AS schema_name, table_name, column_name, referenced_table_schema, referenced_table_name,
            referenced_column_name, constraint_name, ordinal_position
       FROM information_schema.key_column_usage
      WHERE table_schema IN (${marks}) AND referenced_table_name IS NOT NULL`,
    schemas,
  )
  const indexes = await db.query(
    `SELECT table_schema AS schema_name, table_name, index_name, non_unique, column_name, seq_in_index
       FROM information_schema.statistics
      WHERE table_schema IN (${marks}) AND index_name <> 'PRIMARY'`,
    schemas,
  )
  return {
    columns: columns.flatMap((row) => {
      const tableKey = keyOf(row.schema_name, row.table_name)
      if (!tableKey) return []
      return [{
        tableKey,
        name: row.column_name,
        dataType: row.data_type,
        nullable: row.is_nullable === 'YES',
        defaultValue: row.column_default == null ? null : String(row.column_default),
        comment: row.column_comment || null,
        ordinal: Number(row.ordinal_position),
        primary: row.column_key === 'PRI',
        tableComment: row.table_comment || null,
      }]
    }),
    foreignKeys: foreignKeys.flatMap((row) => {
      const tableKey = keyOf(row.schema_name, row.table_name)
      if (!tableKey) return []
      return [{
        tableKey,
        column: row.column_name,
        refTable: referencedName(row.schema_name, row.referenced_table_schema, row.referenced_table_name),
        refColumn: row.referenced_column_name,
        constraint: row.constraint_name,
        ordinal: Number(row.ordinal_position),
      }]
    }),
    indexes: indexes.flatMap((row) => {
      const tableKey = keyOf(row.schema_name, row.table_name)
      if (!tableKey) return []
      return [{
        tableKey,
        name: row.index_name,
        unique: Number(row.non_unique) === 0,
        column: row.column_name,
        seq: Number(row.seq_in_index),
      }]
    }),
  }
}

async function loadPg(db, schemas, keyOf) {
  const columns = await db.query(
    `SELECT c.table_schema AS schema_name, c.table_name, c.column_name,
            CASE WHEN c.character_maximum_length IS NOT NULL
                 THEN c.data_type || '(' || c.character_maximum_length || ')'
                 ELSE c.data_type END AS data_type,
            c.is_nullable, c.column_default,
            col_description(format('%I.%I', c.table_schema, c.table_name)::regclass, c.ordinal_position) AS column_comment,
            c.ordinal_position,
            obj_description(format('%I.%I', c.table_schema, c.table_name)::regclass, 'pg_class') AS table_comment
       FROM information_schema.columns c
       JOIN information_schema.tables t
         ON t.table_schema = c.table_schema AND t.table_name = c.table_name
      WHERE c.table_schema = ANY($1) AND t.table_type = 'BASE TABLE'
      ORDER BY c.table_name, c.ordinal_position`,
    [schemas],
  )
  const primaryKeys = await db.query(
    `SELECT kcu.table_schema AS schema_name, kcu.table_name, kcu.column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
        AND tc.table_name = kcu.table_name
      WHERE tc.constraint_type = 'PRIMARY KEY' AND kcu.table_schema = ANY($1)`,
    [schemas],
  )
  const primary = new Set(primaryKeys.map((row) => `${row.schema_name}.${row.table_name}.${row.column_name}`))
  const foreignKeys = await db.query(
    `SELECT tc.table_schema AS schema_name, tc.table_name, kcu.column_name,
            ccu.table_schema AS referenced_table_schema, ccu.table_name AS referenced_table_name,
            ccu.column_name AS referenced_column_name, tc.constraint_name, kcu.ordinal_position
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
       JOIN information_schema.constraint_column_usage ccu
         ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = ANY($1)
      ORDER BY tc.constraint_name, kcu.ordinal_position`,
    [schemas],
  )
  const indexes = await db.query(
    `SELECT ns.nspname AS schema_name, tbl.relname AS table_name, idx.relname AS index_name,
            ix.indisunique AS is_unique, a.attname AS column_name, k.ord AS seq
       FROM pg_index ix
       JOIN pg_class tbl ON tbl.oid = ix.indrelid
       JOIN pg_class idx ON idx.oid = ix.indexrelid
       JOIN pg_namespace ns ON ns.oid = tbl.relnamespace
       JOIN LATERAL unnest(ix.indkey) WITH ORDINALITY AS k(attnum, ord) ON true
       JOIN pg_attribute a ON a.attrelid = tbl.oid AND a.attnum = k.attnum
      WHERE ns.nspname = ANY($1) AND NOT ix.indisprimary AND k.attnum > 0`,
    [schemas],
  )
  const seenFk = new Set()
  return {
    columns: columns.flatMap((row) => {
      const tableKey = keyOf(row.schema_name, row.table_name)
      if (!tableKey) return []
      return [{
        tableKey,
        name: row.column_name,
        dataType: row.data_type,
        nullable: row.is_nullable === 'YES',
        defaultValue: row.column_default == null ? null : String(row.column_default),
        comment: row.column_comment || null,
        ordinal: Number(row.ordinal_position),
        primary: primary.has(`${row.schema_name}.${row.table_name}.${row.column_name}`),
        tableComment: row.table_comment || null,
      }]
    }),
    foreignKeys: foreignKeys.flatMap((row) => {
      const tableKey = keyOf(row.schema_name, row.table_name)
      const mark = `${row.constraint_name}:${row.column_name}:${row.referenced_column_name}`
      if (!tableKey || seenFk.has(mark)) return []
      seenFk.add(mark)
      return [{
        tableKey,
        column: row.column_name,
        refTable: referencedName(row.schema_name, row.referenced_table_schema, row.referenced_table_name),
        refColumn: row.referenced_column_name,
        constraint: row.constraint_name,
        ordinal: Number(row.ordinal_position),
      }]
    }),
    indexes: indexes.flatMap((row) => {
      const tableKey = keyOf(row.schema_name, row.table_name)
      if (!tableKey) return []
      return [{
        tableKey,
        name: row.index_name,
        unique: row.is_unique === true,
        column: row.column_name,
        seq: Number(row.seq),
      }]
    }),
  }
}

function referencedName(schema, refSchema, refTable) {
  if (!refSchema || refSchema === schema) return refTable
  return `${refSchema}.${refTable}`
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
