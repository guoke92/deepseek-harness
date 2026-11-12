---
name: wiki-collect
description: 知识库采集 lead 流程：宿主已完成 L0 与规则脚手架后，单源深挖并封印 extractBundle。
---

# 知识采集 lead

宿主已跑完 L0 与规则 extract 脚手架。你只做深挖：

1. `wiki_pipeline_report(phase=extract)`（禁止 `wiki_collect_l0`）
2. `wiki_list_pipeline_materials`
3. 每表：`wiki_evidence_brief` → 多轮 `wiki_extract_commit` → `wiki_extract_seal`
4. 可 `subagent` 按表并行；汇总后 `wiki_pipeline_finish`

L0 不可改写。节点必须有 `evidenceAnchors`。不要写页面 body。
