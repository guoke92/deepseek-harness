/**
 * 采集/编译 lead 共用的契约门禁写操作（工具与单测直调）。
 * 编排（何时调用、多轮）由 lead agent / subagent 负责，不在此自建 complete 环。
 */
import {
  EXTRACT_NODE_KINDS, extractHashOf, mergeExtractDelta, validateCompletenessVerdict,
  validateCompileJudgement, validateExtractBundle, validateExtractLink, validateExtractNode,
} from '@local/contracts'
import { buildEvidenceBrief } from './extract-rounds.js'
import { applyCompileJudgement, putCoverageGap } from './corroborate-rounds.js'
import { compilerFor } from './compilers.js'
import { applyDecisions } from './apply.js'
import { projectMaterial } from './project.js'
import './db-compiler.js'
import './deposit-compiler.js'
import './code-compiler.js'
import './doc-compiler.js'

/**
 * @param {object} material
 * @param {{nodes?: object[], links?: object[], triage?: object, completeness?: object, roundIndex?: number}} delta
 */
export function commitExtractDelta(material, delta) {
  const brief = buildEvidenceBrief(material)
  const extractHash = extractHashOf({
    structureHash: material.structureHash,
    profileHash: material.profileHash,
    brief,
  })
  let bundle = {
    schemaVersion: 1,
    nodes: [...(material.extractBundle?.nodes ?? [])],
    links: [...(material.extractBundle?.links ?? [])],
    triage: material.extractBundle?.triage ?? delta.triage,
    rounds: [...(material.extractBundle?.rounds ?? [])],
    sealed: false,
    extractHash,
    completeness: material.extractBundle?.completeness,
  }
  if (delta.triage) bundle.triage = delta.triage
  const before = { nodes: [...bundle.nodes], links: [...bundle.links] }
  const nodes = (Array.isArray(delta.nodes) ? delta.nodes : [])
    .map(normalizeExtractNode)
    .filter(Boolean)
    .filter((node) => validateExtractNode(node).ok)
  const links = (Array.isArray(delta.links) ? delta.links : [])
    .filter((link) => validateExtractLink(link).ok)
  bundle = mergeExtractDelta(bundle, { nodes, links })
  bundle.extractHash = extractHash
  const addedNodes = bundle.nodes.length - before.nodes.length
  const addedLinks = bundle.links.length - before.links.length
  if (delta.roundIndex != null) {
    bundle.rounds = [
      ...bundle.rounds,
      {
        index: Number(delta.roundIndex),
        addedNodes,
        addedLinks,
        verdict: delta.completeness ?? null,
      },
    ]
  }
  if (delta.completeness) {
    const checked = validateCompletenessVerdict(delta.completeness)
    if (!checked.ok) throw new Error(`completeness invalid: ${checked.errors.join('; ')}`)
    bundle.completeness = delta.completeness
  }
  const again = validateExtractBundle(bundle)
  if (!again.ok) throw new Error(`extractBundle invalid: ${again.errors.join('; ')}`)
  return { bundle, addedNodes, addedLinks }
}

/**
 * @param {object} material
 * @param {object} completeness
 */
export function sealExtractBundle(material, completeness) {
  const checked = validateCompletenessVerdict(completeness)
  if (!checked.ok) throw new Error(`completeness invalid: ${checked.errors.join('; ')}`)
  const brief = buildEvidenceBrief(material)
  const extractHash = extractHashOf({
    structureHash: material.structureHash,
    profileHash: material.profileHash,
    brief,
  })
  const bundle = {
    schemaVersion: 1,
    nodes: [...(material.extractBundle?.nodes ?? [])],
    links: [...(material.extractBundle?.links ?? [])],
    triage: material.extractBundle?.triage,
    rounds: [...(material.extractBundle?.rounds ?? [])],
    sealed: true,
    extractHash,
    completeness,
  }
  const again = validateExtractBundle(bundle)
  if (!again.ok) throw new Error(`extractBundle invalid: ${again.errors.join('; ')}`)
  return bundle
}

/**
 * @param {object} material
 */
export function sealNoModelExtract(material) {
  return sealExtractBundle(material, {
    complete: false,
    score: 0,
    gaps: [{ kind: 'other', detail: 'model unavailable; deep extract skipped', severity: 'warning' }],
    abstainReasons: ['no_model'],
  })
}

/**
 * 规则页 + 技术投影，不跑模型印证。
 * @param {{
 *   materials: {list: Function, get: Function, transition: Function},
 *   projectTables: object,
 *   page: Function,
 *   proposals: Function,
 *   env: object,
 * }} svc
 * @param {{knowledgeBaseId: string, materialId?: string, signal?: AbortSignal}} opts
 */
