/**
 * 遗留页面 Decision 批（createModelDecider）与 JSON 解析辅助。
 * 采集/编译主路径已改为 lead + 契约工具，不再注入 wikiModelComplete。
 */

/**
 * @param {AsyncIterable<{type: string, text?: string, reason?: string}>} stream
 * @returns {Promise<string>}
 */
export async function textFromStream(stream) {
  let text = ''
  for await (const chunk of stream) {
    if (chunk.type === 'text-delta' && chunk.text) text += chunk.text
    if (chunk.type === 'finish' && (chunk.reason === 'error' || chunk.reason === 'aborted')) {
      throw new Error(`model stream ${chunk.reason}`)
    }
  }
  return text
}

/**
 * 从模型原文里取出第一个 JSON 对象或数组。
 * @param {string} text
 * @returns {unknown}
 */
export function parseJsonPayload(text) {
  const raw = String(text ?? '')
  const objectMatch = raw.match(/\{[\s\S]*\}/)
  const arrayMatch = raw.match(/\[[\s\S]*\]/)
  const pick = objectMatch && arrayMatch
    ? (raw.indexOf(objectMatch[0]) <= raw.indexOf(arrayMatch[0]) ? objectMatch[0] : arrayMatch[0])
    : (objectMatch?.[0] ?? arrayMatch?.[0])
  if (!pick) throw new Error('model output has no JSON')
  return JSON.parse(pick)
}
