/**
 * 对话与 SQL 沉淀原料的编译器：不写 Wiki 页决策，只走投影（Case / 口径草稿 / 指称提议）。
 */
import { isDepositMaterial, projectDepositMaterial } from '@local/contracts'
import { registerCompiler } from './compilers.js'

registerCompiler('sql', {
  supports(material) {
    return material?.sourceType === 'sql' && isDepositMaterial(material)
  },
  compile(material, ctx) {
    const projection = projectDepositMaterial(material, { knowledgeBaseId: ctx.knowledgeBaseId })
    if (!projection.okWithoutDecisions) throw new Error(projection.reason || 'deposit compile failed')
    return { decisions: [], okWithoutDecisions: true, projection }
  },
})

registerCompiler('conversation', {
  supports(material) {
    return material?.sourceType === 'conversation' && isDepositMaterial(material)
  },
  compile(material, ctx) {
    const projection = projectDepositMaterial(material, { knowledgeBaseId: ctx.knowledgeBaseId })
    if (!projection.okWithoutDecisions) throw new Error(projection.reason || 'deposit compile failed')
    return { decisions: [], okWithoutDecisions: true, projection }
  },
})
