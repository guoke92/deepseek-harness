/**
 * 数据库原料的编译器。页面来自 db.table 证据，不调用模型。
 */
import { compileDbDocument } from '@local/contracts'
import { registerCompiler } from './compilers.js'

registerCompiler('db', {
  supports(material) {
    return material?.evidence?.kind === 'db.table'
  },
  compile(material, ctx) {
    return compileDbDocument(material, ctx)
  },
})
