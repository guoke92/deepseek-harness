/**
 * 候选生成（论文第 2、3 节 + SQLBot 的 proposed 规则）。
 * 产出 contracts.Candidate 的数组：join（关联）、dict（字典，低基数）、value_domain（值域包含证据）。
 * 纯函数：输入为 buildProfile 的结果列表，不做 IO。
 */
import { resemblance, containment } from './minhash.js'

const COMPAT_NUMERIC = /^(int|integer|bigint|smallint|tinyint|mediumint|number|numeric|decimal)/i
const COMPAT_TEXT = /(char|text|varchar)/i

/** 类型兼容：数值与数值、文本与文本，另允许 bigint/int 与 varchar（Java Long→String 常规，见 SQLBot 规则）。 */
export function typesCompatible(a, b) {
  const ta = String(a.dataType ?? '')
  const tb = String(b.dataType ?? '')
  const numA = COMPAT_NUMERIC.test(ta)
  const numB = COMPAT_NUMERIC.test(tb)
  const txtA = COMPAT_TEXT.test(ta)
  const txtB = COMPAT_TEXT.test(tb)
  if (numA && numB) return true
  if (txtA && txtB) return true
  if ((numA && txtB) || (txtA && numB)) return true
  return false
}

/** 列名语义：同名，或一方为对方表名的 `<table>_id` / `<table>` 形式，或 `*_id` 对 `id`。 */
export function nameSimilarity(left, right) {
  const l = left.column.toLowerCase()
  const r = right.column.toLowerCase()
  if (l === r) return { score: 1, reason: 'same_name' }
  const lt = left.table.toLowerCase()
  const rt = right.table.toLowerCase()
  if (r === `${lt}_id` || r === `${lt}id` || r === lt) return { score: 0.8, reason: `${right.column} refers to ${left.table}` }
  if (l === `${rt}_id` || l === `${rt}id` || l === rt) return { score: 0.8, reason: `${left.column} refers to ${right.table}` }
  if (l.endsWith('_code') && r.endsWith('_code')) return { score: 0.6, reason: 'both *_code' }
  return { score: 0, reason: null }
}

/** 注释中的显式 table#column 引用（优先于列名启发式）。 */
export function commentRef(comment) {
  if (!comment) return null
  const m = /([A-Za-z_][\w]*)#([A-Za-z_][\w]*)/.exec(comment)
  return m ? { table: m[1], column: m[2] } : null
}

/**
 * 生成候选。
 * @param {Array<object>} profiles buildProfile 产出的列剖析
 * @param {object} opts
 * @param {number} opts.minOverlap 值域相似度阈值（默认 0.2）
 * @param {number} opts.dictDistinctMax 字典阈值
 */
export function generateCandidates(profiles, { minOverlap = 0.2, dictDistinctMax = 32 } = {}) {
  const out = []
  const eligible = profiles.filter((p) => p.skipReason === null && p.minhash !== null)

  // 字典候选：低基数列（每列一条，status=candidate，等待 dict_triage）
  for (const p of profiles) {
    if (p.skipReason !== null || !p.isDictLike) continue
    if (p.distinctCount === 0 || p.distinctCount > dictDistinctMax) continue
    out.push({
      schemaVersion: 1,
      kind: 'dict',
      left: { table: p.table, column: p.column },
      right: null,
      evidence: {
        distinctCount: p.distinctCount,
        topK: p.topK.slice(0, 10),
        commentRef: null,
        valuesSample: p.topK.map((x) => String(x.value)).slice(0, 32),
      },
      authenticity: 'unknown',
      priority: 'primary',
      status: 'candidate',
    })
  }

  // 注释显式引用（comment_fk，最高优先）
  for (const p of profiles) {
    const ref = commentRef(p.comment)
    if (!ref) continue
    const target = profiles.find((q) => q.table === ref.table && q.column === ref.column)
    if (!target) continue
    out.push({
      schemaVersion: 1,
      kind: 'join',
      left: { table: p.table, column: p.column },
      right: { table: target.table, column: target.column },
      evidence: { commentRef: `${ref.table}#${ref.column}`, nameSimilarity: null, overlapEstimate: null },
      authenticity: 'comment_fk',
      priority: 'primary',
      status: 'candidate',
    })
  }

  // 值域候选：两两比较（同类型、非跳过列），MinHash 估计 + 名称证据
  for (let i = 0; i < eligible.length; i++) {
    for (let j = i + 1; j < eligible.length; j++) {
      const a = eligible[i]
      const b = eligible[j]
      if (a.table === b.table && a.column === b.column) continue
      // 低基数列（字典候选）不参与值域关联：小集合的 Jaccard 天然偏高，会与任意列伪重合
      if (a.isDictLike || b.isDictLike) continue
      if (!typesCompatible(a, b)) continue
      const jac = resemblance(a.minhash, b.minhash)
      if (jac === null) continue
      const name = nameSimilarity(a, b)
      const overlapOk = jac >= minOverlap
      const nameOk = name.score > 0
      if (!overlapOk && !nameOk) continue
      const cont = containment(jac, a.distinctCount, b.distinctCount)
      // 仅名称相似、值域不重合：不进入候选（SQLBot：名称单独不成立）
      if (!overlapOk) continue
      // 值域契合且名称有语义 → name_match（likely）；仅值域 → unknown（保留，不进 JOIN 图）
      // 同表内两列：值域重合只说明取值形态相似（如两列都是小而唯一的编码），
      // 不足以证明关联。一律降为 unknown，优先级 secondary，且不得升为 name_match。
      const sameTable = a.table === b.table
      const authenticity = nameOk && !sameTable ? 'name_match' : 'unknown'
      const priority = sameTable ? 'secondary' : 'primary'
      out.push({
        schemaVersion: 1,
        kind: 'join',
        left: { table: a.table, column: a.column },
        right: { table: b.table, column: b.column },
        evidence: {
          overlapEstimate: Number(jac.toFixed(4)),
          containment: { aInB: cont.aInB === null ? null : Number(cont.aInB.toFixed(4)), bInA: cont.bInA === null ? null : Number(cont.bInA.toFixed(4)) },
          nameSimilarity: name.score,
          nameReason: name.reason,
          distinct: { left: a.distinctCount, right: b.distinctCount },
          sameTable,
        },
        authenticity,
        priority,
        status: 'candidate',
      })
    }
  }
  return out
}