export async function projectTechnical(svc, opts) {
  const knowledgeBaseId = opts.knowledgeBaseId
  const targets = svc.materials.list().filter((item) => {
    if (knowledgeBaseId && item.knowledgeBaseId !== knowledgeBaseId) return false
    if (opts.materialId) return item.id === opts.materialId
    return item.status === 'captured' || item.status === 'failed'
  })
  const outcomes = []
  let decided = 0
  let failed = 0
  for (const item of targets) {
    if (opts.signal?.aborted) {
      const err = new Error('cancelled')
      err.code = 'cancelled'
      throw err
    }
    const material = svc.materials.get(item.id)
    const baseId = knowledgeBaseId || material.knowledgeBaseId
    const compiler = compilerFor(material.sourceType)
    if (!compiler?.supports(material)) {
      outcomes.push({ materialId: material.id, outcome: 'skipped', reason: 'no compiler' })
      continue
    }
    if (material.status === 'failed') await svc.materials.transition(material.id, 'captured')
    try {
      const compiled = compiler.compile(material, {
        knowledgeBaseId: baseId,
        hasPage: (slug) => Boolean(svc.page(slug, baseId)),
        hasOpenProposal: (slug) => svc.proposals(baseId).some((row) => (
          row.slug === slug && row.status === 'open' && row.kind === 'review'
        )),
      })
      const decisions = Array.isArray(compiled) ? compiled : compiled?.decisions
      const okWithoutDecisions = !Array.isArray(compiled) && compiled?.okWithoutDecisions === true
      if (!decisions?.length && !okWithoutDecisions) {
        const reason = 'compiler returned no decisions'
        await svc.materials.transition(material.id, 'failed', { failureReason: reason })
        failed++
        outcomes.push({ materialId: material.id, outcome: 'failed', reason })
        continue
      }
      if (baseId) await projectMaterial(svc.projectTables, material, { knowledgeBaseId: baseId })
      if (decisions?.length) {
        const stamped = decisions.map((decision) => ({
          ...decision,
          evidenceRefs: decision.evidenceRefs?.length ? decision.evidenceRefs : [material.id],
        }))
        const batch = applyDecisions(stamped, {
          ...svc.env,
          knowledgeBaseId: baseId,
          decisionId: `dec_${material.id}`,
          source: 'pipeline',
        })
        if (batch.rejected) {
          await svc.materials.transition(material.id, 'failed', { failureReason: batch.rejected.reason })
          failed++
          outcomes.push({ materialId: material.id, outcome: 'failed', reason: batch.rejected.reason })
          continue
        }
      }
      await svc.materials.transition(material.id, 'decided', { decisionId: `dec_${material.id}` })
      decided++
      outcomes.push({ materialId: material.id, outcome: 'decided' })
    } catch (err) {
      const reason = String(err?.message ?? err)
      await svc.materials.transition(material.id, 'failed', { failureReason: reason })
      failed++
      outcomes.push({ materialId: material.id, outcome: 'failed', reason })
    }
  }
  return { decided, failed, outcomes }
}

/**
 * @param {object} tables
 * @param {string} knowledgeBaseId
 * @param {object[]} judgements
 */
export async function applyJudgements(tables, knowledgeBaseId, judgements) {
  const applied = []
  const rejected = []
  for (const judgement of judgements ?? []) {
    const checked = validateCompileJudgement(judgement)
    if (!checked.ok) {
      rejected.push({ judgement, errors: checked.errors })
      continue
    }
    await applyCompileJudgement(tables, knowledgeBaseId, judgement)
    applied.push(judgement.action)
  }
  return { applied: applied.length, rejected }
}

/**
 * @param {object} tables
 * @param {string} knowledgeBaseId
 * @param {string} detail
 */
export async function noteNoModelCoverage(tables, knowledgeBaseId, detail) {
  await putCoverageGap(tables, knowledgeBaseId, [{
    severity: 'no_model',
    ref: `compile:${knowledgeBaseId}`,
    detail,
  }], `__compile__:${knowledgeBaseId}`)
}

function normalizeExtractNode(node) {
  if (!node?.id || !node?.title) return null
  const kind = EXTRACT_NODE_KINDS.includes(node.kind) ? node.kind : 'concept'
  return {
    id: String(node.id),
    kind,
    title: String(node.title),
    support: ['direct', 'indirect', 'implicit'].includes(node.support) ? node.support : 'direct',
    confidence: typeof node.confidence === 'number' ? node.confidence : 0.5,
    evidenceAnchors: Array.isArray(node.evidenceAnchors) && node.evidenceAnchors.length
      ? node.evidenceAnchors
      : (Array.isArray(node.anchors) ? node.anchors : [{ ref: 'unknown' }]),
    aliases: Array.isArray(node.aliases) ? node.aliases : [],
    rationale: node.rationale,
  }
}
