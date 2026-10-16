# @local/datasource

数据源插件。拥有连接、加密凭据、结构剖析和只读 SQL。

向宿主提供 `localDatasource`。模型工具只有 `datasource_list` 和 `datasource_add`。`/datasource` 还接受 `update`、`remove` 与 `catalog`：更新时密码留空表示不改凭据，`catalog` 列出可勾选的库和表。剖析结果交给 wiki 保存，问数执行由 analyst 调用 `runReadonly`，并带上策略里的禁用表和列。

密钥文件默认是 `~/.dsh-datasource/secret.key`（0600）。

运行测试：`node --test test/*.test.mjs`
