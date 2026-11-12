# @local/wiki

数据分析的 wiki：原料只追加，从数据源采集入库，页面、链接、版本与提议。

面板「采集」「编译」先由宿主跑确定性段，再可选启动对等 lead preset（`wiki-collect` / `wiki-compile`）做深挖或印证：

1. **采集**：宿主 `collectL0` → 规则 `extractBundle` 脚手架封印 → lead 仅深挖（失败则保留 L0+脚手架，`done_partial`）。
2. **编译**：宿主 `projectTechnical` → lead 仅印证（失败则保留技术投影并 `noteNoModel`）。

Lead 经 `tools.restrict` 只见管道相关工具（无 datasource/MCP 等）。深挖写入 `extractBundle`，印证写入 `CompileJudgement`（不是页面 Markdown Decision）。不提供 Domain Pack 配置壳。

## 工具

模型工具使用 `wiki_*`。流水线专用：

| 工具 | 用途 |
|---|---|
| `wiki_collect_l0` | 确定性 L0（宿主主路径；面板 lead 不再调用） |
| `wiki_evidence_brief` / `wiki_extract_commit` / `wiki_extract_seal` | 深挖 |
| `wiki_project_technical` | 规则页 + 技术投影（宿主主路径） |
| `wiki_corroborate_apply` / `wiki_note_no_model` | 印证 |
| `wiki_pipeline_report` / `wiki_pipeline_finish` | 面板任务进度 |

另有 `wiki_resolve`、`wiki_apply_decision`、`wiki_ingest_*` 等。宿主服务名是 `localWiki`。宿主自建 `wikiModelComplete` 多轮环与 `wiki_deep_extract` 已退役。
