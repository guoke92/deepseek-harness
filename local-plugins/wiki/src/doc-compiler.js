/**
 * 文档原料编译器：投影术语/流程/规则候选。
 */
import { DOC_EVIDENCE_KIND, projectDocMaterial } from '@local/contracts'
import { registerCompiler } from './compilers.js'

registerCompiler('doc', {
  supports(material) {
    return material?.sourceType === 'doc' && material?.evidence?.kind === DOC_EVIDENCE_KIND
  },
  compile(material, ctx) {
    const projection = projectDocMaterial(material, { knowledgeBaseId: ctx.knowledgeBaseId })
    return { decisions: [], okWithoutDecisions: true, projection }
  },
})
