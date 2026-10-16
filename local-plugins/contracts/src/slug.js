/**
 * 页面 slug 与 [[slug]] 链接解析。
 * slug 形如 `index`、`entity/ca_fee_order`、`concept/order_status`：小写字母、数字、下划线、连字符，最多一级目录。
 */
import { finish } from './common.js'

export const SLUG_RE = /^[a-z0-9][a-z0-9_-]*(\/[a-z0-9][a-z0-9_-]*)?$/
export const MAX_SLUG_LENGTH = 120
const LINK_RE = /\[\[([^\[\]\n]*)\]\]/g

export function isSlug(s) {
  return typeof s === 'string' && s.length <= MAX_SLUG_LENGTH && SLUG_RE.test(s)
}

/**
 * 从正文提取 [[slug]] 出链。
 * @returns {{slugs: string[], invalid: string[]}} slugs 去重且保序；invalid 为不符合 slug 格式的链接文本
 */
export function parseWikiLinks(body) {
  const slugs = []
  const invalid = []
  if (typeof body !== 'string') return { slugs, invalid }
  for (const m of body.matchAll(LINK_RE)) {
    const target = m[1].trim()
    if (isSlug(target)) {
      if (!slugs.includes(target)) slugs.push(target)
    } else {
      invalid.push(m[1])
    }
  }
  return { slugs, invalid }
}

/** 校验 slug 字符串本身。 */
export function validateSlug(s) {
  return finish(isSlug(s) ? [] : [`slug must match ${SLUG_RE} and be at most ${MAX_SLUG_LENGTH} characters`])
}

/** 校验正文中的链接全部可解析为 slug。 */
export function validateBodyLinks(body) {
  if (body === null) return finish([])
  if (typeof body !== 'string') return finish(['body must be a string or null'])
  const { invalid } = parseWikiLinks(body)
  return finish(invalid.map((t) => `invalid wiki link target: [[${t}]]`))
}
