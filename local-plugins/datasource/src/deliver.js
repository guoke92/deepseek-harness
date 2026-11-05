/**
 * 把 db.table 证据包成 wiki 可接收的原料。正文只调用 contracts 的渲染。
 */
import { renderDbTable } from '@local/contracts'

/**
 * @param {object} evidence validateDbTableEvidence 接受的证据
 * @param {number} datasourceId
 * @returns {{sourceType: 'db', sourceRef: string, datasourceId: number, content: string, evidence: object}}
 */
export function tableMaterial(evidence, datasourceId) {
  return {
    sourceType: 'db',
    sourceRef: `db:ds${datasourceId}/${evidence.table}`,
    datasourceId,
    content: renderDbTable(evidence),
    evidence,
  }
}
