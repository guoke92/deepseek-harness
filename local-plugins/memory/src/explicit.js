/**
 * 显式记住：用户原句包含「记住」类指令时，抽出待保存的一句话。
 * 只识别明确的指令前缀，避免把普通问句写进记忆。
 */
const PATTERNS = [/^(?:请)?(?:记住|记一下|帮我记住)[:：,，\s]*(.+)$/u, /^(?:please\s+)?remember\s+(?:that\s+)?(.+)$/iu]

/** @param {string} text 用户一条消息 @returns {string|null} 待保存内容（单行，≤300 字） */
export function extractExplicitMemory(text) {
  const line = String(text ?? '').trim().split('\n')[0].trim()
  for (const re of PATTERNS) {
    const m = re.exec(line)
    if (m && m[1].trim().length > 0) return m[1].trim().slice(0, 300)
  }
  return null
}
