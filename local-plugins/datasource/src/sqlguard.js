/**
 * 只读 SQL 守卫（按方言词法分析）。
 *
 * 只允许一条 SELECT 或 WITH ... SELECT。分析基于词法单元：字符串字面值、标识符引号与注释
 * 不参与关键字判断，因此 `select 'delete me'` 与列名 `load`、`lock`、`replace` 不会被误拒；
 * `#` 按方言解释（PostgreSQL 为位运算符，MySQL 为注释）。
 *
 * 守卫只判断，不改写：执行的是调用方原始文本，不会因剥离注释而截断语句。
 * 这是纵深防御，数据源账号本身也必须是只读账号。
 */

export const DIALECTS = Object.freeze(['postgresql', 'mysql'])

/** 在语句任意位置都禁止的关键字（不可能出现在合法只读 SELECT 中）。 */
const ALWAYS_FORBIDDEN = new Set(['insert', 'update', 'delete', 'into', 'outfile', 'dumpfile', 'pragma', 'attach', 'detach', 'vacuum', 'reindex', 'cluster', 'grant', 'revoke', 'truncate', 'upsert', 'merge', 'copy', 'drop', 'alter', 'create', 'rename'])

/** 位于语句开头或子查询开头（`(` 之后）时禁止：这些词作为列名或函数名时是合法的。 */
const STATEMENT_START_FORBIDDEN = new Set(['replace', 'load', 'lock', 'call', 'exec', 'execute', 'do', 'set', 'begin', 'commit', 'rollback', 'explain', 'analyze', 'handler', 'prepare', 'deallocate', 'use', 'kill', 'flush', 'reset', 'savepoint', 'release', 'unlock', 'start', 'signal', 'resignal'])

/** 即使出现在表达式中也禁止调用的函数（读文件、远程连接、执行外部程序等）。 */
const FORBIDDEN_FUNCTIONS = new Set([
  'pg_read_file', 'pg_read_binary_file', 'pg_ls_dir', 'pg_stat_file', 'lo_import', 'lo_export',
  'dblink', 'dblink_exec', 'pg_sleep_for', 'pg_terminate_backend', 'pg_cancel_backend',
  'load_file', 'sys_exec', 'sys_eval', 'benchmark', 'sleep',
])

/**
 * 词法分析。返回单元数组，每个单元 { t: 'word'|'punct'|'num'|'str'|'ident', v, pos }。
 * 字符串、标识符引号与注释不产生 word 单元（字符串与引号标识符作为 str/ident 保留以便计数）。
 * @param {string} sql
 * @param {'postgresql'|'mysql'} dialect
 */
export function tokenize(sql, dialect) {
  const out = []
  const n = sql.length
  let i = 0
  const isWordStart = (c) => /[A-Za-z_]/.test(c)
  const isWordPart = (c) => /[A-Za-z0-9_$]/.test(c)
  while (i < n) {
    const c = sql[i]
    const next = sql[i + 1]
    if (/\s/.test(c)) { i++; continue }
    // 行注释：-- 在两种方言中都是注释；# 仅 MySQL 为注释
    if (c === '-' && next === '-') {
      const end = sql.indexOf('\n', i)
      i = end < 0 ? n : end + 1
      continue
    }
    if (c === '#' && dialect === 'mysql') {
      const end = sql.indexOf('\n', i)
      i = end < 0 ? n : end + 1
      continue
    }
    if (c === '/' && next === '*') {
      const end = sql.indexOf('*/', i + 2)
      if (end < 0) throw new SqlGuardError('unterminated block comment')
      i = end + 2
      continue
    }
    // 单引号字符串。PostgreSQL 的 E'...' 支持反斜杠转义；MySQL 始终支持反斜杠转义。
    if (c === "'") {
      const escapes = dialect === 'mysql' || (i > 0 && (sql[i - 1] === 'E' || sql[i - 1] === 'e') && !isWordPart(sql[i - 2] ?? ' '))
      const { end, value } = readQuoted(sql, i, "'", escapes)
      out.push({ t: 'str', v: value, pos: i })
      i = end
      continue
    }
    // 双引号：PostgreSQL 为标识符，MySQL 为字符串
    if (c === '"') {
      const { end, value } = readQuoted(sql, i, '"', dialect === 'mysql')
      out.push({ t: dialect === 'mysql' ? 'str' : 'ident', v: value, pos: i })
      i = end
      continue
    }
    if (c === '`') {
      if (dialect !== 'mysql') throw new SqlGuardError('backtick identifiers are only valid in mysql')
      const { end, value } = readQuoted(sql, i, '`', false)
      out.push({ t: 'ident', v: value, pos: i })
      i = end
      continue
    }
    // PostgreSQL 美元引用字符串：$tag$ ... $tag$
    if (c === '$' && dialect === 'postgresql') {
      const m = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(i))
      if (m) {
        const close = sql.indexOf(m[0], i + m[0].length)
        if (close < 0) throw new SqlGuardError('unterminated dollar-quoted string')
        out.push({ t: 'str', v: sql.slice(i + m[0].length, close), pos: i })
        i = close + m[0].length
        continue
      }
    }
    if (isWordStart(c)) {
      let j = i + 1
      while (j < n && isWordPart(sql[j])) j++
      out.push({ t: 'word', v: sql.slice(i, j).toLowerCase(), pos: i })
      i = j
      continue
    }
    if (/[0-9]/.test(c)) {
      let j = i + 1
      while (j < n && /[0-9.]/.test(sql[j])) j++
      out.push({ t: 'num', v: sql.slice(i, j), pos: i })
      i = j
      continue
    }
    out.push({ t: 'punct', v: c, pos: i })
    i++
  }
  return out
}

