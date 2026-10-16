/**
 * 记忆面板与 /memory 命令共用的操作。
 * @param {object} store
 * @param {string} subjectId
 * @param {{op?: string, id?: string, kind?: string, content?: string, topic?: string|null}} body
 */
export async function dispatchMemory(store, subjectId, body) {
  const op = body?.op
  if (op === 'list') {
    return {
      items: store.list(subjectId)
        .filter((item) => item.status === 'active' || item.status === 'pending')
        .map((item) => ({ id: item.id, kind: item.kind, content: item.content, topic: item.topic, status: item.status, origin: item.origin })),
    }
  }
  if (op === 'add') {
    return store.add({ subjectId, kind: body.kind, content: body.content, origin: 'manual', topic: body.topic ?? null })
  }
  if (op === 'confirm') return store.confirm(body.id)
  if (op === 'reject') return store.reject(body.id)
  if (op === 'remove') return store.remove(body.id)
  throw new Error(`unknown memory op: ${String(op)}`)
}
