/** 跨插件枚举。新增值必须同时更新 test 中的合法/非法样例。 */

export const SOURCE_TYPES = Object.freeze(['db', 'code', 'sql', 'doc', 'conversation'])
export const MATERIAL_STATUS = Object.freeze(['captured', 'decided', 'failed'])
export const DATASOURCE_TYPES = Object.freeze(['postgresql', 'mysql'])

/** 流水线可自动创建的页面类型；synthesis 与 comparison 只允许人或 agent 手写。 */
export const PIPELINE_PAGE_TYPES = Object.freeze(['entity', 'concept', 'summary', 'index'])
export const HAND_WRITTEN_PAGE_TYPES = Object.freeze(['synthesis', 'comparison'])
export const PAGE_TYPES = Object.freeze([...PIPELINE_PAGE_TYPES, ...HAND_WRITTEN_PAGE_TYPES])

export const DECISION_ACTIONS = Object.freeze(['new', 'update', 'delete'])
export const DECISION_SOURCES = Object.freeze(['pipeline', 'agent', 'user'])
export const EDIT_SOURCES = Object.freeze(['pipeline', 'agent', 'user', 'revert'])
export const PROPOSAL_STATUS = Object.freeze(['open', 'accepted', 'rejected'])

export const MEMORY_KINDS = Object.freeze(['profile', 'preference', 'interest', 'fact', 'task'])
export const RESIDENT_MEMORY_KINDS = Object.freeze(['profile', 'preference', 'interest'])
export const MEMORY_STATUS = Object.freeze(['active', 'pending', 'superseded', 'archived'])
export const MEMORY_ORIGINS = Object.freeze(['explicit', 'extracted', 'manual'])
