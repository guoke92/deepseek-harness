/**
 * 决策流水线：对一批原料产出 Decision[] 并落地。
 * 模型调用由注入的 decide(material, context) 完成；这里只做固定流程与 schema 重试。
 *  1. 读取 index 短摘要与相关页（context.outline、context.related）。
 *  2. decide 输出 Decision[]；不合法则整批重试一次。
 *  3. 仍不合法 → 原料记 failed（保留原因），下一次只重放 captured。
 *  4. 合法 → 逐条 applyDecision；原料 captured → decided 与 decisionId 同次写入。
 */
import { validateDecision } from '@local/contracts'
import { applyDecision } from './apply.js'

function cancelled() {
  const error = new Error('cancelled')
  error.code = 'cancelled'
  return error
}

function isAbort(error, signal) {
  return signal?.aborted === true || error?.name === 'AbortError' || error?.code === 'cancelled'
}

/**
 * @param {object[]} materials 待决策原料（status=captured）
 * @param {{decide: (batch: object[], context: object) => Promise<object[]>, context: (material: object) => object,
 *   store: object, materials: {transition: Function}, env: object, maxAttempts?: number}} deps
 * @returns {Promise<{decided: number, failed: number, outcomes: object[]}>}
 */
export async function runDecisionBatch(materials, deps) {
  const outcomes = []
  let decided = 0
  let failed = 0
  const attempts = deps.maxAttempts ?? 2
  for (let index = 0; index < materials.length; index++) {
    const material = materials[index]
    if (deps.before) await deps.before(material, index, materials.length)
    let decisions = null
    let lastError = ''
    for (let i = 0; i < attempts; i++) {
      if (deps.signal?.aborted) throw cancelled()
      let raw
      try {
        raw = await deps.decide([material], deps.context(material))
      } catch (err) {
        if (isAbort(err, deps.signal)) throw err?.code === 'cancelled' ? err : cancelled()
        lastError = `decide failed: ${String(err?.message ?? err)}`
        continue
      }
      const bad = (Array.isArray(raw) ? raw : []).map((d) => validateDecision(d)).find((r) => !r.ok)
      if (!Array.isArray(raw) || raw.length === 0) lastError = 'decide returned no decisions'
      else if (bad) lastError = `schema invalid: ${bad.errors.join('; ')}`
      else { decisions = raw; break }
    }
    if (!decisions) {
      await deps.materials.transition(material.id, 'failed', { failureReason: lastError })
      failed++
      outcomes.push({ materialId: material.id, outcome: 'failed', reason: lastError })
      continue
    }
    const decisionId = `dec_${material.id}`
    const applied = decisions.map((d) => applyDecision({ ...d, evidenceRefs: d.evidenceRefs?.length ? d.evidenceRefs : [material.id] }, { ...deps.env, decisionId, source: 'pipeline' }))
    await deps.materials.transition(material.id, 'decided', { decisionId })
    decided++
    outcomes.push({ materialId: material.id, outcome: 'decided', applied })
  }
  return { decided, failed, outcomes }
}
