/**
 * 条目段（`## 条目`，每行 `- 键：值`）的增量补丁校验。
 * 字典页与关系页的 update 只提交 upsert / remove，落地时合并进既有正文，未提及的条目保留。
 */
import { finish, isObj } from './common.js'

export const ITEMS_HEADER = '## 条目'
export const MAX_ITEM_VALUE_CHARS = 500

/** 条目键：非空、单行、首尾无空白、不含全角冒号（条目行格式为 `- 键：值`）。 */
export function isItemKey(k) {
  return typeof k === 'string' && k.length > 0 && k.length <= 200 && k.trim() === k && !/[\n\r：]/.test(k)
}

/** 增量补丁：upsert（新增或覆盖）与 remove（删除），至少改动一项。 */
export function validateItemPatch(p) {
  if (!isObj(p)) return finish(['patch must be an object {upsert?, remove?}'])
  const e = []
  const ups = p.upsert === undefined ? {} : p.upsert
  const rem = p.remove === undefined ? [] : p.remove
  if (!isObj(ups)) e.push('patch.upsert must be an object')
  if (!Array.isArray(rem) || !rem.every((x) => typeof x === 'string')) e.push('patch.remove must be string[]')
  if (isObj(ups)) {
    for (const [k, v] of Object.entries(ups)) {
      if (!isItemKey(k)) e.push(`invalid item key: ${JSON.stringify(k)}`)
      if (typeof v !== 'string' || v.length === 0 || /[\n\r]/.test(v)) e.push(`item ${k} needs a single-line non-empty value`)
      else if (v.length > MAX_ITEM_VALUE_CHARS) e.push(`item ${k} value must be at most ${MAX_ITEM_VALUE_CHARS} characters`)
    }
  }
  if (Array.isArray(rem)) for (const k of rem) if (!isItemKey(k)) e.push(`invalid remove key: ${JSON.stringify(k)}`)
  const n = (isObj(ups) ? Object.keys(ups).length : 0) + (Array.isArray(rem) ? rem.length : 0)
  if (n === 0) e.push('patch must change at least one item')
  return finish(e)
}
