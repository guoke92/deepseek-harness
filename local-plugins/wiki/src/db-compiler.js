/**
 * 数据库原料的编译器。页面来自 db.table 证据，不调用模型。
 * 观测-only 刷新时返回空决策并带 refreshProfile，由 service 只重建检索投影。
 */
import { compileDbDocument } from '@local/contracts'
import { registerCompiler } from './compilers.js'

registerCompiler('db', {
  supports(material) {
    return material?.evidence?.kind === 'db.table'
  },
  compile(material, ctx) {
    if (material.refreshKind === 'profile') {
      return { decisions: [], okWithoutDecisions: true, refreshProfile: true }
    }
    return compileDbDocument(material, ctx)
  },
})