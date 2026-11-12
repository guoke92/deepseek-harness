# @local/contracts

四个插件共享的校验函数（schemaVersion 1）。纯函数，无 IO，不是插件。

包含原料、决策、页面、提议、记忆和策略合并。数据库表文档也在这里：`db.table` 证据的校验、正文渲染和页面决策。datasource 写入证据，wiki 的 db 编译器调用同一份渲染。本包不做采样，也不调用模型。

类型化断言与双指纹（`buildDbAssertions` / `buildCodeAssertions` / `buildDocAssertions` / `assertionsOf`）、检索命中与 `resolveRetrievalHits`、以及 db/code/doc/沉淀投影纯函数也在这里，供粗加工与精加工共用。

采集深挖与编译印证合同也在这里：`CompletenessVerdict`、`ExtractBundle`、`CompileJudgement`、以及 `decideRoundStop` 多轮收束判定。禁止以页面 Markdown body 作为编译判决主字段；不包含 Domain Pack 实例。

运行测试：`node --test test/*.test.mjs`
