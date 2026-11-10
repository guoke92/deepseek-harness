# Agent Note: Coarse materials and fine multi-source knowledge compile

Status: proposed

[English](2026-11-09-knowledge-coarse-fine-compile.md) | 中文

## Problem

本地 wiki 流水线已经能把数据库表采成原料并发布实体、字典与关系页。这条路径对耐久知识体系仍然过薄：页面正文既是真理又是检索单位；沉淀事件停在 `captured`；业务名、流程与行业先验没有落点；结构与采样统计共用一个内容哈希，观测抖动就会改写页面。

业内文档 RAG（例如 WeKnora）按解析 → 分块 → 可选 wiki/图谱分期，但把模型写的页面当作知识。语义层能稳住指标，是因为分析师手写模型。两者都不符合产品需要：多方证据堆叠进稳定元模型，对话确认走同一条编译回流。

## Proposal

在封闭元模型上把流水线拆成**粗加工**与**精加工**。

1. **粗加工**按来源侧重。数据库原料强调结构、画像与候选关联；代码将强调枚举、映射与流转；文档按亚型强调术语、场景与规则；沉淀只接受已确认的 SQL、口径或码值标签。每条原料带类型化 `assertions`，以及分开的 `structureHash` 与 `profileHash`。
2. **精加工**以知识库为范围。写入技术对象，展开可选 Domain Pack（地位为 `suggested`），对齐并编织关系，升格或打开提议，再投影页面、可重建的 RetrievalView 与 Coverage。页面不是真理源。
3. **检索**用 `wiki_resolve` 打 RetrievalView 分面（技术名、业务说法、取值、关联、问法、口径）。问数工具不得把整页关键词搜索当作主链接手段。
4. **Domain Pack** 提供行业能力问题、概念、单据类型与弱对齐提示。它们不得虚构物理列；未落地的包概念进入覆盖缺口。

### 业务元模型（封闭）

Domain、Concept、Role、DocumentType、Process、Activity、EventType、Policy、Case，外加技术资产与 Grounding。检索分面是派生投影，不是元模型种类。

### 实施切片

- **P0** — 数据库原料的断言合同与双指纹。
- **P1** — 技术对象写入、RetrievalView、`wiki_resolve`。
- **P2** — 沉淀编译为 Case / 口径草稿 / 指称提议；沉淀后触发编译。
- **P3** — Pack 对齐与覆盖缺口（先做最小供应链金融包）。
- **P4** — 结构化代码/文档投递（`code.module` / `doc.artifact`）、Pack 展开超出列对齐、问数优先 `wiki_resolve`。
- **P5+** — 自动 AST/文档抽取器；完整的流程/事件升格规则；字典呈现迁移。

## Alternatives considered

- **以模型 Wiki 为存储（WeKnora 式）。** 对库表事实拒绝：列完备性与关系阈值必须保持确定性。
- **把检索记录枚举写死成本体。** 拒绝：那会冻住问数分面，而不是来源能力与业务类型。
- **OWL/三元组库优先（Knora 式）。** 延后：复用身份与版本思路，首期不上 RDF 运行时。

## Acceptance criteria

- 数据库采集写入带有区分开的结构/观测指纹的断言；仅观测刷新且 `refreshKind` 为 `profile` 时只重建投影，不重写页面决策正文。
- 编译后，`wiki_resolve` 能为当前知识库返回字段、取值、关联与业务说法命中。
- 已确认 SQL 沉淀编译为可被 `wiki_resolve` 看到的 accepted Case。
- 可选 Domain Pack 能在 Coverage 中标记未落地概念，且不伪造表。
- 现有 wiki、datasource、contracts、analyst 单测保持通过。

## Risks

- 在业务 Concept 旁保留遗留 `concept/` 字典页，在字典呈现迁移完成前可能造成阅读混淆。
- 编译默认挂上供应链金融 Pack，可能对无关 schema 过度建议对齐；绑包已是按知识库的 `packIds`，须保持显式选择。
- 自动代码/文档抽取器尚未实现；结构化投递已覆盖枚举、映射、术语与流程，待 AST/文档解析器落地。
