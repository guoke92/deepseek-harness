# Agent Note: 粗加工原料与跨源精加工

Status: rejected — 以 Domain Pack 先验当业务层；已由无 Pack 的深挖/印证多轮方案取代

[English](2026-11-09-knowledge-coarse-fine-compile.md) | 中文

## Problem

本地 wiki 流水线已能把库表采成原料并发布实体、字典与关系页，但对耐久知识体系仍过薄：页面正文既是真理又是检索单位；沉淀停在 captured；业务名与行业先验没有正确落点；结构与采样共用哈希导致观测抖动改写页面。

## Proposal

把流水线拆成粗加工与精加工，并在编译时展开可选 Domain Pack YAML 先验（如供应链金融）为 `suggested` 对象，用弱 regex 对齐写入覆盖缺口，再投影 RetrievalView。页面仍是投影，但行业知识通过知识库绑定 Pack 进入。

## Alternatives considered

- **无 Pack、证据锚定的多轮深挖与印证。** 后由 [2026-11-10-knowledge-extract-corroborate-rounds](../../implemented/architecture/2026-11-10-knowledge-extract-corroborate-rounds.zh.md) 采纳；Pack 路线因把模型常识做成勾选壳、并用 regex「对齐」代替相互印证而被拒绝。
- **以模型 Wiki 页当存储。** 本提案与继任决策均拒绝用其覆盖库表事实。
