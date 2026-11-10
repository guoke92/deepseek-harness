/**
 * 代码/文档粗加工投递：把结构化证据打成原料信封。
 */
import {
  buildCodeAssertions, buildDocAssertions, contentHashOf, renderCodeModule, renderDocArtifact,
  validateCodeModuleEvidence, validateDocArtifactEvidence,
} from '@local/contracts'

/**
 * @param {object} evidence kind=code.module
 * @param {{knowledgeBaseId?: string, sourceRef?: string}} [opts]
 */
export function codeMaterial(evidence, opts = {}) {
  const checked = validateCodeModuleEvidence(evidence)
  if (!checked.ok) throw new Error(checked.errors.join('; '))
  const built = buildCodeAssertions(evidence)
  const content = renderCodeModule(evidence)
  return {
    sourceType: 'code',
    sourceRef: opts.sourceRef ?? `code:${evidence.module}`,
    datasourceId: null,
    content,
    contentHash: contentHashOf(content),
    evidence,
    emphasis: built.emphasis,
    assertions: built.assertions,
    structureHash: built.structureHash,
    profileHash: built.profileHash,
    ...(opts.knowledgeBaseId ? { knowledgeBaseId: opts.knowledgeBaseId } : {}),
  }
}

/**
 * @param {object} evidence kind=doc.artifact
 * @param {{knowledgeBaseId?: string, sourceRef?: string}} [opts]
 */
export function docMaterial(evidence, opts = {}) {
  const checked = validateDocArtifactEvidence(evidence)
  if (!checked.ok) throw new Error(checked.errors.join('; '))
  const built = buildDocAssertions(evidence)
  const content = renderDocArtifact(evidence)
  return {
    sourceType: 'doc',
    sourceRef: opts.sourceRef ?? `doc:${evidence.docUri}`,
    datasourceId: null,
    content,
    contentHash: contentHashOf(content),
    evidence,
    emphasis: built.emphasis,
    assertions: built.assertions,
    structureHash: built.structureHash,
    profileHash: built.profileHash,
    ...(opts.knowledgeBaseId ? { knowledgeBaseId: opts.knowledgeBaseId } : {}),
  }
}
