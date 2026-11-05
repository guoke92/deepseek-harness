/**
 * Wiki 决策（pipeline 输出的 Decision[]，结构化输出）。
 * new 必须给正文；update 只给正文或增量补丁（二者必须且只能取其一）；delete 只生成删除提议，不直接删页。
 */
import { DECISION_ACTIONS, PIPELINE_PAGE_TYPES } from './enums.js'
import { checkVersion, checkEnum, finish, isObj, isStrArr, isUnit, isStr } from './common.js'
import { isSlug, validateBodyLinks } from './slug.js'
import { validateItemPatch } from './items.js'

export const MAX_RATIONALE_CHARS = 200
export const MAX_BODY_CHARS = 100000

/** 页面正文的合法性：字符串且不超长，链接可解析。 */
export function validateBody(body) {
  if (typeof body !== 'string') return finish(['body must be a string'])
  const e = []
  if (body.length > MAX_BODY_CHARS) e.push(`body must be at most ${MAX_BODY_CHARS} characters`)
  e.push(...validateBodyLinks(body).errors)
  return finish(e)
}

/** 决策中的审核信息（hold 等证据不足的项，进入审核区而非丢弃）。 */
export function validateReviewInfo(r) {
  if (!isObj(r)) return finish(['review must be an object'])
  if (!Array.isArray(r.reasons) || r.reasons.length === 0 || !r.reasons.every((x) => isStr(x))) {
    return finish(['review.reasons must be a non-empty string[]'])
  }
  return finish([])
}

/** Decision 输出（模型结构化输出，尚未落地）。 */
export function validateDecision(o) {
  if (!isObj(o)) return finish(['value must be an object'])
  const e = []
  checkVersion(o, e)
  checkEnum(o.action, DECISION_ACTIONS, 'action', e)
  if (!isSlug(o.slug)) e.push('slug must be a valid page slug')
  if (!isUnit(o.confidence)) e.push('confidence must be a number in [0, 1]')
  if (typeof o.rationale !== 'string' || o.rationale.length > MAX_RATIONALE_CHARS) {
    e.push(`rationale must be a string of at most ${MAX_RATIONALE_CHARS} characters`)
  }
  if (!isStrArr(o.evidenceRefs) || o.evidenceRefs.length === 0 || o.evidenceRefs.some((x) => x.length === 0)) {
    e.push('evidenceRefs must be a non-empty string[] of material ids')
  }
  const hasBody = typeof o.body === 'string'
  const hasPatch = isObj(o.patch)
  if (o.body !== null && o.body !== undefined && !hasBody) e.push('body must be null or a string')
  if (o.patch !== undefined && o.patch !== null && !hasPatch) e.push('patch must be an object or null')
  if (o.action === 'new') {
    if (!hasBody || o.body.length === 0) e.push('new decisions need a non-empty body')
    if (hasPatch) e.push('new decisions must not carry patch')
  }
  if (o.action === 'update') {
    if (hasBody === hasPatch) e.push('update decisions need exactly one of body or patch')
    if (hasPatch) e.push(...validateItemPatch(o.patch).errors)
  }
  if (o.action === 'delete') {
    if (hasBody || hasPatch) e.push('delete decisions must carry neither body nor patch')
  }
  if (hasBody) e.push(...validateBody(o.body).errors)
  // 流水线决策只能创建四类自动页面；synthesis 与 comparison 只能由人或 agent 手写。
  if (o.pageType !== undefined && !PIPELINE_PAGE_TYPES.includes(o.pageType)) {
    e.push(`pageType must be one of: ${PIPELINE_PAGE_TYPES.join(', ')}`)
  }
  if (o.action === 'new' && o.pageType === undefined) e.push('new decisions need pageType')
  if (o.review !== undefined && o.review !== null) {
    if (o.action !== 'new') e.push('review is only valid for new decisions')
    e.push(...validateReviewInfo(o.review).errors)
  }
  return finish(e)
}

/** 决策分流：按置信度与阈值决定落地方式。 */
export function routeDecision(decision, { autoPublishThreshold, draftThreshold }) {
  if (decision.action === 'delete') return 'proposal'
  if (decision.confidence >= autoPublishThreshold) return 'publish'
  if (decision.confidence >= draftThreshold) return 'draft'
  return 'log'
}
