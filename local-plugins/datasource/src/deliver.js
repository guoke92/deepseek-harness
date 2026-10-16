/**
 * 把列剖析变成 wiki 可接收的原料投递（尚未分配 id）。
 * 数据源插件不保存原料；wiki 调用 collect 后自己追加。
 */
import { describeProfile } from './pipeline.js'

/**
 * @param {object} profile buildProfile 的一条结果
 * @param {number} datasourceId
 * @returns {{sourceType: 'db', sourceRef: string, datasourceId: number, content: string, evidence: object}}
 */
export function materialFromProfile(profile, datasourceId) {
  return {
    sourceType: 'db',
    sourceRef: `db:ds${datasourceId}/${profile.table}.${profile.column}`,
    datasourceId,
    content: describeProfile(profile),
    evidence: {
      rowCount: profile.rowCount,
      nullCount: profile.nullCount,
      distinctCount: profile.distinctCount,
      distinctApprox: profile.distinctApprox,
      skipReason: profile.skipReason,
      excludedDefaults: profile.excludedDefaults,
      topK: (profile.topK ?? []).slice(0, 5),
      dataType: profile.dataType,
    },
  }
}
