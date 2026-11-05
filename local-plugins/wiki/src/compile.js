/**
 * 模型决策的 JSON 解析。数据库表不走这里，由 db 编译器根据证据生成页面。
 */
import { validateDecision } from '@local/contracts'

const SYSTEM = [
  '只输出一个 JSON 数组，不要 Markdown。',
  '每个元素是一条 Decision：schemaVersion 为 1，action 为 new、update 或 delete。',
  'new 必须有非空 body、pageType（entity、concept、relation、summary、index 之一）。relation 只用于表关联。',
  'slug 只含小写字母、数字、下划线和连字符，最多一级目录。不要出现点号。',
  'confidence 是 0 到 1 的数字。rationale 不超过 200 字。evidenceRefs 只能使用给出的原料 id。',
  'synthesis 与 comparison 不要出现在输出里。',
].join('\n')

/** @param {string} text 模型原文 @returns {object[]} */
export function parseDecisions(text) {
  const match = String(text ?? '').match(/\[[\s\S]*\]/)
  if (!match) throw new Error('model output has no JSON array')
  const parsed = JSON.parse(match[0])
  if (!Array.isArray(parsed)) throw new Error('model output is not an array')
  return parsed
}

/**
 * @param {(system: string, user: string) => Promise<string>} complete
 * @returns {(batch: object[], context: object) => Promise<object[]>}
 */
export function createModelDecider(complete) {
  return async (batch, context) => {
    const user = JSON.stringify({
      outline: context?.outline ?? '',
      materials: batch.map((item) => ({
        id: item.id,
        sourceRef: item.sourceRef,
        content: item.content,
        evidence: item.evidence ?? {},
      })),
    })
    const raw = await complete(SYSTEM, user)
    const decisions = parseDecisions(raw)
    const bad = decisions.map((item) => validateDecision(item)).find((item) => !item.ok)
    if (bad) throw new Error(bad.errors.join('; '))
    return decisions
  }
}

/**
 * 读完一次模型流里的正文。
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
