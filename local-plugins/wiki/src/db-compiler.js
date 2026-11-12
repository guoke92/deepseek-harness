/**
 * 数据库原料的编译器。页面来自 db.table 证据，不调用模型。
 * 观测-only 刷新时返回空决策，由投影重建检索视图。
 */
import { compileDbDocument } from '@local/contracts'
import { registerCompiler } from './compilers.js'

registerCompiler('db', {
  supports(material) {
    return material?.evidence?.kind === 'db.table'
  },
  compile(material, ctx) {
    if (material.refreshKind === 'profile') {
      return { decisions: [], okWithoutDecisions: true }
    }
    return compileDbDocument(material, ctx)
  },
})