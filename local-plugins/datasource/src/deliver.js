/**
 * 把 db.table 证据包成 wiki 可接收的原料。正文只调用 contracts 的渲染；断言供精加工投影。
 */
import { buildDbAssertions, renderDbTable } from '@local/contracts'

/**
 * @param {object} evidence validateDbTableEvidence 接受的证据
 * @param {number} datasourceId
 * @returns {{sourceType: 'db', sourceRef: string, datasourceId: number, content: string, evidence: object, emphasis: string, assertions: object[], structureHash: string, profileHash: string}}
 */
export function tableMaterial(evidence, datasourceId) {
  const built = buildDbAssertions(evidence)
  return {
    sourceType: 'db',
    sourceRef: `db:ds${datasourceId}/${evidence.table}`,
    datasourceId,
    content: renderDbTable(evidence),
    evidence,
    emphasis: built.emphasis,
    assertions: built.assertions,
    structureHash: built.structureHash,
    profileHash: built.profileHash,
  }
}
