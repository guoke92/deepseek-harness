/**
 * Wiki 面板与 /wiki 命令共用的操作。接受删除提议只改提议状态，不删除页面。
 * @param {object} api 宿主服务
 * @param {{op?: string, slug?: string, id?: string, status?: string, datasourceId?: number, knowledgeBaseId?: string, name?: string, description?: string, version?: number, tables?: string[]|null, profileSampleRows?: number, center?: string, depth?: number}} body
 */
export async function dispatchWiki(api, body) {
  const op = body?.op
  const knowledgeBaseId = body.knowledgeBaseId
  if (op === 'bases') return { bases: await summarizeBases(api) }
  if (op === 'baseCreate') return { base: await api.createBase({ name: body.name, description: body.description }) }
  if (op === 'baseUpdate') return { base: await api.updateBase(body.id, { name: body.name, description: body.description }) }
  if (op === 'baseRemove') return { removed: await api.removeBase(body.id) }
  if (op === 'bind') return { base: await api.bindDatasource(body.id, body.datasourceId) }
  if (op === 'unbind') return { base: await api.unbindDatasource(body.id, body.datasourceId) }
  if (op === 'setScope') return { base: await api.setScope(body.id, body.datasourceId, body.tables ?? []) }
  if (op === 'outline') return { outline: await api.outline(knowledgeBaseId) }
  if (op === 'pages') return { pages: await api.pages(knowledgeBaseId) }
  if (op === 'page') return { page: await api.page(body.slug) }
  if (op === 'materials') return { materials: await api.listMaterials(knowledgeBaseId) }
  if (op === 'proposals') return { proposals: await api.proposals(knowledgeBaseId) }
  if (op === 'promote') return await api.promote(body.slug)
  if (op === 'revert') return await api.revert(body.slug, body.version)
  if (op === 'resolve') return await api.resolveProposal(body.id, body.status)
  if (op === 'collect') return await api.collect(body.datasourceId, { knowledgeBaseId, tables: body.tables ?? null, profileSampleRows: body.profileSampleRows })
  if (op === 'compile') return await api.compile(knowledgeBaseId)
  if (op === 'expand') return await api.expand(body.center ?? body.slug, { depth: body.depth ?? 1, knowledgeBaseId })
  throw new Error(`unknown wiki op: ${String(op)}`)
}

async function summarizeBases(api) {
  const bases = await api.bases()
  const pages = await api.pages()
  const materials = await api.listMaterials()
  return bases.map((base) => ({
    ...base,
    pageCount: pages.filter((page) => page.knowledgeBaseId === base.id).length,
    materialCount: materials.filter((item) => item.knowledgeBaseId === base.id).length,
  }))
}
