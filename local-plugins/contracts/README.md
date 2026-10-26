# @local/contracts

四个插件共享的校验函数（schemaVersion 1）。纯函数，无 IO，不是插件。

包含原料、决策、页面、提议、记忆和策略合并。数据库表文档也在这里：`db.table` 证据的校验、正文渲染和页面决策。datasource 写入证据，wiki 的 db 编译器调用同一份渲染。本包不做采样，也不调用模型。

运行测试：`node --test test/*.test.mjs`
