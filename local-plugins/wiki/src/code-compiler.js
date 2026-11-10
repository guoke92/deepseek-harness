/**
 * 代码原料编译器：投影枚举/映射/流转，不强制写 Wiki 页。
 */
import { CODE_EVIDENCE_KIND, projectCodeMaterial } from '@local/contracts'
import { registerCompiler } from './compilers.js'

registerCompiler('code', {
  supports(material) {
    return material?.sourceType === 'code' && material?.evidence?.kind === CODE_EVIDENCE_KIND
  },
  compile(material, ctx) {
    const projection = projectCodeMaterial(material, { knowledgeBaseId: ctx.knowledgeBaseId })
    return { decisions: [], okWithoutDecisions: true, projection }
  },
})
