/**
 * 自动提取结果：模型输出一个 JSON 数组，元素为 {kind, content}。
 * 解析失败返回空数组，不把闲聊写进记忆。
 */

const KINDS = new Set(['profile', 'preference', 'interest', 'fact', 'task'])

/** @param {string} text @returns {{kind: string, content: string}[]} */
export function parseExtractedMemories(text) {
  const match = String(text ?? '').match(/\[[\s\S]*\]/)
  if (!match) return []
  let rows
  try {
    rows = JSON.parse(match[0])
  } catch {
    return []
  }
  if (!Array.isArray(rows)) return []
  const out = []
  for (const row of rows) {
    if (!row || typeof row.content !== 'string' || !KINDS.has(row.kind)) continue
    const content = row.content.trim().replace(/\s+/g, ' ').slice(0, 300)
    if (content) out.push({ kind: row.kind, content })
  }
  return out
}
