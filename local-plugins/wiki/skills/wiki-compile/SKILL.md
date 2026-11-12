---
name: wiki-compile
description: 知识库编译 lead 流程：宿主已完成技术投影后，跨源印证并应用 CompileJudgement。
---

# 知识编译 lead

宿主已跑完规则页与技术投影。你只做印证：

1. `wiki_pipeline_report(phase=corroborate)`（禁止 `wiki_project_technical`）
2. 检查 `wiki_list_pipeline_materials` 的 extractBundle；缺封印可补挖，不重跑整库 L0
3. 产出 judgements → `wiki_corroborate_apply`
4. 无法印证 → `wiki_note_no_model` + `done_partial`
5. `wiki_pipeline_finish`

禁止把 Markdown Decision 当主产物。无锚点不得 `accepted`。
