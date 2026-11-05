/** 主题键：同一主题的新说法替代旧说法。与 contracts.normalizeTopicKey 一致的规范化。 */
export function topicKey(text) {
  return String(text ?? '').normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ')
}

/** 指纹：拒绝写入时留墓碑，避免同一句话被反复提取。 */
export function fingerprint(text) {
  let h = 0x811c9dc5
  for (const ch of topicKey(text)) h = Math.imul(h ^ ch.codePointAt(0), 0x01000193) >>> 0
  return h.toString(16).padStart(8, '0')
}
