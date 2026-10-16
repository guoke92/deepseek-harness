/**
 * 数据源面板与 /datasource 命令共用的操作。列表里的密码是掩码。
 * @param {object} api
 * @param {{op?: string, id?: number, name?: string, type?: string, host?: string, port?: number, database?: string, username?: string, password?: string, scope?: object}} body
 */
export async function dispatchDatasource(api, body) {
  const op = body?.op
  if (op === 'list') return { datasources: await api.list() }
  if (op === 'add') return await api.add(body)
  if (op === 'update') {
    if (body.id === undefined || body.id === null) throw new Error('id is required')
    return await api.update(body.id, body)
  }
  if (op === 'remove') {
    if (body.id === undefined || body.id === null) throw new Error('id is required')
    return { removed: await api.remove(body.id) }
  }
  if (op === 'catalog') {
    if (body.id === undefined || body.id === null) throw new Error('id is required')
    return await api.catalog(body.id, { database: body.database })
  }
  if (op === 'progress') return await api.progress(body.id)
  throw new Error(`unknown datasource op: ${String(op)}`)
}
