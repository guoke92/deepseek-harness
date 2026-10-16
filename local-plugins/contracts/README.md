# @local/contracts

四个插件共享的校验函数（schemaVersion 1）。纯函数，无 IO，不是插件。

包含原料、决策、页面、提议、记忆和策略合并。datasource、wiki、analyst、memory 只通过本包共享这些形状。

运行测试：`node --test test/*.test.mjs`
