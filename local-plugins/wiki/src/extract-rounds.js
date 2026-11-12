/**
 * 采集深挖辅助：证据简报。多轮编排由 wiki-collect lead / wiki_extract_* 工具完成。
 */

/**
 * 从原料断言构造简报（白名单，截断）。
 * @param {object} material
 */
export function buildEvidenceBrief(material) {
  const assertions = material.assertions ?? []
  const evidence = material.evidence ?? {}
  const columns = assertions.filter((item) => item.kind === 'column').slice(0, 80).map((item) => ({
    name: item.payload?.name,
    type: item.payload?.type,
    comment: String(item.payload?.comment ?? '').slice(0, 120),
    key: item.key,
  }))
  const profiles = assertions.filter((item) => item.kind === 'columnProfile').slice(0, 40).map((item) => ({
    column: item.payload?.column,
    role: item.payload?.role,
    key: item.key,
    topValues: (item.payload?.domain?.values ?? []).slice(0, 8).map((row) => String(row.value ?? '').slice(0, 40)),
  }))
  const relations = assertions.filter((item) => item.kind === 'association' || item.kind === 'relation').slice(0, 40)
  return {
    materialId: material.id,
    sourceRef: material.sourceRef,
    table: evidence.table ?? assertions.find((item) => item.kind === 'table')?.payload?.name,
    tableComment: evidence.comment ?? assertions.find((item) => item.kind === 'table')?.payload?.comment ?? null,
    columns,
    profiles,
    relations: relations.map((item) => ({ key: item.key, payload: item.payload })),
    terms: evidence.terms ?? [],
  }
}
