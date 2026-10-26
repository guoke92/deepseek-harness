/**
 * 按 sourceType 注册编译器。没有注册的来源保持 captured，不套用数据库模板。
 */

const compilers = new Map()

/**
 * @param {string} sourceType
 * @param {{supports: (material: object) => boolean, compile: (material: object, ctx: object) => object[]|null}} compiler
 * @returns {() => void} 取消注册
 */
export function registerCompiler(sourceType, compiler) {
  compilers.set(sourceType, compiler)
  return () => {
    if (compilers.get(sourceType) === compiler) compilers.delete(sourceType)
  }
}

/** @param {string} sourceType */
export function compilerFor(sourceType) {
  return compilers.get(sourceType) ?? null
}
