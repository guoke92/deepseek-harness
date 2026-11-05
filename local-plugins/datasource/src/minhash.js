/**
 * MinHash sketch（论文 AutoMetaExtra 第 2 节）。
 * mi(f) = min_v h_i(v)，i = 1..K；两列的 resemblance 估计为对应位置相等的比例。
 * 哈希使用 32 位 murmur 式混合，种子由 splitmix 派生，结果确定可复现。
 */

const M32 = 0xffffffff

function fnv1a(str) {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

function mix(x, seed) {
  let h = (x ^ seed) >>> 0
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b)
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)
  h ^= h >>> 16
  return h >>> 0
}

const seedCache = new Map()

/** 第 i 个哈希函数的种子（splitmix32 派生，确定性）。 */
export function seedFor(i) {
  if (seedCache.has(i)) return seedCache.get(i)
  let z = (0x9e3779b9 + Math.imul(i + 1, 0x7f4a7c15)) >>> 0
  z = Math.imul(z ^ (z >>> 16), 0x85ebca6b)
  z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35)
  z = (z ^ (z >>> 16)) >>> 0
  seedCache.set(i, z)
  return z
}

/**
 * 计算一组值的 MinHash 草图。
 * @param {Iterable<string>} values 已规范化为字符串的 distinct 值
 * @param {number} k 哈希个数
 * @returns {number[] | null} 空集返回 null
 */
export function sketch(values, k = 128) {
  if (!Number.isInteger(k) || k < 8 || k > 1024) throw new RangeError('k must be an integer in 8..1024')
  const sig = new Array(k).fill(M32)
  let any = false
  const seeds = Array.from({ length: k }, (_, i) => seedFor(i))
  for (const v of values) {
    any = true
    const x = fnv1a(v)
    for (let i = 0; i < k; i++) {
      const h = mix(x, seeds[i])
      if (h < sig[i]) sig[i] = h
    }
  }
  return any ? sig : null
}

/** 两个草图的 resemblance（Jaccard 估计）。任一为 null 返回 null。 */
export function resemblance(a, b) {
  if (!a || !b) return null
  if (a.length !== b.length) throw new RangeError('sketches must have the same length')
  let eq = 0
  for (let i = 0; i < a.length; i++) if (a[i] === b[i]) eq++
  return eq / a.length
}

/**
 * 由 Jaccard 与两侧 distinct 数推出包含率（论文中的值域包含方向证据）。
 * 返回 { aInB, bInA }：A 的值有多大比例落在 B 中，反之亦然。
 */
export function containment(j, sizeA, sizeB) {
  if (j === null || sizeA <= 0 || sizeB <= 0) return { aInB: null, bInA: null }
  const inter = (j * (sizeA + sizeB)) / (1 + j)
  return {
    aInB: Math.min(1, inter / sizeA),
    bInA: Math.min(1, inter / sizeB),
  }
}
