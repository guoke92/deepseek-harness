# @local/wiki

原料和页面是一套，以知识库为基本单位。每个知识库绑定自己的数据源，并可在绑定上多选库和表；采集和编译只处理这些绑定来源。未选择范围时采集连接默认库。本插件保存只追加原料，调用 `localDatasource.collect` 把库剖析写入原料，再按决策编译成页面、链接、版本和提议。

模型工具使用 `wiki_*`。`wiki_apply_decision` 要求 `evidenceRefs` 指向已经入库的原料。`wiki_collect` 在数据源插件未安装时失败。`wiki_compile` 用当前默认模型把 captured 原料编译成页面或提议。

宿主服务名是 `localWiki`。

运行测试：`node --test test/*.test.mjs`
