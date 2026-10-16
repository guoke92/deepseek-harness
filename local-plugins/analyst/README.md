# @local/analyst

问数插件，只出现在「数据分析」预设里。它不保存数据源，也不保存页面。`localAnalyst` 用 isolate 留在预设内部。

`analyst_execute_readonly` 先用 wiki 原料里的 topK 做字面值校验，再调用 `localDatasource.runReadonly`。禁用表、禁用列和行数上限来自策略。用户说「确认口径」后，预设把刚才成功的 SQL 或确认的那句话经 `deposit` 回到 wiki 原料。这个方法不注册成模型工具。

运行测试：`node --test test/*.test.mjs`
