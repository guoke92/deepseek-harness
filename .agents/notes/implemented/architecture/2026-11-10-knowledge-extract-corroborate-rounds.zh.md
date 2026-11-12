# Agent Note: 知识深挖多轮与印证编译

Status: implemented

[English](2026-11-10-knowledge-extract-corroborate-rounds.md) | 中文

## Problem

Domain Pack 勾选把行业先验做成配置壳；采集只写固定库表事实，编译要么纯离线规则，要么容易把模型 Wiki 长文当真理。无法尽量榨取直接/间接/隐含知识，无法单源初串联，也无法在完整性闭环下用多源与常识相互印证。

## Decision

落地无 Pack、由对等 lead preset 编排的两段流水线。

1. **采集 L0** 仍为确定性工具（`wiki_collect_l0`）与双指纹；模型不得改写 L0。
2. **面板采集**先由宿主跑确定性 `wiki_collect_l0` 与规则 extract 脚手架，再启动 `wiki-collect`。Lead 用 `wiki_extract_*` 深挖（可委派 subagent）。Lead 失败时保留 L0 并以 `done_partial` 结束。
3. **面板编译**先由宿主跑 `wiki_project_technical`，再启动 `wiki-compile`。Lead 经 `wiki_corroborate_apply` 写入 `CompileJudgement`（不是页面 Decision）。Lead 失败时保留技术投影。
4. 宿主自建 `wikiModelComplete` 多轮环不再是产品主路径。无 agents 时面板保留确定性段并以 `done_partial` 结束。

完整性与停条件仍落在工具契约与 lead 提示中；不以模型 Markdown 页当知识本体。

本决策取代 [2026-11-09-knowledge-coarse-fine-compile](../../rejected/architecture/2026-11-09-knowledge-coarse-fine-compile.zh.md) 中以 Pack 为业务层的路线（已因该理由拒绝）。

## Alternatives considered

- **保留 Domain Pack YAML 先验。** 拒绝：把模型常识重复成勾选配置，偏离证据锚定。
- **以 `createModelDecider` 页面 Decision 作编译主链。** 拒绝：回到散文当真理。
- **在 L0 采样阶段调模型。** 拒绝：破坏指纹可复现；深挖放在 L0 之后。

## Consequences

- 删除 `wiki_set_packs` / `packs.js` / SCF Pack UI。
- 面板采集/编译先在宿主跑 L0 或技术投影，再启动 `wiki-collect` / `wiki-compile`；宿主自建多轮环仅遗留/测试。
- 测试覆盖契约门禁工具；CI 不依赖真实模型完成 L0/技术投影。
- lead 未认完整时可出现 `done_partial`。

## Required verification

- `local-plugins/contracts` 与 `local-plugins/wiki` 下 `node --test`：收束规则、深挖封印、印证写入、无 Pack 工具。
