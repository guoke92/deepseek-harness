/**
 * @local/memory 纯函数层出口。宿主服务与 Harness 接线在 plugin.js。
 */
export { extractExplicitMemory } from './explicit.js'
export { topicKey, fingerprint } from './topic.js'
export { createMemoryStore } from './store.js'
export { buildRecall } from './recall.js'
