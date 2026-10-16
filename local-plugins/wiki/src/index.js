/**
 * @local/wiki：纯函数层与宿主服务的公共出口。
 */
export { createSerialQueue } from './queue.js'
export { mergeItems, parseItems } from './items.js'
export { applyDecision, promoteDraft, revertTo, DEFAULT_THRESHOLDS } from './apply.js'
export { createWikiStore, createMemoryTable } from './store.js'
export { computeLinks, deadLinks, graphOverview, graphExpand } from './links.js'
export { runDecisionBatch } from './pipeline.js'
export { createWikiService } from './service.js'
export { wikiDomainSpec } from './domain.js'
