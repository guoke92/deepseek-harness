/**
 * @local/contracts：数据分析体系跨插件的数据结构与校验（schemaVersion 1）。
 *
 * 纯函数，无 IO，无存储、无业务决策。datasource、wiki、analyst、memory 只通过这里共享形状。本包不是插件。
 * 每个 validateXxx 返回 { ok, errors }。
 */
export { SCHEMA_VERSION } from './common.js'
export * from './enums.js'
export { validateSlug, validateBodyLinks, parseWikiLinks, isSlug, SLUG_RE, MAX_SLUG_LENGTH } from './slug.js'
export {
  MATERIAL_ID_RE, MAX_CONTENT_CHARS, validateMaterialInput, validateRawMaterial,
  validateMaterialTransition, contentHashOf, materialIdempotencyKey, findCredentialKeys,
} from './materials.js'
export { ITEMS_HEADER, MAX_ITEM_VALUE_CHARS, isItemKey, validateItemPatch } from './items.js'
export {
  MAX_RATIONALE_CHARS, MAX_BODY_CHARS, validateBody, validateDecision, validateReviewInfo, routeDecision,
} from './decisions.js'
export {
  PAGE_STATUS, validateWikiPage, validatePageRevision, validateDeleteProposal, validateReviewProposal,
} from './pages.js'
export {
  MEMORY_CONTENT_MAX_CHARS, MEMORY_TOPIC_MAX_CHARS, MEMORY_DEFAULT_MAX_ITEMS, validateMemoryItem,
  normalizeTopicKey, validateMemoryTombstone, validateSupersede, validateActiveCount,
} from './memory.js'
export { defaultPolicy, validatePolicy, validatePolicyScope, mergePolicy } from './policy.js'
export { LOG_TYPES, formatLogEntry, parseLogEntry } from './log.js'