function readQuoted(sql, start, quote, backslashEscapes) {
  let value = ''
  let i = start + 1
  while (i < sql.length) {
    const c = sql[i]
    if (backslashEscapes && c === '\\' && i + 1 < sql.length) {
      value += sql[i + 1]
      i += 2
      continue
    }
    if (c === quote) {
      if (sql[i + 1] === quote) {
        value += quote
        i += 2
        continue
      }
      return { end: i + 1, value }
    }
    value += c
    i++
  }
  throw new SqlGuardError(`unterminated ${quote === "'" ? 'string literal' : 'quoted identifier'}`)
}

export class SqlGuardError extends Error {
  /** @param {string} message 面向用户的拒绝原因。 */
  constructor(message) {
    super(message)
    this.name = 'SqlGuardError'
  }
}

/**
 * 检查只读 SQL。通过时返回原始文本（未做任何改写）。
 * @param {string} sql 调用方原始语句
 * @param {{dialect: 'postgresql'|'mysql', forbiddenTables?: string[], forbiddenColumns?: string[]}} options
 * @returns {{ok: true, sql: string, tables: string[]} | {ok: false, reason: string}}
 */
export function checkReadonlySql(sql, { dialect, forbiddenTables = [], forbiddenColumns = [] }) {
  if (!DIALECTS.includes(dialect)) return { ok: false, reason: `unknown dialect: ${dialect}` }
  if (typeof sql !== 'string' || sql.trim() === '') return { ok: false, reason: 'empty sql' }
  let tokens
  try {
    tokens = tokenize(sql, dialect)
  } catch (err) {
    if (err instanceof SqlGuardError) return { ok: false, reason: err.message }
    throw err
  }
  if (tokens.length === 0) return { ok: false, reason: 'empty sql' }

  // 多语句：分号后仍有单元即拒绝；末尾分号允许
  const semi = tokens.findIndex((t) => t.t === 'punct' && t.v === ';')
  if (semi >= 0 && semi !== tokens.length - 1) return { ok: false, reason: 'multiple statements are not allowed' }
  const body = semi >= 0 ? tokens.slice(0, semi) : tokens
  if (body.length === 0) return { ok: false, reason: 'empty sql' }

  const first = body[0]
  if (first.t !== 'word' || (first.v !== 'select' && first.v !== 'with')) {
    return { ok: false, reason: 'only SELECT or WITH ... SELECT is allowed' }
  }

  for (let k = 0; k < body.length; k++) {
    const tok = body[k]
    if (tok.t !== 'word') continue
    const prev = body[k - 1]
    const nextTok = body[k + 1]
    const atStart = k === 0
    const afterParen = prev?.t === 'punct' && prev.v === '('
    const isCall = nextTok?.t === 'punct' && nextTok.v === '('
    if (ALWAYS_FORBIDDEN.has(tok.v)) {
      return { ok: false, reason: `keyword not allowed in read-only mode: ${tok.v.toUpperCase()}` }
    }
    if (STATEMENT_START_FORBIDDEN.has(tok.v)) {
      // 函数调用形式（replace(...)、lock 作为列名）合法；语句或子查询开头的写动词不合法。
      const writesHere = atStart || (afterParen && !isCall)
      if (writesHere) return { ok: false, reason: `keyword not allowed in read-only mode: ${tok.v.toUpperCase()}` }
    }
    if (FORBIDDEN_FUNCTIONS.has(tok.v) && isCall) {
      return { ok: false, reason: `function not allowed in read-only mode: ${tok.v}` }
    }
  }

  const tables = extractTables(body)
  const forbidden = new Set(forbiddenTables.map((t) => t.toLowerCase()))
  const hitTable = tables.find((t) => forbidden.has(t.toLowerCase()))
  if (hitTable) return { ok: false, reason: `table is forbidden by policy: ${hitTable}` }
  const forbiddenCols = new Set(forbiddenColumns.map((c) => c.toLowerCase()))
  const hitCol = body.find((t) => (t.t === 'word' || t.t === 'ident') && forbiddenCols.has(String(t.v).toLowerCase()))
  if (hitCol) return { ok: false, reason: `column is forbidden by policy: ${hitCol.v}` }

  return { ok: true, sql, tables }
}

/**
 * 粗粒度提取 FROM / JOIN 之后的表名（不含 schema 前缀时保留最后一段）。
 * 用于策略的 forbiddenTables 检查；无法解析时不误报，策略检查以数据源账号权限为最终边界。
 */
export function extractTables(body) {
  const names = []
  for (let k = 0; k < body.length; k++) {
    const tok = body[k]
    if (tok.t !== 'word' || (tok.v !== 'from' && tok.v !== 'join')) continue
    let j = k + 1
    const parts = []
    while (j < body.length && (body[j].t === 'word' || body[j].t === 'ident')) {
      parts.push(String(body[j].v))
      j++
      if (body[j]?.t === 'punct' && body[j].v === '.') j++
      else break
    }
    if (parts.length > 0) names.push(parts[parts.length - 1])
  }
  return [...new Set(names)]
}
