/**
 * 条目段（`## 条目`）的增量合并。update 决策只提交 patch，未提及的条目与段外正文原样保留。
 * 键与值的合法性由 @local/contracts 的 validateItemPatch 在决策入口检查。
 */
import { ITEMS_HEADER, isItemKey } from '@local/contracts'

const ITEM_RE = /^- ([^：\n]+)：(.*)$/

/** 拆出段前内容（prelude）、条目（items，保序 Map）、段后非条目内容（tail）。 */
export function parseItems(body) {
  const text = typeof body === 'string' ? body : ''
  const lines = text.split('\n')
  const h = lines.indexOf(ITEMS_HEADER)
  if (h < 0) return { prelude: text.replace(/\n+$/, ''), items: new Map(), tail: [] }
  const prelude = lines.slice(0, h).join('\n').replace(/\n+$/, '')
  const items = new Map()
  const tail = []
  for (const line of lines.slice(h + 1)) {
    const m = ITEM_RE.exec(line)
    if (m) items.set(m[1], m[2])
    else if (line.trim() !== '') tail.push(line)
  }
  return { prelude, items, tail }
}

/**
 * 应用增量补丁：upsert 覆盖（保留原位置）或追加到段尾；remove 删除。
 * @returns {string} 新正文
 */
export function mergeItems(body, patch = {}) {
  const { prelude, items, tail } = parseItems(body)
  for (const k of patch.remove ?? []) {
    if (!isItemKey(k)) throw new Error(`invalid remove key: ${JSON.stringify(k)}`)
    items.delete(k)
  }
  for (const [k, v] of Object.entries(patch.upsert ?? {})) {
    if (!isItemKey(k)) throw new Error(`invalid item key: ${JSON.stringify(k)}`)
    items.set(k, v)
  }
  const parts = []
  if (prelude) parts.push(prelude, '')
  parts.push(ITEMS_HEADER)
  for (const [k, v] of items) parts.push(`- ${k}：${v}`)
  if (tail.length > 0) parts.push('', ...tail)
  return `${parts.join('\n')}\n`
}
