/**
 * Wiki 页面记录与删除提议。
 * 发布正文与草稿是同一条页面记录上的两个字段（published / draft），不是两个目录里的两份文件。
 * 低置信更新只写草稿字段；人确认草稿后草稿覆盖发布正文并递增版本。
 */
import { PAGE_TYPES, EDIT_SOURCES, PROPOSAL_STATUS, DECISION_SOURCES } from './enums.js'
import { checkVersion, checkEnum, finish, isIso, isInt, isObj, isStr, isStrArr, isUnit } from './common.js'
import { isSlug, validateBodyLinks } from './slug.js'

export const PAGE_STATUS = Object.freeze(['draft_only', 'published', 'published_with_draft', 'archived'])

/**
 * 页面记录。content 可为空（草稿仅存在时 published 为 null）。
 * 版本只在覆盖发布正文前递增，并在覆盖前写入一份整页快照（由 wiki 存储完成，这里只校验形状）。
 */
export function validateWikiPage(o) {
  if (!isObj(o)) return finish(['value must be an object'])
  const e = []
  checkVersion(o, e)
  if (!isSlug(o.slug)) e.push('slug must be a valid page slug')
  checkEnum(o.pageType, PAGE_TYPES, 'pageType', e)
  if (!isStr(o.title) || o.title.length > 200) e.push('title must be a non-empty string of at most 200 characters')
  checkEnum(o.status, PAGE_STATUS, 'status', e)
  if (!isInt(o.version, 0)) e.push('version must be a non-negative integer')
  if (o.published !== null) {
    if (!isObj(o.published)) e.push('published must be null or an object')
    else e.push(...validatePageContent(o.published, 'published'))
  }
  if (o.draft !== null) {
    if (!isObj(o.draft)) e.push('draft must be null or an object')
    else e.push(...validatePageContent(o.draft, 'draft'))
  }
  const hasPub = isObj(o.published)
  const hasDraft = isObj(o.draft)
  if (o.status === 'draft_only' && (hasPub || !hasDraft)) e.push('draft_only pages need a draft and no published content')
  if (o.status === 'published' && (!hasPub || hasDraft)) e.push('published pages need published content and no draft')
  if (o.status === 'published_with_draft' && (!hasPub || !hasDraft)) e.push('published_with_draft pages need both published and draft content')
  if (o.status === 'archived' && hasDraft) e.push('archived pages must not carry a draft')
  if (o.status !== 'draft_only' && o.status !== 'archived' && o.version < 1) e.push('published pages must have version >= 1')
  if (!Array.isArray(o.links) || !o.links.every((x) => isSlug(x))) e.push('links must be slug[] (outgoing [[slug]] targets)')
  if (!Array.isArray(o.backlinks) || !o.backlinks.every((x) => isSlug(x))) e.push('backlinks must be slug[] (derived from others\' links)')
  return finish(e)
}

function validatePageContent(c, name) {
  const e = []
  if (!isStr(c.summary) || c.summary.length > 300) e.push(`${name}.summary must be a string of at most 300 characters`)
  if (typeof c.body !== 'string' || c.body.length === 0) e.push(`${name}.body must be a non-empty string`)
  else e.push(...validateBodyLinks(c.body).errors.map((x) => `${name}.${x}`))
  if (!isUnit(c.confidence)) e.push(`${name}.confidence must be a number in [0, 1]`)
  if (!isStrArr(c.aliases)) e.push(`${name}.aliases must be string[]`)
  if (!isStrArr(c.sources)) e.push(`${name}.sources must be string[] of material ids`)
  checkEnum(c.editSource, DECISION_SOURCES, `${name}.editSource`, e)
  if (!isIso(c.editedAt)) e.push(`${name}.editedAt must be an ISO-8601 timestamp`)
  return e
}

/** 页面版本快照（覆盖前整份保存）。 */
export function validatePageRevision(o) {
  if (!isObj(o)) return finish(['value must be an object'])
  const e = []
  if (!isSlug(o.slug)) e.push('slug must be a valid page slug')
  if (!isInt(o.version, 1)) e.push('version must be a positive integer')
  checkEnum(o.source, EDIT_SOURCES, 'source', e)
  if (!isObj(o.snapshot)) e.push('snapshot must be an object')
  else e.push(...validatePageContent(o.snapshot, 'snapshot'))
  if (!isIso(o.createdAt)) e.push('createdAt must be an ISO-8601 timestamp')
  return finish(e)
}

/** 删除提议（decision.action = delete 的落地形式）。 */
export function validateDeleteProposal(o) {
  if (!isObj(o)) return finish(['value must be an object'])
  const e = []
  checkVersion(o, e)
  if (o.kind !== undefined && o.kind !== 'delete') e.push("kind must be 'delete' when present")
  if (!isStr(o.id)) e.push('id must be a non-empty string')
  if (!isSlug(o.slug)) e.push('slug must be a valid page slug')
  if (!isStr(o.reason) || o.reason.length > 200) e.push('reason must be a non-empty string of at most 200 characters')
  if (!isStr(o.decisionId)) e.push('decisionId must be a non-empty string')
  if (!isIso(o.createdAt)) e.push('createdAt must be an ISO-8601 timestamp')
  checkEnum(o.status, PROPOSAL_STATUS, 'status', e)
  return finish(e)
}

/** 审核提议（hold 等证据不足的字典或关系，进入审核区）。 */
export function validateReviewProposal(o) {
  if (!isObj(o)) return finish(['value must be an object'])
  const e = []
  checkVersion(o, e)
  if (o.kind !== 'review') e.push("kind must be 'review'")
  if (!isStr(o.id)) e.push('id must be a non-empty string')
  if (!isSlug(o.slug)) e.push('slug must be a valid page slug')
  if (!isStrArr(o.reasons) || o.reasons.length === 0) e.push('reasons must be a non-empty string[]')
  if (!isStr(o.decisionId)) e.push('decisionId must be a non-empty string')
  if (!isIso(o.createdAt)) e.push('createdAt must be an ISO-8601 timestamp')
  checkEnum(o.status, PROPOSAL_STATUS, 'status', e)
  return finish(e)
}
