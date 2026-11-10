window.__ModuleLoader__.load({
  id: '@local/wiki',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useEffect, useRef, useState } = React
    const { Menu, IconChevronDownOutlineRegular } = require('@deepseek-ai/dsh-client-ui-primitives')
    const zh = {
      nav: '知识库',
      intro: '每个知识库单独选择数据源。采集和编译只使用这个库绑定的来源',
      emptyBases: '还没有知识库',
      createBase: '新建知识库',
      createTitle: '新增知识库',
      baseName: '名称',
      baseDescription: '说明',
      unbind: '解除绑定',
      unbound: '已解除绑定',
      settings: '设置',
      baseConfig: '知识库配置',
      defaultMark: '默认',
      setDefault: '设为默认',
      pickBase: '知识库',
      pickBaseHint: '选择当前对话使用的知识库',
      pickBaseEmpty: '没有匹配的知识库',
      composerBase: '知识库',
      defaultsHint: '这里保存连接和默认采集范围。知识库绑定时先用这套，可以在知识库里单独调整',
      scopeInherited: '使用数据源默认范围',
      scopeOverride: '本知识库已单独调整范围',
      scopeDefaultTag: '默认范围',
      useDefaultScope: '恢复默认范围',
      confirmSource: '删除数据源「{name}」',
      confirmBodySource: '删除后各个知识库都不再使用这个连接',
      stepType: '选择类型',
      stepConfig: '配置数据源',
      stepScope: '选择范围',
      stepSync: '同步策略',
      existingTab: '已有数据源',
      newTab: '新增数据源',
      mysqlHint: '读取 MySQL 的表结构、字段和采样',
      pgHint: '读取 PostgreSQL 的表结构、字段和采样',
      syncLater: '稍后采集',
      syncNow: '保存后立即采集',
      syncHint: '保存后可以马上采集，也可以回到数据源卡片再采集',
      next: '下一步',
      prev: '上一步',
      wizardAdd: '添加数据源',
      wizardEdit: '编辑数据源',
      sectionBasic: '基本信息',
      sectionCredential: '凭证',
      more: '更多',
      removeBase: '删除知识库',
      emptyPages: '还没有页面。采集原料后可以编译',
      emptyMaterials: '还没有原料',
      emptySources: '还没有数据源',
      emptyProposals: '没有待处理的提议',
      sources: '数据源',
      materials: '原料',
      wiki: 'Wiki',
      proposals: '提议',
      search: '搜索页面',
      promote: '提升草稿',
      accept: '接受',
      reject: '拒绝',
      compile: '编译',
      compiling: '编译中',
      colName: '文件名',
      colTag: '标签',
      colStatus: '状态',
      aliases: '别名：',
      backlinks: '被链接',
      sourceDocs: '来源文档',
      groupBasic: '基础',
      groupStore: '存储与数据',
      sectionInfo: '基本信息',
      sectionSources: '数据源',
      sectionPacks: '领域 Pack',
      sectionInfoHint: '名称和说明只属于这个知识库',
      sectionSourcesHint: '采集和编译只使用这里绑定的数据源',
      sectionPacksHint: '可选绑定 Domain Pack；默认不绑，编译时才展开先验',
      settingsLive: '数据源的绑定会立即生效',
      packsLive: 'Pack 绑定会立即生效',
      packNone: '暂无可用 Pack',
      needSession: '先打开一个会话，再使用知识库',
      published: '已发布',
      draft_only: '草稿',
      published_with_draft: '有未发布草稿',
      archived: '已归档',
      captured: '待编译',
      decided: '已编译',
      failed: '失败',
      review: '待审核',
      reviewInProposals: '编译后到提议里审核',
      delete: '删除',
      entity: '实体',
      concept: '概念',
      relation: '关联',
      summary: '概览',
      synthesis: '综合',
      comparison: '对照',
      index: '索引',
      addSourceCard: '新增数据源',
      save: '保存',
      cancel: '取消',
      remove: '删除',
      collect: '采集',
      name: '名称',
      host: '主机',
      port: '端口',
      database: '库名',
      username: '用户名',
      password: '密码',
      passwordKeep: '密码（留空不修改）',
      collected: '新入库 {captured} 条，已有 {reused} 条',
      saved: '已保存',
      removed: '已删除',
      readerEmpty: '从左侧选择一个页面',
      scopeDbMenu: '选择库',
      scopeDbRatio: '（{selected}/{total}）',
      scopeTablesLabel: '选择库表',
      scopeSummary: '已选 {databases} 个库，{tables} 张表',
      scopeDefault: '默认库全部表',
      defaultDatabase: '默认库',
      alreadyAdded: '已添加',
      testConnection: '测试连接',
      connectReady: '连接成功，可以继续',
      connectRequired: '测试连接成功后才能继续',
      scopeLoading: '正在读取库和表',
      scopeEmpty: '没有可读的表',
      close: '关闭',
      pause: '暂停',
      resume: '继续',
      stop: '取消任务',
      taskCollect: '正在采集',
      taskCompile: '正在编译',
      taskPaused: '已暂停',
      taskDone: '任务完成',
      taskCancelled: '任务已取消',
      taskFailed: '任务失败',
      taskProgress: '{done}/{total}',
      collectOk: '采集成功',
      collectFail: '采集失败',
      collectPhaseCatalog: '读取结构',
      collectPhaseCount: '统计行数',
      collectPhaseProfile: '剖析',
      collectProgressDetail: '({current}/{total}) {phase} {detail}',
      collectTable: '{table} 表',
      filterAll: '全部',
      stepSources: '点开数据源选择库和表，再开始采集',
      stepMaterials: '数据库原料先按数据源分开，再按表、值域、连接、字典列出',
      folderTable: '表',
      folderDomain: '值域',
      folderLink: '连接',
      folderDict: '字典',
      folderOther: '其他',
      unnamedSource: '数据源 {id}',
      stepWiki: '编译完成后，在这里按类型阅读页面',
      stepProposals: '需要人工确认的编译结果会出现在这里',
      reviewAsk: '请判断两列是不是同一个业务编号',
      reviewGuide: [
        '## 要判断的事',
        '',
        '请确认下面两列是不是同一个业务编号',
        '',
        '## 这些数字怎么看',
        '',
        '- 基数：这一列有多少个不同值',
        '- 区分度：基数占非空采样行的比例。接近 1 才像主键；远小于 1 表示一个值被很多行共用',
        '- 包含率：当前列记为 A，对面列记为 B，这一格是 |A∩B| / |A|。100% 只表示 A 的取值都出现在 B 里',
        '- Jaccard：两边取值集合的重合程度。接近 1 表示几乎是同一组值',
        '- 不同值很少时，重合也可能是碰巧，所以要人确认',
        '',
        '## 接受和拒绝',
        '',
        '接受：认可这层关联。这条提议如果带有关系页正文，会写成 Wiki 页；否则只关闭提议',
        '拒绝：不建立这层关联，已有页面不变',
      ].join('\n'),
      deleteKeeps: '接受只关闭这条删除提议，不会删除页面',
      compileResult: '已编译 {decided}，失败 {failed}',
      confirmUnbind: '解除「{name}」的绑定',
      confirmDelete: '删除知识库「{name}」',
      confirmClear: '清空「{name}」的全部原料',
      confirmMaterial: '删除原料「{name}」',
      confirmBodyBase: '确认后从列表移除这个知识库',
      confirmBodyClear: '只删除原料，已编译的页面会保留',
      confirmBodyMaterial: '删除后可以重新采集',
      confirmBodyUnbind: '解除后不再从这个数据源采集，已有原料和页面会保留',
      clearMaterials: '清空原料',
      removeMaterial: '删除这条',
      readerEmptyMaterial: '从左侧选择一条原料',
      collectNone: '未采集',
      collectedDone: '采集成功',
      connectUnknown: '未检测',
      connectOk: '已连通',
      connectFailed: '连接失败',
      modeColumns: '目录和列表',
      modeReader: '目录和正文',
      editScope: '编辑范围',
      noDesc: '暂无描述',
      failDetailTitle: '编译失败',
      failProcess: '编译过程',
      failReason: '失败原因',
      failStageCompile: '生成页面决策',
      failStageApply: '写入页面',
      failStageProject: '检索投影',
      failHint: '修好原因后，点「编译原料」可重试这条',
      failUnknown: '未记录失败原因',
    }
    const en = {
      nav: 'Knowledge',
      intro: 'Each knowledge base chooses its own data sources. Collect and compile use only the sources bound to that base',
      emptyBases: 'No knowledge bases yet',
      createBase: 'New knowledge base',
      createTitle: 'New knowledge base',
      baseName: 'Name',
      baseDescription: 'Description',
      unbind: 'Unbind',
      unbound: 'Unbound',
      settings: 'Settings',
      baseConfig: 'Knowledge base',
      defaultMark: 'Default',
      setDefault: 'Set as default',
      pickBase: 'Knowledge',
      pickBaseHint: 'Choose the knowledge base for this conversation',
      pickBaseEmpty: 'No matching knowledge base',
      composerBase: 'Knowledge',
      defaultsHint: 'Connections and the default collect scope live here. A knowledge base starts from this default and can change its own copy',
      scopeInherited: 'Using the data source default',
      scopeOverride: 'This knowledge base uses its own scope',
      scopeDefaultTag: 'default range',
      useDefaultScope: 'Use the default scope',
      confirmSource: 'Delete data source "{name}"',
      confirmBodySource: 'Knowledge bases will no longer use this connection',
      stepType: 'Choose type',
      stepConfig: 'Configure',
      stepScope: 'Choose scope',
      stepSync: 'Sync',
      existingTab: 'Existing sources',
      newTab: 'New source',
      mysqlHint: 'Read MySQL tables, columns and a sample',
      pgHint: 'Read PostgreSQL tables, columns and a sample',
      syncLater: 'Collect later',
      syncNow: 'Collect after save',
      syncHint: 'Collect can start when you save, or later from the source card',
      next: 'Next',
      prev: 'Back',
      wizardAdd: 'Add data source',
      wizardEdit: 'Edit data source',
      sectionBasic: 'Profile',
      sectionCredential: 'Credentials',
      more: 'More',
      removeBase: 'Delete knowledge base',
      emptyPages: 'No pages yet. Collect materials, then compile',
      emptyMaterials: 'No materials yet',
      emptySources: 'No data sources yet',
      emptyProposals: 'No open proposals',
      sources: 'Sources',
      materials: 'Materials',
      wiki: 'Wiki',
      proposals: 'Proposals',
      search: 'Search pages',
      promote: 'Promote draft',
      accept: 'Accept',
      reject: 'Reject',
      compile: 'Compile',
      compiling: 'Compiling',
      colName: 'Name',
      colTag: 'Tag',
      colStatus: 'Status',
      aliases: 'Aliases: ',
      backlinks: 'Linked from',
      sourceDocs: 'Source documents',
      groupBasic: 'Basics',
      groupStore: 'Storage',
      sectionInfo: 'Profile',
      sectionSources: 'Sources',
      sectionPacks: 'Domain packs',
      sectionInfoHint: 'Name and description belong to this knowledge base',
      sectionSourcesHint: 'Collect and compile use only the sources bound here',
      sectionPacksHint: 'Optionally bind domain packs; none by default, priors expand at compile',
      settingsLive: 'Source bindings apply immediately',
      packsLive: 'Pack bindings apply immediately',
      packNone: 'No packs available',
      needSession: 'Open a session before using Knowledge',
      published: 'Published',
      draft_only: 'Draft',
      published_with_draft: 'Unpublished draft',
      archived: 'Archived',
      captured: 'Captured',
      decided: 'Decided',
      failed: 'Failed',
      review: 'Review',
      reviewInProposals: 'Review in Proposals after compile',
      delete: 'Delete',
      entity: 'Entity',
      concept: 'Concept',
      relation: 'Relation',
      summary: 'Summary',
      synthesis: 'Synthesis',
      comparison: 'Comparison',
      index: 'Index',
      addSourceCard: 'New source',
      save: 'Save',
      cancel: 'Cancel',
      remove: 'Delete',
      collect: 'Collect',
      name: 'Name',
      host: 'Host',
      port: 'Port',
      database: 'Database',
      username: 'Username',
      password: 'Password',
      passwordKeep: 'Password (leave blank to keep)',
      collected: 'Captured {captured}, already stored {reused}',
      saved: 'Saved',
      removed: 'Deleted',
      readerEmpty: 'Choose a page from the list',
      scopeDbMenu: 'Choose databases',
      scopeDbRatio: '({selected}/{total})',
      scopeTablesLabel: 'Choose tables',
      scopeSummary: '{databases} databases, {tables} tables selected',
      scopeDefault: 'All tables in the default database',
      defaultDatabase: 'Default database',
      alreadyAdded: 'Already added',
      testConnection: 'Test connection',
      connectReady: 'Connection succeeded. You can continue',
      connectRequired: 'Test the connection before continuing',
      scopeLoading: 'Reading databases and tables',
      scopeEmpty: 'No tables to read',
      close: 'Close',
      pause: 'Pause',
      resume: 'Resume',
      stop: 'Cancel task',
      taskCollect: 'Collecting',
      taskCompile: 'Compiling',
      taskPaused: 'Paused',
      taskDone: 'Task finished',
      taskCancelled: 'Task cancelled',
      taskFailed: 'Task failed',
      taskProgress: '{done}/{total}',
      collectOk: 'Collected',
      collectFail: 'Collect failed',
      collectPhaseCatalog: 'Reading schema',
      collectPhaseCount: 'Counting rows',
      collectPhaseProfile: 'Profiling',
      collectProgressDetail: '({current}/{total}) {phase} {detail}',
      collectTable: 'table {table}',
      filterAll: 'All',
      stepSources: 'Open a source to choose tables, then collect',
      stepMaterials: 'Database materials are grouped by data source, then by table, values, link, and dictionary',
      folderTable: 'Table',
      folderDomain: 'Values',
      folderLink: 'Links',
      folderDict: 'Dictionaries',
      folderOther: 'Other',
      unnamedSource: 'Source {id}',
      stepWiki: 'Compiled pages are grouped here by type',
      stepProposals: 'Compile results that need a person show up here',
      reviewAsk: 'Decide whether the two columns are the same business identifier',
      reviewGuide: [
        '## What to decide',
        '',
        'Confirm whether the two columns below are the same business identifier',
        '',
        '## How to read the numbers',
        '',
        '- Cardinality: how many distinct values the column has',
        '- Selectivity: cardinality divided by non-null sampled rows. Near 1 looks like a key; far below 1 means one value is shared by many rows',
        '- Containment: for the current column A and the other column B, the cell is |A∩B| / |A|. 100% means every value of A appears in B',
        '- Jaccard: how much the two value sets overlap. Near 1 means almost the same set',
        '- A small number of distinct values can overlap by chance, so a person has to confirm',
        '',
        '## Accept and reject',
        '',
        'Accept agrees with the link. If this proposal carries a relation page, that page is written; otherwise the proposal is only closed',
        'Reject does not create the link. Existing pages stay as they are',
      ].join('\n'),
      deleteKeeps: 'Accept only closes this delete proposal. It does not delete the page',
      compileResult: 'Compiled {decided}, failed {failed}',
      confirmUnbind: 'Unbind "{name}"',
      confirmDelete: 'Delete knowledge base "{name}"',
      confirmClear: 'Clear every material in "{name}"',
      confirmMaterial: 'Delete material "{name}"',
      confirmBodyBase: 'This removes the knowledge base from the list',
      confirmBodyClear: 'Materials are deleted. Compiled pages stay',
      confirmBodyMaterial: 'You can collect it again after deletion',
      confirmBodyUnbind: 'This base will stop collecting from the source. Materials and pages stay',
      clearMaterials: 'Clear materials',
      removeMaterial: 'Delete this',
      readerEmptyMaterial: 'Choose a material from the list',
      collectNone: 'Not collected',
      collectedDone: 'Collected',
      connectUnknown: 'Not checked',
      connectOk: 'Connected',
      connectFailed: 'Connection failed',
      modeColumns: 'Directory and list',
      modeReader: 'Directory and article',
      editScope: 'Edit scope',
      noDesc: 'No description',
      failDetailTitle: 'Compile failed',
      failProcess: 'Compile steps',
      failReason: 'Failure reason',
      failStageCompile: 'Build page decisions',
      failStageApply: 'Write pages',
      failStageProject: 'Retrieval projection',
      failHint: 'After fixing the cause, click Compile to retry this material',
      failUnknown: 'No failure reason was recorded',
    }
    const panelId = 'local-wiki'
    const blank = () => ({ name: '', type: 'postgresql', host: '127.0.0.1', port: '5432', database: '', username: '', password: '' })
    const emptyBase = () => ({ name: '', description: '', datasourceIds: [], scopes: {}, collectIds: [] })
    function inlineMarkdown(text, onOpen) {
      const parts = []
      const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\[\[[^\]]+\]\])/g
      let last = 0
      let match = pattern.exec(text)
      let part = 0
      while (match) {
        if (match.index > last) parts.push(text.slice(last, match.index))
        const token = match[0]
        if (token.startsWith('`')) parts.push(h('code', { key: part }, token.slice(1, -1)))
        else if (token.startsWith('[[')) {
          const slug = token.slice(2, -2).trim()
          parts.push(h('button', { key: part, type: 'button', className: 'lwiki-wikilink', onClick: () => onOpen?.(slug) }, slug))
        } else parts.push(h('strong', { key: part }, token.slice(2, -2)))
        part += 1
        last = match.index + token.length
        match = pattern.exec(text)
      }
      if (last < text.length) parts.push(text.slice(last))
      return parts
    }
    function splitCells(line) {
      const body = line.trim().replace(/^\|/, '').replace(/\|$/, '')
      const cells = []
      let current = ''
      for (let i = 0; i < body.length; i++) {
        if (body[i] === '\\' && body[i + 1] === '|') { current += '|'; i += 1; continue }
        if (body[i] === '|') { cells.push(current.trim()); current = ''; continue }
        current += body[i]
      }
      cells.push(current.trim())
      return cells
    }
    function isTableLine(line) {
      const trimmed = String(line ?? '').trim()
      return trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 1
    }
    function isRuleRow(cells) {
      return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell))
    }
    function renderMarkdown(source, onOpen) {
      const lines = String(source ?? '').replace(/\r\n/g, '\n').split('\n')
      const blocks = []
      let index = 0
      let key = 0
      const blocked = (line) => /^(#{1,3})\s+/.test(line) || /^ *[-*]\s+/.test(line) || isTableLine(line)
      while (index < lines.length) {
        const line = lines[index]
        if (!line.trim()) { index += 1; continue }
        const heading = /^(#{1,3})\s+(.*)$/.exec(line)
        if (heading) {
          const tag = heading[1].length === 1 ? 'h2' : heading[1].length === 2 ? 'h3' : 'h4'
          blocks.push(h(tag, { key }, inlineMarkdown(heading[2], onOpen)))
          key += 1
          index += 1
          continue
        }
        if (isTableLine(line)) {
          const rows = []
          while (index < lines.length && isTableLine(lines[index])) {
            rows.push(splitCells(lines[index]))
            index += 1
          }
          const header = rows.length >= 2 && isRuleRow(rows[1]) ? rows[0] : null
          const bodyRows = header ? rows.slice(2) : rows
          blocks.push(h('div', { key, className: 'lwiki-table-wrap' }, h('table', null,
            header ? h('thead', null, h('tr', null, header.map((cell, cellIndex) => h('th', { key: cellIndex }, inlineMarkdown(cell, onOpen))))) : null,
            h('tbody', null, bodyRows.map((row, rowIndex) => h('tr', { key: rowIndex }, row.map((cell, cellIndex) => h('td', { key: cellIndex }, inlineMarkdown(cell, onOpen)))))),
          )))
          key += 1
          continue
        }
        if (/^ *[-*]\s+/.test(line)) {
          const items = []
          while (index < lines.length && /^ *[-*]\s+/.test(lines[index])) {
            const item = /^( *)[-*]\s+(.*)$/.exec(lines[index])
            const indent = Math.min(3, Math.floor((item?.[1].length ?? 0) / 2))
            items.push(h('li', { key: items.length, style: indent ? { marginLeft: indent * 16 } : undefined }, inlineMarkdown(item?.[2] ?? '', onOpen)))
            index += 1
          }
          blocks.push(h('ul', { key }, items))
          key += 1
          continue
        }
        const para = []
        while (index < lines.length && lines[index].trim() && !blocked(lines[index])) {
          para.push(lines[index].trim())
          index += 1
        }
        blocks.push(h('p', { key }, inlineMarkdown(para.join(' '), onOpen)))
        key += 1
      }
      return blocks
    }
    function Caret(props) {
      return h('svg', { className: 'lwiki-caret', 'data-open': props.open ? 'true' : 'false', width: 12, height: 12, viewBox: '0 0 12 12', fill: 'none', 'aria-hidden': 'true' },
        h('path', { d: 'M4.5 2.5L8 6L4.5 9.5', stroke: 'currentColor', strokeWidth: 1.2, strokeLinecap: 'round', strokeLinejoin: 'round' }))
    }
    function PlusIcon() {
      return h('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true' },
        h('path', { d: 'M8 3.5v9M3.5 8h9', stroke: 'currentColor', strokeWidth: 1.2, strokeLinecap: 'round' }))
    }
    function SpinnerIcon(props = {}) {
      const size = props.size || 12
      return h('svg', { className: 'lwiki-spin', width: size, height: size, viewBox: '0 0 12 12', fill: 'none', 'aria-hidden': 'true' },
        h('circle', { cx: 6, cy: 6, r: 4.5, stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeDasharray: '18 10', opacity: 0.9 }),
      )
    }
    function CloseIcon() {
      return h('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true' },
        h('path', { d: 'M4.5 4.5l7 7M11.5 4.5l-7 7', stroke: 'currentColor', strokeWidth: 1.2, strokeLinecap: 'round' }))
    }
    function FolderIcon() {
      return h('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true' },
        h('path', { d: 'M2.5 4.5h3l1.2 1.4H13.5v6.6H2.5V4.5z', stroke: 'currentColor', strokeWidth: 1.2, strokeLinejoin: 'round' }))
    }
    function StarIcon() {
      return h('svg', { width: 12, height: 12, viewBox: '0 0 16 16', fill: 'currentColor', 'aria-hidden': 'true' },
        h('path', { d: 'M8 1.6l1.7 3.7 4 .4-3 2.8.9 3.9L8 10.4l-3.6 2 0.9-3.9-3-2.8 4-.4L8 1.6z' }))
    }
    function DocIcon() {
      return h('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true' },
        h('path', { d: 'M4.5 2.5h5l3 3v8H4.5v-11z', stroke: 'currentColor', strokeWidth: 1.2, strokeLinejoin: 'round' }),
        h('path', { d: 'M9.5 2.5V5.5H12.5', stroke: 'currentColor', strokeWidth: 1.2, strokeLinejoin: 'round' }))
    }
    function GearIcon() {
      return h('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true', strokeWidth: 1.3 },
        h('path', { d: 'M8 9.75012C8.9665 9.75012 9.75 8.96662 9.75 8.00012C9.75 7.03362 8.9665 6.25012 8 6.25012C7.0335 6.25012 6.25 7.03362 6.25 8.00012C6.25 8.96662 7.0335 9.75012 8 9.75012Z', stroke: 'currentColor' }),
        h('path', { d: 'M13.0107 7.79377C12.9505 7.89401 12.9205 7.94413 12.9205 7.99951C12.9205 8.0549 12.9505 8.10502 13.0106 8.20528L13.9849 9.83006C14.045 9.93029 14.0751 9.9804 14.0751 10.0358C14.0751 10.0911 14.045 10.1413 13.9849 10.2415L13.0037 11.8777C12.9468 11.9726 12.9184 12.0201 12.8725 12.0461C12.8267 12.072 12.7713 12.072 12.6607 12.072H10.6704C10.5598 12.072 10.5045 12.072 10.4586 12.098C10.4128 12.1239 10.3843 12.1714 10.3274 12.2662L9.33825 13.9142C9.28133 14.009 9.25287 14.0564 9.20703 14.0823C9.16118 14.1083 9.10588 14.1083 8.99529 14.1083H7.00486C6.89426 14.1083 6.83896 14.1083 6.79312 14.0823C6.74727 14.0564 6.71881 14.009 6.6619 13.9142L5.67273 12.2662C5.61581 12.1714 5.58735 12.1239 5.54151 12.098C5.49566 12.072 5.44036 12.072 5.32977 12.072H3.33945C3.2288 12.072 3.17347 12.072 3.12761 12.0461C3.08176 12.0201 3.0533 11.9726 2.9964 11.8777L2.0152 10.2415C1.9551 10.1413 1.92505 10.0911 1.92505 10.0358C1.92505 9.9804 1.9551 9.93029 2.0152 9.83006L2.98951 8.20528C3.04963 8.10502 3.07969 8.0549 3.07969 7.99951C3.07968 7.94413 3.04961 7.89401 2.98946 7.79377L2.01529 6.17011C1.95514 6.06987 1.92507 6.01975 1.92507 5.96437C1.92506 5.90899 1.95512 5.85886 2.01524 5.7586L2.9964 4.1224C3.0533 4.0275 3.08176 3.98005 3.12761 3.95408C3.17347 3.92811 3.2288 3.92811 3.33945 3.92811H5.32977C5.44036 3.92811 5.49566 3.92811 5.54151 3.90216C5.58735 3.87621 5.61581 3.82879 5.67273 3.73397L6.6619 2.08599C6.71881 1.99116 6.74727 1.94375 6.79312 1.9178C6.83896 1.89185 6.89426 1.89185 7.00486 1.89185H8.99529C9.10588 1.89185 9.16118 1.89185 9.20703 1.9178C9.25287 1.94375 9.28133 1.99116 9.33825 2.08599L10.3274 3.73397C10.3843 3.82879 10.4128 3.87621 10.4586 3.90216C10.5045 3.92811 10.5598 3.92811 10.6704 3.92811H12.6607C12.7713 3.92811 12.8267 3.92811 12.8725 3.95408C12.9184 3.98005 12.9468 4.0275 13.0037 4.1224L13.9849 5.7586C14.045 5.85886 14.0751 5.90899 14.0751 5.96437C14.0751 6.01975 14.045 6.06987 13.9849 6.17011L13.0107 7.79377Z', stroke: 'currentColor', strokeMiterlimit: 10 }))
    }
    function ColumnsIcon() {
      return h('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true' },
        h('rect', { x: 2, y: 3, width: 4, height: 10, rx: 1, stroke: 'currentColor', strokeWidth: 1.2 }),
        h('rect', { x: 8, y: 3, width: 6, height: 10, rx: 1, stroke: 'currentColor', strokeWidth: 1.2 }))
    }
    function ReaderIcon() {
      return h('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true' },
        h('rect', { x: 2, y: 3, width: 5, height: 10, rx: 1, stroke: 'currentColor', strokeWidth: 1.2 }),
        h('path', { d: 'M9.5 5.5h4M9.5 8h4M9.5 10.5h3', stroke: 'currentColor', strokeWidth: 1.2, strokeLinecap: 'round' }))
    }
    function SourceIcon() {
      return h('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true' },
        h('ellipse', { cx: 8, cy: 4.2, rx: 4.5, ry: 1.6, stroke: 'currentColor', strokeWidth: 1.2 }),
        h('path', { d: 'M3.5 4.2v7c0 .9 2 1.6 4.5 1.6s4.5-.7 4.5-1.6v-7M3.5 8c0 .9 2 1.6 4.5 1.6s4.5-.7 4.5-1.6', stroke: 'currentColor', strokeWidth: 1.2 }))
    }
    const CSS = `
.lwiki { display: flex; flex-direction: column; height: 100%; min-height: 0; color: var(--dsw-alias-label-primary); background: var(--dsw-alias-bg-base); font-size: 14px; line-height: 22px; }
.lwiki-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 16px clamp(24px, 4vw, 48px) 0; }
.lwiki-top { display: flex; flex-wrap: nowrap; align-items: center; gap: 12px 16px; padding: 16px clamp(24px, 4vw, 48px) 0; overflow: visible; }
[data-platform='darwin'] .lwiki-head,
[data-platform='darwin'] .lwiki-top { padding-top: var(--dsh-frame-top-clearance, 16px); }
.lwiki-top .lwiki-nav { flex: 0 1 auto; margin: 0; }
.lwiki-top .lwiki-tabs { flex: 0 1 auto; flex-wrap: nowrap; min-width: 0; padding: 0; align-items: center; }
.lwiki-titles { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 2px; }
.lwiki-head h1 { min-width: 0; margin: 0; font-size: 20px; line-height: 28px; font-weight: 500; }
.lwiki-sub { margin: 0; font-size: 13px; line-height: 20px; color: var(--dsw-alias-label-tertiary); }
.lwiki-filters { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 12px; }
.lwiki-chip { height: 28px; padding: 0 10px; border: 0; border-radius: 14px; background: transparent; color: var(--dsw-alias-label-tertiary); font: inherit; font-size: 13px; line-height: 20px; cursor: pointer; }
.lwiki-chip[aria-pressed='true'], .lwiki-chip:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.lwiki-chip:focus-visible { outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); outline-offset: 2px; }
.lwiki-dialog-wide { width: min(720px, 100%); }
.lwiki-nav { display: flex; align-items: center; gap: 6px; min-width: 0; margin-bottom: 4px; }
.lwiki-nav-current { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; line-height: 20px; color: var(--dsw-alias-label-primary); }
.lwiki-nav-sep { color: var(--dsw-alias-label-tertiary); font-size: 13px; }
.lwiki-kb-shell { position: relative; display: flex; flex-direction: column; }
.lwiki-group { display: flex; align-items: center; gap: 6px; width: 100%; margin: 8px 0 4px; padding: 4px 8px; border: 0; border-radius: var(--dsw-radius-sm); background: transparent; color: var(--dsw-alias-label-tertiary); font: inherit; font-size: 12px; line-height: 18px; font-weight: 500; text-align: left; cursor: pointer; }
.lwiki-group:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.lwiki-group .lwiki-status { margin-left: auto; }
.lwiki-caret { flex: 0 0 auto; transition: transform 120ms ease; }
.lwiki-caret[data-open='true'] { transform: rotate(90deg); }
.lwiki-md h2, .lwiki-md h3, .lwiki-md h4 { margin: 12px 0 6px; font-weight: 500; }
.lwiki-md h2 { font-size: 16px; line-height: 24px; }
.lwiki-md h3 { font-size: 14px; line-height: 22px; }
.lwiki-md h4 { font-size: 13px; line-height: 20px; }
.lwiki-md strong { font-weight: 500; }
.lwiki-md > :first-child { margin-top: 0; }
.lwiki-md p, .lwiki-md li { margin: 0 0 6px; }
.lwiki-md ul { margin: 0 0 8px; padding-left: 18px; }
.lwiki-md code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
.lwiki-table-wrap { overflow: auto; margin: 0 0 12px; }
.lwiki-md table { width: 100%; border-collapse: collapse; font-size: 13px; line-height: 20px; }
.lwiki-md th, .lwiki-md td { padding: 6px 8px; border-bottom: 0.5px solid var(--dsw-alias-border-l3); text-align: left; vertical-align: top; white-space: nowrap; }
.lwiki-md th { font-weight: 500; color: var(--dsw-alias-label-secondary); }
.lwiki-job-mid { flex: 1 1 160px; display: flex; flex-wrap: nowrap; align-items: center; justify-content: center; gap: 8px; min-width: 0; }
.lwiki-job-label { flex: 0 1 auto; min-width: 0; max-width: 42%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary); }
.lwiki-job-mid .lwiki-bar { flex: 0 0 72px; }
.lwiki-bar[data-indeterminate='true'] > span { width: 40%; animation: lwiki-slide 1.1s ease-in-out infinite; }
@keyframes lwiki-slide { from { transform: translateX(-130%); } to { transform: translateX(280%); } }
@keyframes lwiki-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  .lwiki-bar[data-indeterminate='true'] > span { animation: none; width: 100%; opacity: 0.45; }
  .lwiki-spin { animation: none; }
}
.lwiki-db-trigger { display: inline-flex; align-items: center; gap: 6px; height: 28px; margin-bottom: 12px; padding: 0 10px; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-sm); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font: inherit; font-size: 13px; line-height: 20px; cursor: pointer; }
.lwiki-db-trigger:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }
.lwiki-db-trigger:disabled { cursor: not-allowed; opacity: 0.4; }
.lwiki-db-trigger:focus-visible { outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); outline-offset: 2px; }
.lwiki-db-mask { position: fixed; inset: 0; z-index: 91; background: transparent; }
.lwiki-db-pop { position: fixed; z-index: 92; max-height: min(360px, 60vh); overflow: auto; padding: 6px 8px; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-layer-1); box-shadow: var(--dsw-shadow-lv3); }
.lwiki-scope-head { display: flex; align-items: center; gap: 4px; }
.lwiki-scope-head .lwiki-group { width: auto; margin: 0; }
.lwiki-scope-head .lwiki-check { flex: 1; min-width: 0; }
.lwiki-toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 12px; flex: 0 0 auto; margin-bottom: 12px; }
.lwiki-toolbar .lwiki-input { max-width: 320px; }
.lwiki-toolbar .lwiki-filters { margin: 0; flex: 0 1 auto; }
.lwiki-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; flex: 0 0 auto; }
.lwiki-tabs { display: flex; flex-wrap: wrap; gap: 8px; padding: 16px clamp(24px, 4vw, 48px) 0; overflow: visible; }
.lwiki-tab { position: relative; display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px; border: 0; border-radius: 14px; background: transparent; color: var(--dsw-alias-label-tertiary); font: inherit; font-size: 14px; line-height: 22px; cursor: pointer; overflow: visible; }
.lwiki-tab:hover, .lwiki-tab[aria-selected='true'] { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.lwiki-tab-mark { position: absolute; top: 0; right: 0; width: 6px; height: 6px; border-radius: 50%; background: var(--dsw-alias-state-error-primary); box-shadow: 0 0 0 1.5px var(--dsw-alias-bg-base); pointer-events: none; }
.lwiki-tab-mark[data-tone='ok'] { background: var(--dsw-alias-state-success-primary); }
.lwiki-tab-mark[data-tone='error'] { background: var(--dsw-alias-state-error-primary); }
.lwiki-tab-badge { position: absolute; top: -6px; right: -6px; box-sizing: border-box; min-width: 14px; height: 14px; padding: 0 3px; border-radius: 7px; background: var(--dsw-alias-state-error-primary); color: var(--dsw-alias-label-primary-foreground, #fff); font-size: 9px; line-height: 14px; font-weight: 500; text-align: center; white-space: nowrap; box-shadow: 0 0 0 1.5px var(--dsw-alias-bg-base); pointer-events: none; }
.lwiki-tab-spin { position: absolute; top: -1px; right: -1px; display: inline-flex; pointer-events: none; color: var(--dsw-alias-state-business-primary); }
.lwiki-nav-accessory { display: inline-flex; align-items: center; justify-content: center; line-height: 0; color: var(--dsw-alias-state-business-primary); }
.lwiki-nav-mark { width: 6px; height: 6px; border-radius: 50%; background: var(--dsw-alias-state-error-primary); box-shadow: 0 0 0 1.5px var(--dsw-alias-bg-base); }
.lwiki-nav-mark[data-tone='ok'] { background: var(--dsw-alias-state-success-primary); }
.lwiki-nav-mark[data-tone='error'] { background: var(--dsw-alias-state-error-primary); }
.lwiki-scope-label { display: inline-flex; align-items: baseline; gap: 6px; min-width: 0; flex: 1 1 auto; }
.lwiki-scope-label > span:first-child { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lwiki-scope-desc { flex: 0 1 auto; color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 18px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lwiki-spin { flex: 0 0 auto; animation: lwiki-spin 0.8s linear infinite; }
.lwiki-tab:focus-visible, .lwiki-btn:focus-visible, .lwiki-row:focus-visible, .lwiki-kind:focus-visible { outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); outline-offset: 2px; }
.lwiki-head, .lwiki-top, .lwiki-tabs, .lwiki-job { flex: 0 0 auto; }
.lwiki-scroll { flex: 1 1 auto; min-height: 0; overflow: auto; padding: 16px clamp(24px, 4vw, 48px) 48px; }
.lwiki-main { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; padding: 12px clamp(24px, 4vw, 48px) 0; }
.lwiki-list-scroll { flex: 1 1 auto; min-height: 0; overflow: auto; padding-bottom: 32px; }
.lwiki-list-scroll:has(.lwiki-browser) { display: flex; flex-direction: column; overflow: hidden; padding-bottom: 0; }
.lwiki-drawer-mask { position: fixed; inset: 0; z-index: 70; display: flex; justify-content: flex-end; background: var(--dsw-alias-bg-mask-1); }
.lwiki-drawer { display: flex; flex-direction: column; width: min(560px, 100%); height: 100%; background: var(--dsw-alias-bg-layer-1); box-shadow: var(--dsw-shadow-lv3); }
.lwiki-drawer-head, .lwiki-drawer-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex: 0 0 auto; padding: 16px; }
.lwiki-drawer-head h2 { min-width: 0; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 16px; line-height: 24px; font-weight: 500; }
.lwiki-drawer-body { flex: 1 1 auto; min-height: 0; overflow: auto; padding: 0 16px 24px; }
.lwiki-drawer-body .lwiki-job { margin: 0 0 16px; }
.lwiki-icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; padding: 0; border: 0; border-radius: var(--dsw-radius-sm); background: transparent; color: var(--dsw-alias-label-tertiary); cursor: pointer; }
.lwiki-icon-btn:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.lwiki-icon-btn:focus-visible { outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); outline-offset: 2px; }
.lwiki-more { position: absolute; top: 10px; right: 10px; }
.lwiki-menu { position: absolute; z-index: 4; top: 42px; right: 10px; min-width: 148px; padding: 4px; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-layer-1); box-shadow: var(--dsw-shadow-lv3); }
.lwiki-menu-item { display: flex; align-items: center; width: 100%; height: 32px; padding: 0 10px; border: 0; border-radius: var(--dsw-radius-sm); background: transparent; color: var(--dsw-alias-label-primary); font: inherit; font-size: 13px; line-height: 20px; text-align: left; cursor: pointer; }
.lwiki-menu-item:hover { background: var(--dsw-alias-interactive-bg-hover); }
.lwiki-menu-item:disabled { cursor: not-allowed; opacity: 0.4; }
.lwiki-drawer-quiet .lwiki-drawer-head { justify-content: flex-end; }
.lwiki-drawer-quiet .lwiki-drawer-head h2 { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
.lwiki-drawer-doc { width: min(760px, 100%); }
.lwiki-drawer .lwiki-pills { margin: 0 0 12px; }
.lwiki-docs > li.lwiki-doc { cursor: default; }
.lwiki-menu-danger { color: var(--dsw-alias-state-error-primary); }
@media (max-width: 720px) {
  [data-platform='darwin'] .lwiki-drawer-head { padding-top: calc(16px + var(--dsh-frame-top-clearance, 0px)); }
}
.lwiki-intro, .lwiki-empty, .lwiki-meta { margin: 0 0 12px; font-size: 13px; line-height: 20px; color: var(--dsw-alias-label-tertiary); }
.lwiki-error { margin: 0 0 12px; font-size: 12px; line-height: 18px; color: var(--dsw-alias-state-error-primary); }
.lwiki-cards { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.lwiki-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
.lwiki-kb { box-sizing: border-box; display: flex; flex: 1 1 auto; flex-direction: column; align-items: stretch; gap: 8px; width: 100%; min-height: 112px; padding: 14px 16px; border: 0.5px solid var(--dsw-alias-settings-card-stroke); border-radius: var(--dsw-radius-xl); background: var(--dsw-alias-settings-card-fill); color: inherit; font: inherit; text-align: left; cursor: pointer; }
button.lwiki-card { width: 100%; font: inherit; text-align: left; cursor: pointer; }
button.lwiki-card[aria-current='page'] { background: var(--dsw-alias-interactive-bg-hover); }
.lwiki-kb:hover { background: var(--dsw-alias-interactive-bg-hover); }
.lwiki-kb:focus-visible { outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); outline-offset: 2px; }
.lwiki-source-add { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; box-sizing: border-box; width: 100%; height: 112px; min-height: 112px; padding: 12px 16px; border: 0.5px dashed var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-xl); background: transparent; color: var(--dsw-alias-label-tertiary); font: inherit; font-size: 13px; line-height: 20px; cursor: pointer; }
.lwiki-source-add svg { width: 22px; height: 22px; }
.lwiki-source-add:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.lwiki-source-add:focus-visible { outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); outline-offset: 2px; }
.lwiki-kb-title { font-size: 14px; line-height: 22px; font-weight: 500; }
.lwiki-back { height: 28px; padding: 0; border: 0; background: transparent; color: var(--dsw-alias-label-tertiary); font: inherit; font-size: 13px; line-height: 20px; cursor: pointer; }
.lwiki-back:hover { color: var(--dsw-alias-label-primary); }
.lwiki-card { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 14px; border: 0.5px solid var(--dsw-alias-settings-card-stroke); border-radius: var(--dsw-radius-xl); background: var(--dsw-alias-settings-card-fill); }
.lwiki-card-text { min-width: 0; }
.lwiki-card-title { font-size: 14px; line-height: 22px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lwiki-card-meta { font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary); }
.lwiki-kinds { display: flex; gap: 8px; margin-bottom: 12px; }
.lwiki-kind { height: 28px; padding: 0 10px; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: 14px; background: transparent; color: var(--dsw-alias-label-primary); font: inherit; font-size: 13px; cursor: pointer; }
.lwiki-kind[aria-pressed='true'] { border-color: transparent; background: var(--dsw-alias-interactive-bg-hover); }
.lwiki-kind:disabled { cursor: not-allowed; opacity: 0.45; }
.lwiki-field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.lwiki-label { font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary); }
.lwiki-input { box-sizing: border-box; width: 100%; height: 32px; padding: 0 10px; border: 0.5px solid var(--dsw-alias-border-l4); border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font: inherit; font-size: 14px; line-height: 22px; }
.lwiki-input:focus { outline: none; border-color: var(--dsw-alias-state-business-primary); }
.lwiki-btn { box-sizing: border-box; display: inline-flex; align-items: center; height: 28px; padding: 0 10px; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-sm); background: transparent; color: var(--dsw-alias-label-primary); font: inherit; font-size: 12px; line-height: 18px; cursor: pointer; }
.lwiki-btn:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }
.lwiki-btn:disabled { cursor: not-allowed; opacity: 0.4; }
.lwiki-btn-primary { height: 32px; padding: 0 12px; border: 0; border-radius: 16px; background: var(--dsw-alias-button-primary-fill); color: var(--dsw-alias-label-primary-foreground); font-size: 13px; line-height: 20px; }
.lwiki-btn-primary:hover:not(:disabled) { background: var(--dsw-alias-button-primary-hover); }
.lwiki-list { list-style: none; margin: 0; padding: 0; }
.lwiki-row { display: flex; width: 100%; align-items: center; gap: 8px; min-width: 0; padding: 5px 8px; border: 0; border-radius: var(--dsw-radius-sm); background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; }
.lwiki-row:hover, .lwiki-row[aria-current='page'] { background: var(--dsw-alias-interactive-bg-hover); }
.lwiki-row-label { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lwiki-card > .lwiki-row { flex: 1; padding: 0; }
.lwiki-card > .lwiki-row .lwiki-card-text { display: flex; flex-direction: column; gap: 2px; }
.lwiki-status { flex: 0 0 auto; color: var(--dsw-alias-label-tertiary); font-size: 12px; }
.lwiki-mask { position: fixed; inset: 0; z-index: 80; display: flex; align-items: center; justify-content: center; padding: 24px; background: var(--dsw-alias-bg-mask-1); }
.lwiki-dialog { display: flex; flex-direction: column; width: min(560px, 100%); max-height: min(640px, 100%); border: 0.5px solid var(--dsw-alias-settings-card-stroke); border-radius: var(--dsw-radius-xl); background: var(--dsw-alias-bg-layer-1); box-shadow: var(--dsw-shadow-lv3); }
.lwiki-dialog-head, .lwiki-dialog-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px; }
.lwiki-dialog-head h2 { margin: 0; font-size: 16px; line-height: 24px; font-weight: 500; }
.lwiki-dialog-body { flex: 1 1 auto; min-height: 120px; overflow: auto; padding: 0 16px; }
.lwiki-check { display: flex; align-items: center; gap: 8px; min-width: 0; padding: 4px 0; font-size: 13px; line-height: 20px; cursor: pointer; }
.lwiki-check input { margin: 0; }
.lwiki-tree { margin: 0 0 8px 22px; }
.lwiki-job { display: flex; align-items: center; gap: 12px; margin: 12px clamp(24px, 4vw, 48px) 0; padding: 12px 14px; border: 0.5px solid var(--dsw-alias-settings-card-stroke); border-radius: var(--dsw-radius-xl); background: var(--dsw-alias-settings-card-fill); }
.lwiki-bar { height: 4px; border-radius: 999px; background: var(--dsw-alias-border-l2); overflow: hidden; }
.lwiki-bar > span { display: block; height: 100%; background: var(--dsw-alias-label-primary); }
.lwiki-kb-head { display: flex; align-items: center; gap: 8px; width: 100%; min-width: 0; padding-right: 28px; }
.lwiki-kb-head .lwiki-kb-title { flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lwiki-kb-head .lwiki-card-meta { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lwiki-kb-mark { display: inline-flex; align-items: center; gap: 3px; flex: 0 0 auto; color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 18px; font-weight: 500; }
.lwiki-kb > .lwiki-pills { width: 100%; min-width: 0; margin-top: auto; }
.lwiki-dir-nest { margin-left: 16px; }
.lwiki-pills { display: flex; flex-wrap: wrap; gap: 6px; }
.lwiki-pill { display: inline-flex; align-items: center; height: 22px; padding: 0 8px; border-radius: 11px; background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 18px; }
.lwiki-pill[data-tone='error'] { color: var(--dsw-alias-state-error-primary); }
.lwiki-mode { display: flex; align-items: center; gap: 2px; }
.lwiki-icon-btn[aria-pressed='true'] { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.lwiki-browser { flex: 1 1 auto; min-height: 0; display: grid; grid-template-columns: 220px minmax(0, 1fr); }
.lwiki-browser-reader { grid-template-columns: minmax(220px, 280px) minmax(0, 1fr); }
.lwiki-dir, .lwiki-pane { min-height: 0; overflow: auto; }
.lwiki-dir { border-right: 0.5px solid var(--dsw-alias-border-l3); padding: 4px 8px 24px 0; }
.lwiki-pane { padding: 4px 0 24px 16px; }
.lwiki-dir-row, .lwiki-doc { display: flex; align-items: center; gap: 8px; width: 100%; min-width: 0; border: 0; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; }
.lwiki-dir-row { padding: 5px 8px; border-radius: var(--dsw-radius-sm); }
.lwiki-doc { padding: 8px 10px; border-radius: var(--dsw-radius-md); }
.lwiki-doc-table { min-width: 0; }
.lwiki-doc-head, .lwiki-doc-row { display: grid; grid-template-columns: minmax(0, 1fr) max-content 132px; gap: 12px; align-items: center; }
.lwiki-doc-row > .lwiki-pill { justify-self: start; width: fit-content; }
.lwiki-doc-head { padding: 4px 10px 8px; border-bottom: 0.5px solid var(--dsw-alias-border-l3); color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 18px; }
.lwiki-doc-lead { display: flex; align-items: center; gap: 10px; min-width: 0; }
.lwiki-doc-icon { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; flex: 0 0 auto; border-radius: var(--dsw-radius-sm); background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-tertiary); }
.lwiki-status-line { display: inline-flex; align-items: center; gap: 6px; min-width: 0; color: var(--dsw-alias-label-secondary); font-size: 13px; line-height: 20px; white-space: nowrap; }
.lwiki-status-line[data-tone='ok'] { color: var(--dsw-alias-state-success-primary); }
.lwiki-status-line[data-tone='error'] { color: var(--dsw-alias-state-error-primary); }
.lwiki-status-line[data-tone='active'] { color: var(--dsw-alias-state-business-primary); }
.lwiki-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex: 0 0 auto; }
.lwiki-dir-row:hover, .lwiki-dir-row[aria-current='page'], .lwiki-doc:hover, .lwiki-doc[aria-current='page'] { background: var(--dsw-alias-interactive-bg-hover); }
.lwiki-dir-row:focus-visible, .lwiki-doc:focus-visible { outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); outline-offset: 2px; }
.lwiki-docs { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
.lwiki-docs-tree { margin-left: 16px; }
.lwiki-doc-text { min-width: 0; flex: 1; display: flex; flex-direction: column; }
.lwiki-doc-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; }
.lwiki-doc-meta { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary); }
.lwiki-article { max-width: 760px; }
.lwiki-article-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
.lwiki-article-main { min-width: 0; }
.lwiki-article-time { flex: 0 0 auto; padding-top: 6px; color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 18px; white-space: nowrap; }
.lwiki-article-title { margin: 0 0 10px; font-size: 22px; line-height: 30px; font-weight: 500; }
.lwiki-fail { margin: 0 0 16px; padding: 12px 14px; border: 0.5px solid color-mix(in srgb, var(--dsw-alias-state-error-primary) 35%, var(--dsw-alias-border-l3)); border-radius: var(--dsw-radius-lg); background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 8%, var(--dsw-alias-bg-layer-1)); }
.lwiki-fail-title { margin: 0 0 10px; color: var(--dsw-alias-state-error-primary); font-size: 13px; line-height: 20px; font-weight: 500; }
.lwiki-fail-label { margin: 0 0 6px; color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 18px; }
.lwiki-fail-steps { list-style: none; margin: 0 0 12px; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.lwiki-fail-step { display: flex; align-items: center; gap: 8px; font-size: 13px; line-height: 20px; color: var(--dsw-alias-label-secondary); }
.lwiki-fail-step[data-state='done'] { color: var(--dsw-alias-state-success-primary); }
.lwiki-fail-step[data-state='failed'] { color: var(--dsw-alias-state-error-primary); font-weight: 500; }
.lwiki-fail-step[data-state='pending'] { color: var(--dsw-alias-label-tertiary); }
.lwiki-fail-mark { flex: 0 0 auto; width: 16px; text-align: center; font-size: 12px; line-height: 18px; }
.lwiki-fail-reason { margin: 0 0 8px; padding: 10px 12px; border-radius: var(--dsw-radius-sm); background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; line-height: 18px; white-space: pre-wrap; word-break: break-word; }
.lwiki-fail-hint { margin: 0; color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 18px; }
.lwiki-refs { display: flex; flex-direction: column; gap: 8px; margin-top: 16px; padding-top: 12px; border-top: 0.5px solid var(--dsw-alias-border-l3); }
.lwiki-ref { display: grid; grid-template-columns: 72px minmax(0, 1fr); gap: 12px; align-items: start; font-size: 13px; line-height: 20px; }
.lwiki-ref-label { color: var(--dsw-alias-label-tertiary); }
.lwiki-ref-links { display: flex; flex-wrap: wrap; gap: 8px 12px; }
.lwiki-pill-mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.lwiki-settings { display: flex; width: min(920px, 100%); height: min(640px, 100%); overflow: hidden; border: 0.5px solid var(--dsw-alias-settings-card-stroke); border-radius: var(--dsw-radius-xl); background: var(--dsw-alias-bg-layer-1); box-shadow: var(--dsw-shadow-lv3); }
.lwiki-settings-nav { flex: 0 0 200px; display: flex; flex-direction: column; gap: 2px; min-height: 0; overflow: auto; padding: 16px 12px; border-right: 0.5px solid var(--dsw-alias-border-l3); background: var(--dsw-alias-bg-base); }
.lwiki-settings-brand { margin: 0 8px 12px; font-size: 14px; line-height: 22px; font-weight: 500; }
.lwiki-settings-group { margin: 12px 8px 4px; color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 18px; }
.lwiki-settings-item { display: flex; align-items: center; width: 100%; height: 32px; padding: 0 8px; border: 0; border-radius: var(--dsw-radius-sm); background: transparent; color: var(--dsw-alias-label-primary); font: inherit; font-size: 13px; line-height: 20px; text-align: left; cursor: pointer; }
.lwiki-settings-item:hover, .lwiki-settings-item[aria-current='page'] { background: var(--dsw-alias-interactive-bg-hover); }
.lwiki-settings-item:focus-visible { outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); outline-offset: 2px; }
.lwiki-settings-main { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; }
.lwiki-settings-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 16px 16px 0; }
.lwiki-settings-head h2 { margin: 0; font-size: 16px; line-height: 24px; font-weight: 500; }
.lwiki-settings-sub { margin: 4px 0 0; color: var(--dsw-alias-label-tertiary); font-size: 13px; line-height: 20px; }
.lwiki-settings-body { flex: 1 1 auto; min-height: 0; overflow: auto; padding: 16px; }
.lwiki-settings-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; border-top: 0.5px solid var(--dsw-alias-border-l3); }
.lwiki-settings-form { display: flex; flex-direction: column; gap: 12px; max-width: 420px; }
.lwiki-ds { display: grid; grid-template-columns: 32px minmax(0, 1fr); grid-template-rows: auto auto minmax(36px, auto); column-gap: 10px; row-gap: 2px; align-items: center; align-content: center; box-sizing: border-box; width: 100%; height: 112px; min-height: 112px; padding: 12px 40px 12px 16px; border: 0.5px solid var(--dsw-alias-settings-card-stroke); border-radius: var(--dsw-radius-xl); background: var(--dsw-alias-settings-card-fill); color: inherit; font: inherit; text-align: left; cursor: pointer; overflow: hidden; }
.lwiki-ds:hover { background: var(--dsw-alias-interactive-bg-hover); }
.lwiki-ds:disabled { cursor: not-allowed; opacity: 0.45; }
.lwiki-ds:disabled:hover { background: var(--dsw-alias-settings-card-fill); }
.lwiki-ds[aria-pressed='true'], .lwiki-ds[aria-current='page'] { border-color: var(--dsw-alias-state-success-primary); }
.lwiki-ds:focus-visible { outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); outline-offset: 2px; }
.lwiki-badge { grid-row: 1 / span 3; align-self: start; display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: var(--dsw-radius-md); background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 14%, transparent); color: var(--dsw-alias-state-success-primary); font-size: 14px; line-height: 20px; font-weight: 500; }
.lwiki-ds .lwiki-kb-title { min-width: 0; }
.lwiki-ds-line { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; min-width: 0; color: var(--dsw-alias-label-secondary); font-size: 13px; line-height: 20px; }
.lwiki-ds-type { flex: 0 0 auto; }
.lwiki-ds-status { display: inline-flex; align-items: center; gap: 6px; min-width: 0; color: var(--dsw-alias-label-secondary); }
.lwiki-ds-status[data-tone='ok'] { color: var(--dsw-alias-state-success-primary); }
.lwiki-ds-status[data-tone='error'] { color: var(--dsw-alias-state-error-primary); }
.lwiki-ds-status[data-tone='active'] { color: var(--dsw-alias-state-business-primary); }
.lwiki-ds-foot { grid-column: 2; display: flex; flex-direction: column; justify-content: center; gap: 2px; width: 100%; min-width: 0; min-height: 36px; }
.lwiki-ds-detail { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 16px; }
.lwiki-ds-progress { display: flex; flex-direction: column; justify-content: center; gap: 2px; width: 100%; min-width: 0; }
.lwiki-ds-progress-row { display: flex; align-items: center; gap: 6px; width: 100%; min-width: 0; height: 16px; }
.lwiki-ds-progress-row .lwiki-bar { flex: 1 1 auto; min-width: 0; }
.lwiki-ds-cancel { flex: 0 0 auto; width: 16px; height: 16px; }
.lwiki-ds-cancel svg { width: 12px; height: 12px; }
.lwiki-ds-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; opacity: 0.85; flex: 0 0 auto; }
.lwiki-ds-status:not([data-tone]) .lwiki-ds-dot { color: var(--dsw-alias-label-tertiary); }
.lwiki-type-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
.lwiki-type { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; min-height: 96px; padding: 14px; border: 0.5px solid var(--dsw-alias-settings-card-stroke); border-radius: var(--dsw-radius-xl); background: var(--dsw-alias-bg-layer-1); color: inherit; font: inherit; text-align: left; cursor: pointer; }
.lwiki-type[aria-pressed='true'] { border-color: var(--dsw-alias-state-success-primary); }
.lwiki-type:focus-visible { outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); outline-offset: 2px; }
.lwiki-steps { display: flex; flex-wrap: wrap; gap: 8px 16px; margin-bottom: 16px; }
.lwiki-step { display: inline-flex; align-items: center; gap: 8px; color: var(--dsw-alias-label-tertiary); font-size: 13px; line-height: 20px; }
button.lwiki-step { border: 0; margin: 0; padding: 0; background: transparent; font: inherit; cursor: pointer; }
button.lwiki-step:disabled { cursor: default; opacity: 1; color: var(--dsw-alias-label-tertiary); }
button.lwiki-step:focus-visible { outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); outline-offset: 2px; }
.lwiki-actions .lwiki-intro, .lwiki-actions .lwiki-error, .lwiki-actions .lwiki-db-trigger { margin: 0; }
.lwiki-step[data-state='current'] { color: var(--dsw-alias-label-primary); }
.lwiki-step-index { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 50%; background: var(--dsw-alias-interactive-bg-hover); font-size: 12px; line-height: 18px; }
.lwiki-step[data-state='current'] .lwiki-step-index { background: var(--dsw-alias-state-success-primary); color: var(--dsw-alias-label-primary-foreground); }
.lwiki-step[data-state='done'] { color: var(--dsw-alias-state-success-primary); }
.lwiki-wizard-mask { z-index: 90; }
.lwiki-base-trigger { display: inline-flex; align-items: center; gap: 4px; min-width: 0; max-width: 220px; height: 28px; padding: 0 4px 0 8px; border: none; border-radius: var(--dsw-radius-sm); outline: none; background: transparent; color: var(--dsw-alias-label-secondary); font-size: 13px; line-height: 20px; font-weight: 500; cursor: pointer; }
.lwiki-base-trigger:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }
.lwiki-base-trigger:focus-visible { box-shadow: 0 0 0 2px var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); }
.lwiki-base-trigger:disabled { color: var(--dsw-alias-label-dimmed); cursor: default; }
.lwiki-base-trigger-icon { display: inline-flex; flex: 0 0 auto; }
.lwiki-base-trigger-icon svg { width: 14px; height: 14px; }
.lwiki-base-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lwiki-base-chevron { display: inline-flex; flex: 0 0 auto; color: var(--dsw-alias-label-caption); transition: transform 120ms ease; }
.lwiki-base-chevron[data-open='true'] { transform: rotate(180deg); }
.lwiki-base-option-label { display: flex; align-items: center; gap: 4px; min-width: 0; max-width: 100%; }
.lwiki-base-badge { flex: none; color: var(--dsw-alias-label-tertiary); font-size: 8px; line-height: 10px; font-weight: 500; letter-spacing: 0.2px; }
@container (max-width: 460px) { .lwiki-base-trigger .lwiki-base-name { display: none; } }
.lwiki-wizard { width: min(840px, 100%); }
.lwiki-wikilink { padding: 0; border: 0; background: none; color: inherit; font: inherit; text-decoration: underline; cursor: pointer; }
@media (max-width: 720px) { .lwiki-browser, .lwiki-browser-reader { grid-template-columns: 1fr; } .lwiki-dir { border-right: 0; border-bottom: 0.5px solid var(--dsw-alias-border-l3); } .lwiki-settings { flex-direction: column; } .lwiki-settings-nav { flex-basis: auto; border-right: 0; border-bottom: 0.5px solid var(--dsw-alias-border-l3); } .lwiki-doc-head, .lwiki-doc-row { grid-template-columns: minmax(0, 1fr) max-content 96px; } }
`
    function ensureStyles() {
      if (typeof document === 'undefined' || document.getElementById('local-wiki-style')) return
      const el = document.createElement('style')
      el.id = 'local-wiki-style'
      el.textContent = CSS
      document.head.appendChild(el)
    }
    let catalog = null
    let catalogEpoch = 0
    let catalogFlight = null
    let detailFlight = null
    /** 右侧栏「知识库」入口的处理态：转圈 / 完成点。 */
    let navMark = null
    const navMarkListeners = new Set()
    function publishNavMark(mark) {
      navMark = mark
      for (const listener of navMarkListeners) listener(mark)
    }
    function invalidateCatalog() {
      catalogEpoch += 1
      catalog = null
    }
    /** 避免缓存 catalog 把刚启动的任务冲掉；同 id 用服务端快照刷新进度。已结束的任务不回填到空状态。 */
    function mergeTask(current, next) {
      const nextLive = next && (next.status === 'running' || next.status === 'paused')
      if (!current) return nextLive ? next : null
      const currentLive = current.status === 'running' || current.status === 'paused'
      if (!next) return currentLive ? current : null
      if (currentLive && next.id === current.id) return next
      if (currentLive && !nextLive && next.id !== current.id) return current
      return nextLive ? next : null
    }
    function publishBases() {
      invalidateCatalog()
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('dsh-wiki-bases'))
    }
    function takeCatalog(context, sessionId) {
      const epoch = catalogEpoch
      if (catalog && catalog.epoch === epoch) return Promise.resolve(catalog)
      if (catalogFlight && catalogFlight.epoch === epoch) return catalogFlight.promise
      const run = (line) => (sessionId ? callAt(context, sessionId, line) : call(context, line))
      const promise = Promise.all([
        run('/wiki {"op":"bases"}'),
        run('/datasource {"op":"list"}'),
        run('/wiki {"op":"task"}'),
      ]).then(([listedBases, ds, listedTask]) => {
        if (catalogEpoch !== epoch) return takeCatalog(context, sessionId)
        catalog = {
          epoch,
          bases: listedBases.bases ?? [],
          sources: ds.datasources ?? [],
          task: listedTask.task ?? null,
        }
        return catalog
      }).finally(() => {
        if (catalogFlight && catalogFlight.epoch === epoch) catalogFlight = null
      })
      catalogFlight = { epoch, promise }
      return promise
    }
    function takeDetail(context, id) {
      if (!id) return Promise.resolve({ pages: [], materials: [], proposals: [] })
      if (detailFlight && detailFlight.id === id) return detailFlight.promise
      const scope = { knowledgeBaseId: id }
      const promise = Promise.all([
        call(context, `/wiki ${JSON.stringify({ op: 'pages', ...scope })}`),
        call(context, `/wiki ${JSON.stringify({ op: 'materials', ...scope })}`),
        call(context, `/wiki ${JSON.stringify({ op: 'proposals', ...scope })}`),
      ]).then(([listed, mats, propsals]) => ({
        pages: listed.pages ?? [],
        materials: mats.materials ?? [],
        proposals: (propsals.proposals ?? []).filter((item) => item.status === 'open'),
      })).finally(() => {
        if (detailFlight && detailFlight.promise === promise) detailFlight = null
      })
      detailFlight = { id, promise }
      return promise
    }
    async function callAt(context, sessionId, line) {
      if (!sessionId) throw new Error('open a session first')
      const result = await context.remote.commands.execute(sessionId, line, [])
      if (!result?.ok) throw new Error(result?.error?.message || 'command failed')
      const settled = result.value?.result ?? result.value
      if (!settled) throw new Error('command unavailable')
      if (settled.kind === 'error') throw new Error(settled.text || 'command failed')
      return settled.text ? JSON.parse(settled.text) : {}
    }
    function call(context, line) {
      return callAt(context, sessionIdOf(context), line)
    }
    function sessionIdOf(context) {
      const byId = context.sessions?.list?.getSnapshot?.()?.byId
      if (!byId) return null
      const rows = Object.entries(byId)
      if (rows.length === 0) return null
      rows.sort((left, right) => (right[1]?.updatedAt ?? 0) - (left[1]?.updatedAt ?? 0))
      return rows[0][0]
    }
    function messageOf(err, translate) {
      const message = String(err?.message ?? err)
      return message === 'open a session first' ? translate('needSession') : message
    }
    function labelOf(translate, value) {
      const text = translate(value)
      return text === value ? value : text
    }
    function KnowledgeIcon(props) {
      const size = props.size || 16
      const strokeWidth = props.strokeWidth || 1
      return h('svg', { width: size, height: size, className: props.className, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true' },
        h('path', { d: 'M3 2.75h6.2c1.6 0 2.8 1.05 2.8 2.45V13.25H5.2C4 13.25 3 12.3 3 11.1V2.75z', stroke: 'currentColor', strokeWidth, strokeLinejoin: 'round' }),
        h('path', { d: 'M3 11.1h9', stroke: 'currentColor', strokeWidth }),
      )
    }
    function KnowledgeNavAccessory() {
      const [mark, setMark] = useState(navMark)
      useEffect(() => {
        const sync = (next) => setMark(next)
        navMarkListeners.add(sync)
        setMark(navMark)
        return () => { navMarkListeners.delete(sync) }
      }, [])
      if (!mark) return null
      if (mark.spinning) return h('span', { className: 'lwiki-nav-accessory' }, h(SpinnerIcon, { size: 12 }))
      if (mark.tone) return h('span', { className: 'lwiki-nav-accessory' }, h('span', { className: 'lwiki-nav-mark', 'data-tone': mark.tone }))
      return null
    }
    function BaseSeat({ ctx, t }) {
      const [bases, setBases] = useState([])
      const [open, setOpen] = useState(false)
      const current = bases.find((base) => base.focused) ?? bases.find((base) => base.isDefault) ?? bases[0] ?? null
      const applyRows = (rows) => { setBases(rows); return rows }
      useEffect(() => {
        let live = true
        const refresh = async () => {
          let data = await takeCatalog(ctx)
          if (!live) return
          let rows = data.bases
          applyRows(rows)
          if (rows.length === 0) return
          let changed = false
          if (!rows.some((row) => row.isDefault)) {
            const chosen = rows.find((row) => row.focused) ?? rows[0]
            await call(ctx, `/wiki ${JSON.stringify({ op: 'setDefault', id: chosen.id })}`)
            if (!live) return
            changed = true
          }
          if (!rows.some((row) => row.focused)) {
            const chosen = rows.find((row) => row.isDefault) ?? rows[0]
            await call(ctx, `/wiki ${JSON.stringify({ op: 'setFocus', id: chosen.id })}`)
            if (!live) return
            changed = true
          }
          if (!changed) return
          publishBases()
          data = await takeCatalog(ctx)
          if (live) applyRows(data.bases)
        }
        const onChange = () => {
          takeCatalog(ctx).then((data) => { if (live) applyRows(data.bases) }).catch((err) => { if (live && String(err?.message ?? err) !== 'open a session first') setBases([]) })
        }
        refresh().catch((err) => { if (live && String(err?.message ?? err) !== 'open a session first') setBases([]) })
        window.addEventListener('dsh-wiki-bases', onChange)
        return () => { live = false; window.removeEventListener('dsh-wiki-bases', onChange) }
      }, [])
      const choose = (id) => {
        setOpen(false)
        call(ctx, `/wiki ${JSON.stringify({ op: 'setFocus', id })}`).then(() => publishBases()).catch((err) => { if (String(err?.message ?? err) !== 'open a session first') setBases([]) })
      }
      const labelOfBase = (base) => (base.isDefault
        ? h('span', { className: 'lwiki-base-option-label' }, h('span', { className: 'lwiki-base-name' }, base.name), h('span', { className: 'lwiki-base-badge' }, t('defaultMark')))
        : base.name)
      return h(Menu, {
        open,
        side: 'top',
        portal: true,
        items: bases.map((base) => ({ id: String(base.id), label: labelOfBase(base) })),
        selectedId: current ? String(current.id) : undefined,
        onSelect: choose,
        onClose: () => setOpen(false),
        anchor: h('button', {
          type: 'button',
          className: 'lwiki-base-trigger',
          'aria-label': current ? current.name : t('composerBase'),
          disabled: bases.length === 0,
          onClick: () => setOpen((value) => !value),
        },
          h('span', { className: 'lwiki-base-trigger-icon', 'aria-hidden': 'true' }, h(KnowledgeIcon, { size: 14 })),
          h('span', { className: 'lwiki-base-name' }, current ? current.name : t('composerBase')),
          h('span', { className: 'lwiki-base-chevron', 'data-open': open ? 'true' : 'false', 'aria-hidden': 'true' }, h(IconChevronDownOutlineRegular)),
        ),
      })
    }
    return {
      inject: ['slots', 'locale', 'remote', 'remote.commands', 'sessions', 'commandUi'],
      apply(ctx) {
        ensureStyles()
        const ns = 'local.wiki'
        ctx.effect(() => ctx.locale.register(ns, { zh, en }), 'wiki.locale')
        const t = () => ctx.locale.bind(ns)
        window.__dshSourceDesk = function SourceDesk() {
          return h(Panel, { ctx, t: t(), mode: 'defaults' })
        }
        ctx.effect(() => ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist',
          id: panelId,
          order: 20,
          label: () => t()('nav'),
          locale: ns,
        }, KnowledgeIcon)), 'wiki.nav')
        ctx.effect(() => ctx.slots.inject('sidebar.panellist.accessory', () => ctx.slots.register({
          name: 'sidebar.panellist.accessory',
          id: panelId,
        }, KnowledgeNavAccessory)), 'wiki.navAccessory')
        ctx.effect(() => ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main',
          key: panelId,
          locale: ns,
        }, function KnowledgePage() {
          useEffect(() => {
            if (navMark && !navMark.spinning) publishNavMark(null)
          }, [])
          return h(Panel, { ctx, t: t() })
        })), 'wiki.page')
        const analystPresetId = 'analyst'
        const presetOf = (sessionId) => {
          const value = ctx.sessions.list.getSnapshot().byId[sessionId]?.projectionValues?.agentPreset
          return typeof value === 'string' ? value : ''
        }
        ctx.effect(() => ctx.slots.inject('conversation.input.left', () => ctx.slots.register({
          name: 'conversation.input.left',
          id: 'knowledge-base',
          order: 0,
        }, function KnowledgeBaseSeat(props) {
          const preset = props.useSessions((state) => {
            const value = state.byId[props.sessionId]?.projectionValues?.agentPreset
            return typeof value === 'string' ? value : ''
          })
          if (preset !== analystPresetId) return null
          return h(BaseSeat, { ctx, t: t() })
        })), 'wiki.baseSeat')
        ctx.effect(() => ctx.commandUi.register({
          name: 'knowledge',
          label: () => t()('pickBase'),
          description: () => t()('pickBaseHint'),
          icon: KnowledgeIcon,
          available: (session) => presetOf(session.sessionId) === analystPresetId,
          ui: {
            kind: 'popupSelect',
            searchMode: 'fuzzy-label',
            searchLabels: () => ({ placeholder: t()('pickBase'), empty: t()('emptyBases'), noResults: t()('pickBaseEmpty') }),
            options: async (session) => {
              const data = await takeCatalog(ctx, session.sessionId)
              const rows = data.bases ?? []
              const focused = rows.find((row) => row.focused)
              const activeId = focused?.id ?? rows.find((row) => row.isDefault)?.id
              return rows.map((row) => ({
                id: row.id,
                label: row.name,
                ...(row.isDefault ? { badge: t()('defaultMark') } : {}),
                ...(row.id === activeId ? { active: true } : {}),
              }))
            },
            onSelect: async (option, session) => {
              await callAt(ctx, session.sessionId, `/wiki ${JSON.stringify({ op: 'setFocus', id: option.id })}`)
              publishBases()
            },
          },
        }), 'wiki.commandUi')
      },
    }

    function databasesOf(catalog, fallback) {
      const map = new Map()
      for (const group of catalog?.groups ?? []) {
        const name = group.kind === 'database' ? String(group.id) : String(group.id ?? '').split('.')[0]
        if (!name) continue
        const row = map.get(name) ?? {
          id: name,
          label: name,
          description: typeof group.description === 'string' ? group.description : '',
          tables: [],
        }
        if (!row.description && typeof group.description === 'string') row.description = group.description
        const schema = group.kind === 'database' ? '' : String(group.id ?? '').slice(name.length + 1)
        for (const table of group.tables ?? []) {
          if (!table?.id) continue
          row.tables.push({
            id: table.id,
            label: schema && schema !== 'public' ? `${schema}.${table.label}` : table.label,
            description: typeof table.description === 'string' ? table.description : '',
          })
        }
        map.set(name, row)
      }
      for (const sibling of catalog?.siblings ?? []) {
        const name = typeof sibling === 'string' ? sibling : sibling?.id
        const description = typeof sibling === 'object' && sibling ? String(sibling.description ?? '') : ''
        if (name && !map.has(name)) map.set(name, { id: name, label: name, description, tables: [] })
      }
      const preferred = String(fallback || catalog?.database || '')
      return [...map.values()].map((row) => ({ ...row, isDefault: row.id === preferred }))
    }

    function scopeFromCatalog(catalog, fallback, savedTables) {
      const rows = databasesOf(catalog, fallback)
      const saved = Array.isArray(savedTables) ? savedTables : []
      if (saved.length > 0) {
        const savedSet = new Set(saved)
        const chosen = []
        const tables = []
        for (const row of rows) {
          const hit = row.tables.filter((table) => savedSet.has(table.id)).map((table) => table.id)
          if (hit.length === 0) continue
          chosen.push(row.id)
          tables.push(...hit)
        }
        if (chosen.length > 0) return { chosen, tables }
      }
      const preferred = rows.find((row) => row.isDefault) ?? null
      return { chosen: preferred ? [preferred.id] : [], tables: preferred ? preferred.tables.map((table) => table.id) : [] }
    }

    function configFingerprint(form) {
      return [form.type, String(form.host ?? '').trim(), String(form.port ?? '').trim(), String(form.database ?? '').trim(), form.username ?? '', form.password ?? ''].join('\0')
    }

    function sameSet(left, right) {
      if (left.length !== right.length) return false
      const seen = new Set(left)
      return right.every((id) => seen.has(id))
    }

    function connectionFields(fields) {
      return {
        name: String(fields.name ?? '').trim(),
        type: fields.type,
        host: String(fields.host ?? '').trim(),
        port: Number(fields.port),
        database: String(fields.database ?? '').trim(),
        username: fields.username ?? '',
        password: fields.password ?? '',
      }
    }

    function Panel({ ctx, t, mode = 'base' }) {
      const [tab, setTab] = useState('wiki')
      const [bases, setBases] = useState([])
      const [baseId, setBaseId] = useState(null)
      const [sources, setSources] = useState([])
      const [materials, setMaterials] = useState([])
      const [pages, setPages] = useState([])
      const [proposals, setProposals] = useState([])
      const [page, setPage] = useState(null)
      const [query, setQuery] = useState('')
      const [error, setError] = useState('')
      const [notice, setNotice] = useState('')
      const noticeTimer = useRef(0)
      const flashNotice = (text) => {
        if (noticeTimer.current) window.clearTimeout(noticeTimer.current)
        setNotice(text)
        noticeTimer.current = window.setTimeout(() => {
          setNotice('')
          noticeTimer.current = 0
        }, 2000)
      }
      useEffect(() => () => {
        if (noticeTimer.current) window.clearTimeout(noticeTimer.current)
      }, [])
      const [busy, setBusy] = useState('')
      const [editingId, setEditingId] = useState(null)
      const [showForm, setShowForm] = useState(false)
      const [showCreate, setShowCreate] = useState(false)
      const [baseDraft, setBaseDraft] = useState(emptyBase)
      const [wizardStep, setWizardStep] = useState('type')
      const [syncNow, setSyncNow] = useState(false)
      const [form, setForm] = useState(blank)
      const [catalog, setCatalog] = useState({ groups: [], siblings: [], database: '' })
      const [picked, setPicked] = useState([])
      const [chosenDbs, setChosenDbs] = useState([])
      const [dbMenu, setDbMenu] = useState(null)
      const [dbDraft, setDbDraft] = useState([])
      const [verifiedKey, setVerifiedKey] = useState('')
      const [savedProbe, setSavedProbe] = useState(null)
      const [attempt, setAttempt] = useState(null)
      const [baseline, setBaseline] = useState(null)
      const [followDefault, setFollowDefault] = useState(false)
      const [scopeError, setScopeError] = useState('')
      const [scopeBusy, setScopeBusy] = useState(false)
      const [job, setJob] = useState(null)
      const [tabMarks, setTabMarks] = useState({})
      const [taskBaseline, setTaskBaseline] = useState(null)
      const [view, setView] = useState(null)
      const [materialFilter, setMaterialFilter] = useState('all')
      const [materialFocus, setMaterialFocus] = useState(null)
      const [openNodes, setOpenNodes] = useState({})
      const [scopeOpen, setScopeOpen] = useState({})
      const [sourceMode, setSourceMode] = useState('existing')
      const [confirm, setConfirm] = useState(null)
      const [settingsId, setSettingsId] = useState(null)
      const [settingsSection, setSettingsSection] = useState('sources')
      const [settingsDraft, setSettingsDraft] = useState({ name: '', description: '', packIds: [] })
      const [availablePacks, setAvailablePacks] = useState([])
      const [createSection, setCreateSection] = useState('info')
      const [menuId, setMenuId] = useState(null)
      const [browse, setBrowse] = useState('columns')
      const [wikiGroup, setWikiGroup] = useState(null)
      const [materialGroup, setMaterialGroup] = useState(null)
      const taskLive = Boolean(job && (job.status === 'running' || job.status === 'paused'))
      const compileLive = Boolean(taskLive && job?.kind === 'compile')
      const collectLive = Boolean(taskLive && job?.kind === 'collect')
      const fail = (err) => setError(messageOf(err, t))
      const scopeOf = (id) => ({ knowledgeBaseId: id })
      const openProposalCount = (rows) => rows.filter((item) => !item.status || item.status === 'open').length
      const beginCollectMarks = () => {
        publishNavMark({ spinning: true })
        setTabMarks((marks) => ({ ...marks, sources: { spinning: true } }))
      }
      const beginCompileMarks = () => {
        publishNavMark({ spinning: true })
        setTaskBaseline({ proposals: openProposalCount(proposals), pages: pages.length })
        setTabMarks((marks) => ({ ...marks, materials: { spinning: true } }))
        setMaterials((rows) => rows.map((item) => (
          item.status === 'failed'
            ? { ...item, status: 'captured', failureReason: undefined, decisionId: null }
            : item
        )))
      }
      const settleTaskMarks = (next, detail) => {
        if (!next || next.status === 'cancelled') {
          publishNavMark(null)
          setTabMarks((marks) => {
            const copy = { ...marks }
            if (next?.kind === 'collect') delete copy.sources
            if (next?.kind === 'compile') delete copy.materials
            return copy
          })
          setTaskBaseline(null)
          setJob(null)
          return
        }
        if (next.kind === 'collect') {
          const ok = next.status === 'done'
          const affected = Number(next.result?.captured ?? 0) + Number(next.result?.reused ?? 0)
          publishNavMark({ tone: ok ? 'ok' : 'error' })
          setTabMarks((marks) => ({
            ...marks,
            sources: { tone: ok ? 'ok' : 'error' },
            ...(ok && affected > 0 ? { materials: { count: affected } } : {}),
          }))
        } else if (next.kind === 'compile') {
          const failed = Number(next.result?.failed ?? 0)
          const tone = next.status === 'done' && failed === 0 ? 'ok' : 'error'
          const pageDelta = Math.max(0, (detail?.pages?.length ?? pages.length) - Number(taskBaseline?.pages ?? 0))
          const proposalDelta = Math.max(0, openProposalCount(detail?.proposals ?? proposals) - Number(taskBaseline?.proposals ?? 0))
          publishNavMark({ tone })
          setTabMarks((marks) => ({
            ...marks,
            materials: { tone },
            ...(pageDelta > 0 ? { wiki: { count: pageDelta } } : {}),
            ...(proposalDelta > 0 ? { proposals: { count: proposalDelta } } : {}),
          }))
        }
        setTaskBaseline(null)
        setJob(null)
      }
      const load = async (id = baseId) => {
        setError('')
        const data = await takeCatalog(ctx)
        setBases(data.bases)
        setSources(data.sources)
        let nextJob = null
        setJob((current) => {
          nextJob = mergeTask(current, data.task)
          return nextJob
        })
        if (nextJob && (nextJob.status === 'running' || nextJob.status === 'paused')) {
          publishNavMark({ spinning: true })
        }
        const detail = await takeDetail(ctx, id)
        setPages(detail.pages)
        setMaterials(detail.materials)
        setProposals(detail.proposals)
        return detail
      }
      const reload = async (id = baseId) => {
        invalidateCatalog()
        await load(id)
      }
      useEffect(() => { load(baseId).catch(fail) }, [baseId])
      useEffect(() => {
        const onBases = () => { load(baseId).catch(fail) }
        window.addEventListener('dsh-wiki-bases', onBases)
        return () => window.removeEventListener('dsh-wiki-bases', onBases)
      }, [baseId])
      useEffect(() => {
        if (!taskLive) return undefined
        let settled = false
        const timer = setInterval(() => {
          Promise.all([
            call(ctx, '/wiki {"op":"task"}'),
            compileLive ? takeDetail(ctx, baseId) : Promise.resolve(null),
          ]).then(async ([result, detail]) => {
            const next = result.task ?? null
            setJob(next)
            if (detail) {
              setPages(detail.pages)
              setMaterials(detail.materials)
              setProposals(detail.proposals)
            }
            if (settled || !next || next.status === 'running' || next.status === 'paused') return
            settled = true
            const latest = detail || await takeDetail(ctx, baseId).catch(() => null)
            if (latest) {
              setPages(latest.pages)
              setMaterials(latest.materials)
              setProposals(latest.proposals)
            }
            settleTaskMarks(next, latest)
            publishBases()
            invalidateCatalog()
            load(baseId).catch(fail)
          }).catch(() => {})
        }, 500)
        return () => clearInterval(timer)
      }, [taskLive, compileLive, baseId])
      useEffect(() => {
        if (!view && !showForm && !showCreate && !confirm && !settingsId && !materialFocus && !page && !menuId) return undefined
        const onKey = (event) => {
          if (event.key !== 'Escape' || busy !== '' || scopeBusy) return
          if (confirm) setConfirm(null)
          else if (showForm) closeWizard()
          else if (view) setView(null)
          else if (materialFocus) setMaterialFocus(null)
          else if (page) setPage(null)
          else if (settingsId) setSettingsId(null)
          else if (showCreate) setShowCreate(false)
          else setMenuId(null)
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
      }, [view, scopeBusy, showForm, showCreate, confirm, settingsId, materialFocus, page, menuId, busy])
      useEffect(() => {
        if (!menuId) return undefined
        const onPointer = (event) => {
          const target = event.target
          if (target instanceof Element && target.closest('[data-lwiki-menu]')) return
          setMenuId(null)
        }
        window.addEventListener('pointerdown', onPointer)
        return () => window.removeEventListener('pointerdown', onPointer)
      }, [menuId])
      useEffect(() => {
        if (!settingsId) return
        const found = bases.find((item) => item.id === settingsId)
        if (!found) return
        setSettingsDraft({
          name: found.name ?? '',
          description: found.description ?? '',
          packIds: Array.isArray(found.packIds) ? [...found.packIds] : [],
        })
        setSettingsSection('sources')
        call(ctx, '/wiki {"op":"listPacks"}')
          .then((result) => setAvailablePacks(Array.isArray(result?.packs) ? result.packs : []))
          .catch(() => setAvailablePacks([]))
      }, [settingsId])
      const openPage = async (slug) => {
        setError('')
        const scope = scopeOf(baseId)
        const found = await call(ctx, `/wiki ${JSON.stringify({ op: 'page', slug, ...scope })}`)
        setPage(found.page)
      }
      const scopeRequest = useRef(0)
      const catalogLine = ({ id, inline, fields, databaseFilter }) => {
        const body = inline
          ? { op: 'catalog', ...connectionFields(fields ?? form), ...(id != null ? { id } : {}) }
          : { op: 'catalog', id }
        if (databaseFilter) body[inline ? 'databaseFilter' : 'database'] = databaseFilter
        return `/datasource ${JSON.stringify(body)}`
      }
      const loadCatalog = async ({ id, inline, fields, databaseName, savedTables, databaseFilter } = {}) => {
        const request = ++scopeRequest.current
        const used = fields ?? form
        setScopeError('')
        setCatalog({ groups: [], siblings: [], database: '' })
        setScopeBusy(true)
        try {
          const data = await call(ctx, catalogLine({ id, inline, fields: used, databaseFilter }))
          if (request !== scopeRequest.current) return null
          const next = { groups: data.groups ?? [], siblings: data.siblings ?? [], database: data.database ?? '', connectionKey: configFingerprint(used) }
          setCatalog(next)
          const scope = scopeFromCatalog(next, databaseName || data.database, savedTables)
          setChosenDbs(scope.chosen)
          setPicked(scope.tables)
          setScopeOpen(Object.fromEntries(scope.chosen.map((dbId) => [dbId, true])))
          return { tables: scope.tables }
        } catch (err) {
          setScopeError(messageOf(err, t))
          setChosenDbs([])
          setPicked([])
          setScopeOpen({})
          setDbMenu(null)
          return null
        } finally {
          setScopeBusy(false)
        }
      }
      const payload = () => connectionFields(form)
      const field = (key, label, type = 'text') => h('label', { className: 'lwiki-field' },
        h('span', { className: 'lwiki-label' }, label),
        h('input', {
          className: 'lwiki-input',
          type,
          value: form[key],
          autoComplete: type === 'password' ? 'new-password' : 'off',
          onChange: (event) => setForm({ ...form, [key]: event.target.value }),
        }),
      )
      const needle = query.trim().toLowerCase()
      const visiblePages = pages.filter((item) => !needle || `${item.title ?? ''} ${item.slug ?? ''}`.toLowerCase().includes(needle))
      const pageTypeOrder = ['entity', 'concept', 'relation', 'summary', 'index', 'synthesis', 'comparison']
      const grouped = new Map(pageTypeOrder.map((key) => [key, []]))
      for (const item of visiblePages) {
        const key = item.pageType || 'page'
        grouped.set(key, [...(grouped.get(key) ?? []), item])
      }
      for (const [key, rows] of grouped) if (rows.length === 0) grouped.delete(key)
      const body = page?.published?.body || page?.draft?.body || ''
      const cited = page?.published?.sources || page?.draft?.sources || []
      const selected = bases.find((item) => item.id === baseId) ?? null
      const settingsBase = bases.find((item) => item.id === settingsId) ?? null
      const manageBase = settingsBase ?? selected
      const boundIds = selected?.datasourceIds ?? []
      const bound = sources.filter((row) => boundIds.includes(row.id))
      const manageIds = manageBase?.datasourceIds ?? []
      const manageBound = sources.filter((row) => manageIds.includes(row.id))
      const manageAvailable = sources.filter((row) => !manageIds.includes(row.id))
      const tabs = [
        ['sources', t('sources'), bound.length],
        ['materials', t('materials'), materials.length],
        ['wiki', t('wiki'), pages.length],
        ['proposals', t('proposals'), proposals.length],
      ]
      const taskText = (item) => {
        if (!item) return ''
        if (item.status === 'paused') return t('taskPaused')
        if (item.status === 'done' && item.kind === 'collect' && item.result) {
          return t('collected').replace('{captured}', String(item.result.captured ?? 0)).replace('{reused}', String(item.result.reused ?? 0))
        }
        if (item.status === 'done') return t('taskDone')
        if (item.status === 'cancelled') return t('taskCancelled')
        if (item.status === 'failed') return item.error || t('taskFailed')
        const name = item.kind === 'compile' ? t('taskCompile') : t('taskCollect')
        if (!item.total) return item.message ? `${name} · ${item.message}` : name
        const progress = t('taskProgress').replace('{done}', String(item.done ?? 0)).replace('{total}', String(item.total ?? 0))
        return item.message ? `${name} ${progress} · ${item.message}` : `${name} ${progress}`
      }
      const taskWidth = (item) => {
        if (!item?.total) return item?.status === 'done' ? '100%' : '0%'
        return `${Math.min(100, Math.round((item.done / item.total) * 100))}%`
      }
      const databaseCountText = (tables) => {
        if (!tables?.length) return t('scopeDefault')
        const names = new Set(tables.map((id) => String(id).split('.')[0]).filter(Boolean))
        return t('scopeSummary').replace('{databases}', String(names.size)).replace('{tables}', String(tables.length))
      }
      const scopeText = (id) => databaseCountText(selected?.scopes?.[String(id)]?.tables)
      const overlay = (titleId, title, bodyNode, foot, onClose, wide) => h('div', {
        className: 'lwiki-mask',
        onClick: () => { if (busy === '' && !scopeBusy) onClose() },
      }, h('div', {
        className: wide ? 'lwiki-dialog lwiki-dialog-wide' : 'lwiki-dialog',
        role: 'dialog',
        'aria-modal': 'true',
        'aria-labelledby': titleId,
        onClick: (event) => event.stopPropagation(),
      },
        h('div', { className: 'lwiki-dialog-head' }, h('h2', { id: titleId }, title)),
        h('div', { className: 'lwiki-dialog-body' }, bodyNode),
        foot ? h('div', { className: 'lwiki-dialog-foot' }, foot) : null,
      ))
      const shownMaterials = materials.filter((item) => materialFilter === 'all' || item.status === materialFilter)
      const pendingCompile = materials.filter((item) => item.status === 'captured' || item.status === 'failed').length
      const compileProgress = compileLive ? h('div', { className: 'lwiki-job-mid' },
        h('span', { className: 'lwiki-job-label', title: taskText(job) }, taskText(job)),
        h('div', { className: 'lwiki-bar', 'data-indeterminate': job.total ? undefined : 'true' }, h('span', { style: job.total ? { width: taskWidth(job) } : undefined })),
        h('button', {
          type: 'button',
          className: 'lwiki-icon-btn',
          'aria-label': t('stop'),
          title: t('stop'),
          onClick: () => call(ctx, '/wiki {"op":"taskCancel"}').then((result) => setJob(result.task)).catch(fail),
        }, h(CloseIcon)),
      ) : h('div', { className: 'lwiki-job-mid', 'aria-hidden': 'true' })
      const materialStatusOf = (item) => {
        if (compileLive && item.status === 'captured') {
          const current = job.materialId && job.materialId === item.id
          const byRef = !job.materialId && job.message && job.message === item.sourceRef
          if (current || byRef) return 'compiling'
        }
        return item.status
      }
      const tabMarkNode = (id) => {
        const mark = tabMarks[id]
        if (!mark) return null
        if (mark.spinning) return h('span', { className: 'lwiki-tab-spin' }, h(SpinnerIcon, { size: 10 }))
        if (mark.count > 0) {
          const text = mark.count > 99 ? '99+' : String(Math.floor(mark.count))
          return h('span', { className: 'lwiki-tab-badge' }, text)
        }
        if (mark.tone) return h('span', { className: 'lwiki-tab-mark', 'data-tone': mark.tone })
        return h('span', { className: 'lwiki-tab-mark' })
      }
      const scopeName = (label, description) => h('span', { className: 'lwiki-scope-label' },
        h('span', null, label),
        description ? h('span', { className: 'lwiki-scope-desc', title: description }, description) : null,
      )
      const drawer = (titleId, title, bodyNode, foot, onClose, quiet) => h('div', {
        className: 'lwiki-drawer-mask',
        onClick: () => { if (busy === '' && !scopeBusy) onClose() },
      }, h('aside', {
        className: quiet ? 'lwiki-drawer lwiki-drawer-quiet lwiki-drawer-doc' : 'lwiki-drawer',
        role: 'dialog',
        'aria-modal': 'true',
        'aria-labelledby': titleId,
        onClick: (event) => event.stopPropagation(),
      },
        h('div', { className: 'lwiki-drawer-head' },
          h('h2', { id: titleId }, title),
          h('button', { type: 'button', className: 'lwiki-icon-btn', 'aria-label': t('close'), onClick: onClose }, h(CloseIcon)),
        ),
        h('div', { className: 'lwiki-drawer-body' }, bodyNode),
        foot ? h('div', { className: 'lwiki-drawer-foot' }, foot) : null,
      ))
      const studioSections = [
        { group: t('groupBasic'), id: 'info', label: t('sectionInfo'), title: t('sectionInfo'), hint: t('sectionInfoHint') },
        { group: t('groupStore'), id: 'sources', label: t('sectionSources'), title: t('sectionSources'), hint: t('sectionSourcesHint') },
        ...(!showCreate ? [{ group: t('groupStore'), id: 'packs', label: t('sectionPacks'), title: t('sectionPacks'), hint: t('sectionPacksHint') }] : []),
      ]
      const studio = (titleId, brand, current, setCurrent, bodyNode, foot, onClose) => {
        let seen = ''
        const nav = []
        for (const item of studioSections) {
          if (item.group !== seen) {
            seen = item.group
            nav.push(h('div', { className: 'lwiki-settings-group', key: `g:${item.group}` }, item.group))
          }
          nav.push(h('button', {
            key: item.id, type: 'button', className: 'lwiki-settings-item',
            'aria-current': current === item.id ? 'page' : undefined,
            onClick: () => setCurrent(item.id),
          }, item.label))
        }
        const active = studioSections.find((item) => item.id === current) ?? studioSections[0]
        return h('div', { className: 'lwiki-mask', onClick: () => { if (busy === '' && !scopeBusy) onClose() } },
          h('div', {
            className: 'lwiki-settings', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId,
            onClick: (event) => event.stopPropagation(),
          },
            h('aside', { className: 'lwiki-settings-nav' },
              h('div', { className: 'lwiki-settings-brand' }, brand),
              nav,
            ),
            h('div', { className: 'lwiki-settings-main' },
              h('div', { className: 'lwiki-settings-head' },
                h('div', null,
                  h('h2', { id: titleId }, active.title),
                  h('p', { className: 'lwiki-settings-sub' }, active.hint),
                ),
                h('button', { type: 'button', className: 'lwiki-icon-btn', 'aria-label': t('close'), onClick: onClose }, h(CloseIcon)),
              ),
              h('div', { className: 'lwiki-settings-body' }, bodyNode),
              foot ? h('div', { className: 'lwiki-settings-foot' }, foot) : null,
            ),
          ))
      }
      const materialName = (sourceRef) => {
        const raw = String(sourceRef ?? '')
        const slash = raw.lastIndexOf('/')
        const name = slash >= 0 ? raw.slice(slash + 1) : raw.replace(/^database_profile:/, '')
        return name || raw
      }
      const tableShort = (name) => {
        const parts = String(name ?? '').split('.').filter(Boolean)
        return parts.length ? parts[parts.length - 1] : String(name ?? '')
      }
      const sameTableName = (left, right) => left === right || String(left).endsWith(`.${right}`) || String(right).endsWith(`.${left}`)
      const ownsRelation = (table, rel) => {
        if (rel.kind === 'overlap') {
          const left = `${rel.fromTable}.${rel.fromColumn}`
          const right = `${rel.toTable}.${rel.toColumn}`
          return sameTableName(left <= right ? rel.fromTable : rel.toTable, table)
        }
        return sameTableName(rel.fromTable, table)
      }
      const shareText = (share, count) => {
        const n = Number(share)
        if (!Number.isFinite(n)) return '—'
        if (n <= 0) return Number(count) > 0 ? '<0.1%' : '0%'
        const pct = n * 100
        if (pct >= 0.1) return `${pct.toFixed(1)}%`
        if (pct >= 0.01) return `${pct.toFixed(2)}%`
        if (pct >= 0.001) return `${pct.toFixed(3)}%`
        return '<0.001%'
      }
      const liftZeroShares = (markdown) => String(markdown).split('\n').map((line) => {
        if (!line.includes('%') || !line.includes('|')) return line
        const lifted = line.replace(/0(?:\.0+)?%（(\d+)\/(\d+)）/g, (all, inter, distinct) => {
          const hit = Number(inter)
          const total = Number(distinct)
          if (!(total > 0 && hit > 0)) return all
          return `${shareText(hit / total)}（${hit}/${total}）`
        })
        return lifted.replace(/\|(\s*)(\d+)(\s*)\|(\s*)0(?:\.0+)?%(\s*)\|/g, (all, spaceA, count, spaceB, spaceC, spaceD) => (
          Number(count) > 0 ? `|${spaceA}${count}${spaceB}|${spaceC}<0.1%${spaceD}|` : all
        ))
      }).join('\n')
      const formatWhen = (iso) => {
        const date = new Date(iso)
        if (Number.isNaN(date.getTime())) return ''
        const pad = (n) => String(n).padStart(2, '0')
        return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
      }
      const withoutTitle = (raw, title) => {
        const text = String(raw ?? '')
        const lines = text.replace(/\r\n/g, '\n').split('\n')
        if (lines[0]?.startsWith('# ') && lines[0].slice(2).trim() === String(title ?? '').trim()) return lines.slice(1).join('\n').replace(/^\n+/, '')
        return text
      }
      const cell = (value) => String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ')
      const valueTable = (column) => {
        const lines = ['', '| 取值 | 次数 | 占比 |', '| --- | --- | --- |']
        for (const item of column.domain?.values ?? []) lines.push(`| ${cell(item.value)} | ${item.count} | ${shareText(item.share, item.count)} |`)
        return lines.join('\n')
      }
      const filesOf = (item) => {
        const evidence = item.evidence
        if (evidence?.kind !== 'db.table') {
          return [{ id: item.id, folder: t('folderOther'), title: materialName(item.sourceRef), meta: '', item, slice: 'all' }]
        }
        const table = tableShort(evidence.table)
        const files = [{ id: `${item.id}:table`, folder: t('folderTable'), title: table, meta: '', item, slice: 'table' }]
        for (const column of evidence.columns ?? []) {
          if (column.dictionary) {
            const dictTitle = (() => {
              const raw = String(column.comment ?? '').trim()
              if (!raw) return column.name
              let phrase = raw.split(/[：:]/)[0].trim().replace(/[（(].*$/, '').trim()
              if (!phrase || phrase.toLowerCase() === String(column.name).toLowerCase()) return column.name
              return phrase
            })()
            files.push({ id: `${item.id}:dict:${column.name}`, folder: t('folderDict'), title: dictTitle, meta: `${table}.${column.name}`, item, slice: 'dict', column })
          } else if (column.domain?.kind === 'values' && (column.domain.values?.length ?? 0) > 0) {
            files.push({ id: `${item.id}:domain:${column.name}`, folder: t('folderDomain'), title: `${table}.${column.name}`, meta: column.comment || '', item, slice: 'domain', column })
          }
        }
        for (const rel of evidence.relations ?? []) {
          if ((rel.verdict !== 'accepted' && rel.verdict !== 'review') || !ownsRelation(evidence.table, rel)) continue
          const title = `${tableShort(rel.fromTable)}.${rel.fromColumn} → ${tableShort(rel.toTable)}.${rel.toColumn}`
          files.push({ id: `${item.id}:link:${rel.fromColumn}:${rel.toTable}:${rel.toColumn}`, folder: t('folderLink'), title, meta: rel.verdict === 'review' ? t('reviewInProposals') : '', item, slice: 'link', rel })
        }
        for (const fk of evidence.declaredForeignKeys ?? []) {
          if (!sameTableName(fk.fromTable, evidence.table)) continue
          const title = `${tableShort(fk.fromTable)}.${(fk.fromColumns ?? []).join(',')} → ${tableShort(fk.toTable)}.${(fk.toColumns ?? []).join(',')}`
          files.push({ id: `${item.id}:fk:${title}`, folder: t('folderLink'), title, meta: '', item, slice: 'fk', fk })
        }
        return files
      }
      const openAdd = () => {
        setShowForm(true)
        setEditingId(null)
        setWizardStep('type')
        setSourceMode(mode === 'defaults' || sources.length === 0 ? 'new' : 'existing')
        setForm({ ...blank(), type: '' })
        setPicked([])
        setChosenDbs([])
        setDbMenu(null)
        setDbDraft([])
        setVerifiedKey('')
        setSavedProbe(null)
        setAttempt(null)
        setBaseline(null)
        setFollowDefault(false)
        setCatalog({ groups: [], siblings: [], database: '' })
        setScopeError('')
        setSyncNow(false)
        setError('')
      }
      const leaveBase = () => {
        setBaseId(null)
        setPage(null)
        setShowForm(false)
        setEditingId(null)
        setConfirm(null)
        setView(null)
        setNotice('')
        setMaterialFocus(null)
        setOpenNodes({})
        setSettingsId(null)
        setMenuId(null)
      }
      const collectSaved = async (row) => {
        if (!baseId) return
        setMenuId(null)
        setError('')
        setNotice('')
        try {
          beginCollectMarks()
          const result = await call(ctx, `/wiki ${JSON.stringify({ op: 'collect', datasourceId: row.id, ...scopeOf(baseId) })}`)
          setJob(result.task)
          invalidateCatalog()
          await load(baseId)
        } catch (err) {
          setTabMarks((marks) => {
            const copy = { ...marks }
            delete copy.sources
            return copy
          })
          fail(err)
        }
      }
      const typeLetter = (type) => (type === 'mysql' ? 'M' : type === 'postgresql' ? 'P' : String(type || '?').slice(0, 1).toUpperCase())
      const typeName = (type) => (type === 'mysql' ? 'MySQL' : type === 'postgresql' ? 'PostgreSQL' : String(type || ''))
      const connectLabel = (connection) => (connection?.status === 'failed' ? t('connectFailed') : connection?.status === 'ok' ? t('connectOk') : t('connectUnknown'))
      const connectTone = (connection) => (connection?.status === 'failed' ? 'error' : connection?.status === 'ok' ? 'ok' : undefined)
      const statusChip = (label, tone) => h('span', { className: 'lwiki-ds-status', 'data-tone': tone || undefined },
        h('span', { className: 'lwiki-ds-dot', 'aria-hidden': 'true' }),
        h('span', null, label),
      )
      const collectPhaseLabel = (phase) => {
        if (phase === 'catalog') return t('collectPhaseCatalog')
        if (phase === 'count') return t('collectPhaseCount')
        if (phase === 'profile') return t('collectPhaseProfile')
        return t('taskCollect')
      }
      const collectProgressDetail = (progress) => {
        if (!progress) return ''
        const total = Number(progress.total) || 0
        const done = Number(progress.done) || 0
        const current = Number(progress.current) || (total > 0 ? Math.min(Math.max(done, 1), total) : 0)
        const phase = collectPhaseLabel(progress.phase)
        const raw = String(progress.message ?? '').trim()
        let detail = ''
        if (progress.phase === 'profile' && raw) detail = t('collectTable').replace('{table}', raw)
        else if (raw) detail = raw.replace(/^读取结构\s*[·•]?\s*/, '').replace(/^统计行数\s*[·•]?\s*/, '') || raw
        if (total > 0) {
          return t('collectProgressDetail')
            .replace('{current}', String(current))
            .replace('{total}', String(total))
            .replace('{phase}', phase)
            .replace('{detail}', detail)
            .replace(/\s+/g, ' ')
            .trim()
        }
        return [phase, detail].filter(Boolean).join(' ')
      }
      const collectBarWidth = (progress) => {
        const total = Number(progress?.total) || 0
        if (total <= 0) return '0%'
        const done = Number(progress.done) || 0
        return `${Math.min(100, Math.round((done / total) * 100))}%`
      }
      const sourceCard = (row, opts) => {
        const progress = opts.progress
        const collecting = Boolean(progress && (progress.status === 'running' || progress.status === 'paused'))
        const detail = collecting ? collectProgressDetail(progress) : (opts.detail || opts.meta || '')
        return h('div', { className: 'lwiki-kb-shell', key: row.id },
          h('button', {
            type: 'button', className: 'lwiki-ds',
            disabled: opts.disabled || undefined,
            'data-collecting': collecting ? 'true' : undefined,
            'aria-pressed': opts.disabled ? 'false' : (opts.pressed ? 'true' : 'false'),
            'aria-busy': collecting ? 'true' : undefined,
            onClick: opts.disabled ? undefined : opts.onOpen,
          },
            h('span', { className: 'lwiki-badge' }, typeLetter(row.type)),
            h('span', { className: 'lwiki-kb-title' }, row.name),
            h('span', { className: 'lwiki-ds-line' },
              h('span', { className: 'lwiki-ds-type' }, typeName(row.type)),
              statusChip(connectLabel(row.connection), connectTone(row.connection)),
              opts.collectLabel ? statusChip(opts.collectLabel, opts.collectTone) : null,
            ),
            h('span', { className: 'lwiki-ds-foot' },
              collecting ? h('span', { className: 'lwiki-ds-progress' },
                detail ? h('span', { className: 'lwiki-ds-detail' }, detail) : null,
                h('span', { className: 'lwiki-ds-progress-row' },
                  h('div', { className: 'lwiki-bar', 'aria-hidden': 'true' },
                    h('span', { style: { width: collectBarWidth(progress) } }),
                  ),
                  h('button', {
                    type: 'button',
                    className: 'lwiki-icon-btn lwiki-ds-cancel',
                    'aria-label': t('stop'),
                    title: t('stop'),
                    onClick: (event) => {
                      event.stopPropagation()
                      call(ctx, '/wiki {"op":"taskCancel"}').then((result) => setJob(result.task)).catch(fail)
                    },
                  }, h(CloseIcon)),
                ),
              ) : (detail ? h('span', { className: 'lwiki-ds-detail' }, detail) : null),
            ),
          ),
          opts.menu || null,
        )
      }
      const wizardSteps = mode === 'defaults'
        ? (sourceMode === 'edit'
          ? [['config', t('stepConfig')], ['scope', t('stepScope')]]
          : [['type', t('stepType')], ['config', t('stepConfig')], ['scope', t('stepScope')]])
        : sourceMode === 'edit'
          ? [['config', t('stepConfig')], ['scope', t('stepScope')], ['sync', t('stepSync')]]
          : sourceMode === 'existing'
            ? [['type', t('stepType')], ['scope', t('stepScope')], ['sync', t('stepSync')]]
            : [['type', t('stepType')], ['config', t('stepConfig')], ['scope', t('stepScope')], ['sync', t('stepSync')]]
      const lastStep = wizardSteps[wizardSteps.length - 1][0]
      const wizardIndex = Math.max(0, wizardSteps.findIndex(([id]) => id === wizardStep))
      const wizardBase = showCreate ? null : (settingsBase ?? selected)
      const closeWizard = async () => {
        const orphan = sourceMode === 'new' ? editingId : null
        setShowForm(false)
        setEditingId(null)
        setBaseline(null)
        setVerifiedKey('')
        setSavedProbe(null)
        setAttempt(null)
        if (orphan == null) return
        const used = bases.some((item) => (item.datasourceIds ?? []).includes(orphan)) || baseDraft.datasourceIds.includes(orphan)
        if (used) return
        try {
          await call(ctx, `/datasource ${JSON.stringify({ op: 'remove', id: orphan })}`)
          await reload(mode === 'defaults' ? null : baseId)
        } catch (err) {
          fail(err)
        }
      }
      const rememberSource = async (id, fresh = false) => {
        if (mode === 'defaults') {
          await call(ctx, `/datasource ${JSON.stringify({ op: 'update', id, scope: { tables: picked } })}`)
          await call(ctx, catalogLine({ id, inline: false }))
          setShowForm(false)
          setEditingId(null)
          setBaseline(null)
          flashNotice(t('saved'))
          await reload(null)
          return
        }
        if (fresh) {
          await call(ctx, `/datasource ${JSON.stringify({ op: 'update', id, scope: { tables: picked } })}`)
          await call(ctx, catalogLine({ id, inline: false }))
        }
        const tables = fresh || followDefault ? [] : picked
        if (wizardBase) {
          if (!(wizardBase.datasourceIds ?? []).includes(id)) {
            await call(ctx, `/wiki ${JSON.stringify({ op: 'bind', id: wizardBase.id, datasourceId: id })}`)
          }
          await call(ctx, `/wiki ${JSON.stringify({ op: 'setScope', id: wizardBase.id, datasourceId: id, tables })}`)
          if (syncNow) {
            beginCollectMarks()
            const result = await call(ctx, `/wiki ${JSON.stringify({ op: 'collect', datasourceId: id, knowledgeBaseId: wizardBase.id })}`)
            setJob(result.task)
          }
          await reload(baseId || wizardBase.id)
        } else {
          setBaseDraft((current) => ({
            ...current,
            datasourceIds: current.datasourceIds.includes(id) ? current.datasourceIds : [...current.datasourceIds, id],
            scopes: { ...current.scopes, [id]: tables },
            collectIds: syncNow ? [...new Set([...current.collectIds, id])] : current.collectIds.filter((item) => item !== id),
          }))
          await reload(null)
        }
        setShowForm(false)
        setEditingId(null)
        setBaseline(null)
        flashNotice(t('saved'))
      }
      const takenIds = new Set(showCreate ? (baseDraft.datasourceIds ?? []) : (wizardBase?.datasourceIds ?? []))
      const configKey = configFingerprint(form)
      const connectionReady = verifiedKey !== '' && verifiedKey === configKey
      const sourceSaved = sourceMode !== 'new' && editingId != null && baseline != null
      const stepDirty = (step) => {
        if (!baseline || sourceMode === 'new') return false
        if (step === 'config') return form.name.trim() !== baseline.name || configKey !== baseline.key
        if (step === 'scope') return followDefault !== baseline.follow || !sameSet(picked, baseline.tables)
        if (step === 'sync') return syncNow !== baseline.syncNow
        return false
      }
      const passwordReady = editingId != null || form.password !== ''
      const configValid = connectionReady && passwordReady && form.name.trim() !== '' && form.host.trim() !== '' && form.database.trim() !== ''
      const scopeValid = followDefault || (chosenDbs.length > 0 && picked.length > 0)
      const stepValid = (step) => {
        if (step === 'type') return sourceMode === 'existing' ? Boolean(editingId) && !takenIds.has(editingId) : Boolean(form.type)
        if (step === 'config') return configValid
        if (step === 'scope') return scopeValid
        return true
      }
      const connectionNote = connectionReady
        ? { tone: 'ok', text: t('connectReady') }
        : attempt?.key === configKey
          ? { tone: 'error', text: attempt.error }
          : savedProbe?.key === configKey && savedProbe.status === 'failed'
            ? { tone: 'error', text: savedProbe.error || t('connectFailed') }
            : { tone: 'hint', text: t('connectRequired') }
      const kbTablesOf = (id) => (showCreate ? (baseDraft.scopes?.[id] ?? []) : ((settingsBase ?? selected)?.scopes?.[String(id)]?.tables ?? []))
      const defaultTablesOf = (id) => sources.find((row) => row.id === id)?.scope?.tables ?? []
      const enterScope = (id, fresh) => {
        if (mode === 'defaults') {
          setFollowDefault(false)
          return defaultTablesOf(id)
        }
        const kb = kbTablesOf(id)
        const follow = !fresh && kb.length === 0
        setFollowDefault(follow)
        return kb.length ? kb : (fresh ? [] : defaultTablesOf(id))
      }
      const testConnection = async () => {
        if (form.type === '' || form.host.trim() === '' || form.database.trim() === '') return
        if (editingId == null && form.password === '') return
        const key = configFingerprint(form)
        setBusy('check')
        setScopeError('')
        setError('')
        setAttempt(null)
        try {
          await call(ctx, `/datasource ${JSON.stringify({ op: 'check', ...(editingId != null ? { id: editingId } : {}), ...payload() })}`)
          setVerifiedKey(key)
        } catch (err) {
          setAttempt({ key, error: messageOf(err, t) })
        } finally {
          setBusy('')
        }
      }
      const openScopeStep = async () => {
        const hasRows = (catalog.groups?.length ?? 0) > 0 || (catalog.siblings?.length ?? 0) > 0
        if (catalog.connectionKey === configKey && hasRows) return true
        const inline = editingId == null || (baseline != null && configKey !== baseline.key)
        const savedTables = editingId == null ? (catalog.connectionKey === configKey ? picked : []) : picked
        const loaded = await loadCatalog({ id: editingId, inline, databaseName: form.database, savedTables })
        if (!loaded) return false
        if (baseline && sourceMode !== 'new' && baseline.scopeKey === baseline.key && sameSet(savedTables, baseline.tables)) {
          setBaseline((current) => current ? { ...current, tables: [...loaded.tables].sort() } : current)
        }
        return true
      }
      const saveConfig = async () => {
        if (!configValid || editingId == null) return null
        const connectionChanged = baseline != null && configKey !== baseline.key
        if (!stepDirty('config')) return { connectionChanged: false }
        await call(ctx, `/datasource ${JSON.stringify({ op: 'update', id: editingId, ...payload() })}`)
        if (connectionChanged) {
          await call(ctx, catalogLine({ id: editingId, inline: false }))
          if (mode !== 'defaults') setFollowDefault(false)
        }
        setVerifiedKey(configKey)
        setSavedProbe({ key: configKey, status: 'ok', error: '' })
        setAttempt(null)
        setBaseline((current) => ({
          name: form.name.trim(),
          key: configKey,
          tables: connectionChanged ? [] : (current?.tables ?? []),
          follow: connectionChanged && mode !== 'defaults' ? false : (current?.follow ?? followDefault),
          syncNow: current?.syncNow ?? false,
          scopeKey: current?.scopeKey ?? '',
        }))
        return { connectionChanged }
      }
      const saveScope = async (follow = followDefault) => {
        scopeRequest.current += 1
        if (!(follow || (chosenDbs.length > 0 && picked.length > 0)) || editingId == null) return false
        if (!stepDirty('scope') && follow === followDefault) return true
        const tables = follow ? [] : picked
        if (mode === 'defaults') {
          await call(ctx, `/datasource ${JSON.stringify({ op: 'update', id: editingId, scope: { tables: picked } })}`)
        } else if (wizardBase) {
          await call(ctx, `/wiki ${JSON.stringify({ op: 'setScope', id: wizardBase.id, datasourceId: editingId, tables })}`)
        } else {
          setBaseDraft((current) => ({ ...current, scopes: { ...current.scopes, [editingId]: tables } }))
        }
        setBaseline((current) => current ? { ...current, tables: [...picked].sort(), follow, scopeKey: configKey } : current)
        return true
      }
      const saveSync = async () => {
        if (!stepDirty('sync')) return true
        if (syncNow && wizardBase) {
          beginCollectMarks()
          const result = await call(ctx, `/wiki ${JSON.stringify({ op: 'collect', datasourceId: editingId, knowledgeBaseId: wizardBase.id })}`)
          setJob(result.task)
        } else if (!wizardBase) {
          setBaseDraft((current) => ({
            ...current,
            collectIds: syncNow ? [...new Set([...current.collectIds, editingId])] : current.collectIds.filter((item) => item !== editingId),
          }))
        }
        setBaseline((current) => current ? { ...current, syncNow } : current)
        return true
      }
      const saveDirtySteps = async () => {
        let connectionChanged = false
        if (wizardSteps.some(([id]) => id === 'config') && stepDirty('config')) {
          const result = await saveConfig()
          if (!result) return false
          connectionChanged = result.connectionChanged
        }
        if (wizardSteps.some(([id]) => id === 'scope') && (connectionChanged || stepDirty('scope'))) {
          if (!await saveScope(connectionChanged && mode !== 'defaults' ? false : followDefault)) return false
        }
        if (wizardSteps.some(([id]) => id === 'sync') && stepDirty('sync')) {
          if (!await saveSync()) return false
        }
        return true
      }
      const chooseType = (type, port) => {
        setSourceMode('new')
        setEditingId(null)
        setForm({ ...blank(), type, port })
        setVerifiedKey('')
        setSavedProbe(null)
        setAttempt(null)
        setBaseline(null)
        setScopeError('')
        setWizardStep('config')
      }
      const chooseExisting = async (row) => {
        if (takenIds.has(row.id) || busy !== '' || scopeBusy) return
        const nextForm = { name: row.name ?? '', type: row.type, host: row.host ?? '', port: String(row.port ?? ''), database: row.database ?? '', username: row.username ?? '', password: '' }
        const key = configFingerprint(nextForm)
        const status = row.connection?.status ?? 'unknown'
        setEditingId(row.id)
        setForm(nextForm)
        setScopeError('')
        setAttempt(null)
        setVerifiedKey(status === 'ok' ? key : '')
        setSavedProbe({ key, status, error: row.connection?.error ?? '' })
        const savedTables = enterScope(row.id, false)
        const follow = mode !== 'defaults' && kbTablesOf(row.id).length === 0
        setWizardStep('scope')
        setBusy('save')
        try {
          const loaded = await loadCatalog({ id: row.id, inline: false, fields: nextForm, databaseName: nextForm.database, savedTables })
          if (!loaded) {
            setWizardStep('type')
            return
          }
          setVerifiedKey(key)
          setSavedProbe({ key, status: 'ok', error: '' })
          setBaseline({ name: nextForm.name.trim(), key, tables: [...loaded.tables].sort(), follow, syncNow: false, scopeKey: key })
        } catch (err) {
          setWizardStep('type')
          fail(err)
        } finally {
          setBusy('')
        }
      }
      const pastScopeLocked = (id) => {
        const scopeIndex = wizardSteps.findIndex(([step]) => step === 'scope')
        const target = wizardSteps.findIndex(([step]) => step === id)
        if (scopeIndex < 0 || target <= scopeIndex) return false
        if (stepDirty('scope')) return true
        return Boolean(baseline && baseline.scopeKey !== baseline.key)
      }
      const pastConfigLocked = (id) => {
        const configIndex = wizardSteps.findIndex(([step]) => step === 'config')
        const target = wizardSteps.findIndex(([step]) => step === id)
        if (configIndex < 0 || target <= configIndex) return false
        return !connectionReady
      }
      const jumpStep = async (id) => {
        if (id === wizardStep || busy !== '' || scopeBusy) return
        if (!sourceSaved || stepDirty(wizardStep) || pastScopeLocked(id) || pastConfigLocked(id)) return
        if (id === 'scope') {
          setBusy('save')
          setError('')
          try {
            if (!await openScopeStep()) return
          } catch (err) {
            fail(err)
            return
          } finally {
            setBusy('')
          }
        }
        setWizardStep(id)
      }
      const goNext = async () => {
        if (wizardStep === 'type' && sourceMode === 'existing') {
          const row = sources.find((item) => item.id === editingId)
          if (!row || takenIds.has(row.id)) return
          await chooseExisting(row)
          return
        }
        if (wizardStep === 'type') {
          if (!form.type) return
          setWizardStep('config')
          return
        }
        if (wizardStep === 'config') {
          if (!configValid) return
          setBusy('save')
          setError('')
          try {
            if (await openScopeStep()) setWizardStep('scope')
          } catch (err) {
            fail(err)
          } finally {
            setBusy('')
          }
          return
        }
        if (wizardStep === 'scope' && scopeValid) setWizardStep('sync')
      }
      const finishCreate = async () => {
        if (sourceMode === 'existing') {
          if (!editingId || !scopeValid) return
          setBusy('save')
          setError('')
          try {
            await rememberSource(editingId, false)
          } catch (err) {
            fail(err)
          } finally {
            setBusy('')
          }
          return
        }
        if (!configValid || !scopeValid) return
        setBusy('save')
        setError('')
        try {
          let id = editingId
          if (id == null) {
            const added = await call(ctx, `/datasource ${JSON.stringify({ op: 'add', ...payload() })}`)
            id = added.id
            setEditingId(id)
          }
          await rememberSource(id, true)
        } catch (err) {
          fail(err)
        } finally {
          setBusy('')
        }
      }
      const primaryClick = async () => {
        if (sourceMode !== 'edit') {
          if (wizardStep === lastStep) await finishCreate()
          else await goNext()
          return
        }
        setBusy('save')
        setError('')
        try {
          if (wizardStep === lastStep && baseline && baseline.scopeKey !== baseline.key && wizardStep !== 'scope') {
            if (await openScopeStep()) setWizardStep('scope')
            return
          }
          if (wizardStep === lastStep) {
            if (!await saveDirtySteps()) return
            setShowForm(false)
            setEditingId(null)
            setBaseline(null)
            flashNotice(t('saved'))
            await reload(mode === 'defaults' || !wizardBase ? null : (baseId || wizardBase.id))
            return
          }
          const wasDirty = stepDirty(wizardStep)
          const ok = wizardStep === 'config' ? await saveConfig() : wizardStep === 'scope' ? await saveScope() : await saveSync()
          if (!ok) return
          if (wasDirty) {
            flashNotice(t('saved'))
            await reload(mode === 'defaults' || !wizardBase ? null : (baseId || wizardBase.id))
          }
          const next = wizardSteps[wizardIndex + 1]?.[0]
          if (next === 'scope' && !await openScopeStep()) return
          if (next) setWizardStep(next)
        } catch (err) {
          fail(err)
        } finally {
          setBusy('')
        }
      }
      const databaseRows = databasesOf(catalog, form.database || catalog.database)
        .sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.label.localeCompare(b.label))
      const tableIds = (row) => row.tables.map((table) => table.id)
      const openDbMenu = (event) => {
        const rect = event.currentTarget.getBoundingClientRect()
        const width = 280
        const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))
        const estimated = Math.min(360, databaseRows.length * 32 + 16)
        const spaceBelow = window.innerHeight - rect.bottom
        const top = spaceBelow < estimated && rect.top > spaceBelow ? Math.max(8, rect.top - estimated - 4) : rect.bottom + 4
        setDbDraft([...chosenDbs])
        setDbMenu({ top, left, width })
      }
      const closeDbMenu = async () => {
        if (!dbMenu) return
        const draft = dbDraft
        setDbMenu(null)
        const removed = chosenDbs.filter((id) => !draft.includes(id))
        const addedIds = draft.filter((id) => !chosenDbs.includes(id))
        if (removed.length === 0 && addedIds.length === 0) return
        setFollowDefault(false)
        const drop = new Set()
        for (const row of databaseRows) {
          if (!removed.includes(row.id)) continue
          for (const id of tableIds(row)) drop.add(id)
        }
        let nextPicked = picked.filter((id) => !drop.has(id))
        const nextOpen = { ...scopeOpen }
        for (const id of removed) nextOpen[id] = false
        const extraGroups = []
        const accepted = draft.filter((id) => !addedIds.includes(id))
        const needsLoad = addedIds.some((id) => {
          const row = databaseRows.find((item) => item.id === id)
          return row && tableIds(row).length === 0
        })
        if (needsLoad) setScopeBusy(true)
        try {
          for (const id of addedIds) {
            const row = databaseRows.find((item) => item.id === id)
            if (!row) continue
            let ids = tableIds(row)
            if (ids.length === 0) {
              const inline = editingId == null || (baseline != null && configKey !== baseline.key)
              const data = await call(ctx, catalogLine({ id: editingId, inline, databaseFilter: id }))
              const extra = data.groups ?? []
              extraGroups.push(...extra)
              ids = extra.flatMap((group) => (group.tables ?? []).map((table) => table.id))
            }
            if (ids.length === 0) {
              setScopeError(t('scopeEmpty'))
              continue
            }
            accepted.push(id)
            nextPicked = [...new Set([...nextPicked, ...ids])]
            nextOpen[id] = true
          }
        } catch (err) {
          setScopeError(messageOf(err, t))
        } finally {
          if (needsLoad) setScopeBusy(false)
        }
        if (extraGroups.length > 0) {
          const loaded = new Set(addedIds)
          setCatalog((current) => ({
            database: current.database,
            connectionKey: current.connectionKey,
            siblings: (current.siblings ?? []).filter((sibling) => {
              const id = typeof sibling === 'string' ? sibling : sibling?.id
              return id && !loaded.has(id)
            }),
            groups: [...(current.groups ?? []), ...extraGroups],
          }))
        }
        setChosenDbs(accepted)
        setPicked(nextPicked)
        setScopeOpen(nextOpen)
      }
      useEffect(() => {
        if (!dbMenu) return undefined
        const onKey = (event) => {
          if (event.key !== 'Escape') return
          event.preventDefault()
          event.stopImmediatePropagation()
          closeDbMenu()
        }
        window.addEventListener('keydown', onKey, true)
        return () => window.removeEventListener('keydown', onKey, true)
      })
      const visibleDatabases = databaseRows.filter((row) => chosenDbs.includes(row.id))
      const scopeTree = h('div', null,
        scopeError ? h('p', { className: 'lwiki-error', role: 'alert' }, scopeError) : null,
        scopeBusy && databaseRows.length === 0 ? h('p', { className: 'lwiki-empty' }, t('scopeLoading')) : null,
        !scopeBusy && databaseRows.length === 0 && !scopeError ? h('p', { className: 'lwiki-empty' }, t('scopeEmpty')) : null,
        h('div', { className: 'lwiki-actions' },
          h('span', { className: 'lwiki-intro' }, t('scopeTablesLabel')),
          databaseRows.length > 0 ? h('button', {
            type: 'button', className: 'lwiki-db-trigger', 'aria-expanded': dbMenu ? 'true' : 'false', 'aria-haspopup': 'dialog', 'aria-label': t('scopeDbMenu'),
            disabled: scopeBusy, onClick: openDbMenu,
          }, t('scopeDbRatio').replace('{selected}', String(chosenDbs.length)).replace('{total}', String(databaseRows.length)), h(Caret, { open: Boolean(dbMenu) })) : null,
          mode === 'defaults' || sourceMode === 'new' ? null : h('button', {
            type: 'button', className: 'lwiki-btn',
            onClick: () => { setFollowDefault(true); setPicked(defaultTablesOf(editingId)) },
          }, t('useDefaultScope')),
          mode === 'defaults' || sourceMode === 'new' ? null : h('span', { className: 'lwiki-card-meta' }, followDefault ? t('scopeInherited') : t('scopeOverride')),
        ),
        visibleDatabases.length > 0 ? h('div', null,
          visibleDatabases.map((row) => {
            const ids = tableIds(row)
            const selectedCount = ids.filter((id) => picked.includes(id)).length
            const all = ids.length > 0 && selectedCount === ids.length
            const some = selectedCount > 0 && !all
            const open = scopeOpen[row.id] !== false
            return h('div', { key: row.id },
              h('div', { className: 'lwiki-scope-head' },
                h('button', {
                  type: 'button', className: 'lwiki-group', 'aria-expanded': open ? 'true' : 'false', 'aria-label': row.label,
                  onClick: () => setScopeOpen((current) => ({ ...current, [row.id]: current[row.id] === false })),
                }, h(Caret, { open })),
                h('label', { className: 'lwiki-check' },
                  h('input', {
                    type: 'checkbox', checked: all, disabled: ids.length === 0 || scopeBusy,
                    ref: (el) => { if (el) el.indeterminate = some },
                    onChange: () => { setFollowDefault(false); setPicked((current) => all ? current.filter((id) => !ids.includes(id)) : [...new Set([...current, ...ids])]) },
                  }),
                  scopeName(row.label, row.description),
                ),
              ),
              open ? h('div', { className: 'lwiki-tree' }, row.tables.map((table) => h('label', { className: 'lwiki-check', key: table.id },
                h('input', {
                  type: 'checkbox', checked: picked.includes(table.id),
                  onChange: () => { setFollowDefault(false); setPicked((current) => current.includes(table.id) ? current.filter((id) => id !== table.id) : [...current, table.id]) },
                }),
                scopeName(table.label, table.description),
              ))) : null,
            )
          }),
        ) : null,
        h('p', { className: 'lwiki-card-meta' }, visibleDatabases.length ? t('scopeSummary').replace('{databases}', String(visibleDatabases.length)).replace('{tables}', String(picked.length)) : t('scopeDefault')),
      )
      const primaryDisabled = busy !== '' || scopeBusy || (
        sourceMode === 'edit'
          ? !stepValid(wizardStep)
          : wizardStep === lastStep
            ? (sourceMode === 'existing' ? !editingId || !scopeValid : !configValid || !scopeValid)
            : !stepValid(wizardStep)
      )
      const primaryLabel = wizardStep === lastStep ? t('save') : t('next')
      const sourceDialog = showForm ? h('div', {
        className: 'lwiki-drawer-mask lwiki-wizard-mask',
        onClick: () => { if (busy === '' && !scopeBusy) closeWizard() },
      }, h('aside', {
        className: 'lwiki-drawer lwiki-drawer-doc lwiki-wizard',
        role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'lwiki-source-title',
        onClick: (event) => event.stopPropagation(),
      },
        h('div', { className: 'lwiki-drawer-head' },
          h('h2', { id: 'lwiki-source-title' }, sourceMode === 'edit' ? t('wizardEdit') : t('wizardAdd')),
          h('button', { type: 'button', className: 'lwiki-icon-btn', 'aria-label': t('close'), onClick: () => closeWizard() }, h(CloseIcon)),
        ),
        h('div', { className: 'lwiki-drawer-body' },
          h('div', { className: 'lwiki-steps' }, wizardSteps.map(([id, label], index) => h('button', {
            key: id, type: 'button', className: 'lwiki-step',
            'data-state': index === wizardIndex ? 'current' : index < wizardIndex ? 'done' : undefined,
            'aria-current': index === wizardIndex ? 'step' : undefined,
            disabled: id !== wizardStep && (!sourceSaved || stepDirty(wizardStep) || pastScopeLocked(id) || pastConfigLocked(id) || busy !== '' || scopeBusy),
            onClick: () => jumpStep(id),
          }, h('span', { className: 'lwiki-step-index' }, String(index + 1)), label))),
          wizardStep === 'type' ? h('div', null,
            mode === 'defaults' ? null : h('div', { className: 'lwiki-kinds' },
              h('button', { type: 'button', className: 'lwiki-kind', 'aria-pressed': sourceMode === 'existing' ? 'true' : 'false', onClick: () => setSourceMode('existing') }, t('existingTab')),
              h('button', { type: 'button', className: 'lwiki-kind', 'aria-pressed': sourceMode === 'new' ? 'true' : 'false', onClick: () => { setSourceMode('new'); setEditingId(null); setVerifiedKey(''); setSavedProbe(null); setAttempt(null); setBaseline(null) } }, t('newTab')),
            ),
            mode !== 'defaults' && sourceMode === 'existing'
              ? (sources.length === 0 ? h('p', { className: 'lwiki-empty' }, t('emptySources')) : h('div', { className: 'lwiki-grid' }, sources.map((row) => {
                const taken = takenIds.has(row.id)
                return sourceCard(row, {
                  pressed: !taken && editingId === row.id && wizardStep !== 'type',
                  disabled: taken,
                  meta: taken ? t('alreadyAdded') : `${row.host}:${row.port}/${row.database}`,
                  onOpen: () => chooseExisting(row),
                })
              })))
              : h('div', { className: 'lwiki-type-grid' },
                h('button', {
                  type: 'button', className: 'lwiki-type', 'aria-pressed': form.type === 'mysql' ? 'true' : 'false',
                  onClick: () => chooseType('mysql', '3306'),
                }, h('span', { className: 'lwiki-badge' }, 'M'), h('span', { className: 'lwiki-card-title' }, 'MySQL'), h('span', { className: 'lwiki-card-meta' }, t('mysqlHint'))),
                h('button', {
                  type: 'button', className: 'lwiki-type', 'aria-pressed': form.type === 'postgresql' ? 'true' : 'false',
                  onClick: () => chooseType('postgresql', '5432'),
                }, h('span', { className: 'lwiki-badge' }, 'P'), h('span', { className: 'lwiki-card-title' }, 'PostgreSQL'), h('span', { className: 'lwiki-card-meta' }, t('pgHint'))),
              ),
            sourceMode === 'existing' && scopeError ? h('p', { className: 'lwiki-error', role: 'alert' }, scopeError) : null,
          ) : null,
          wizardStep === 'config' ? h('div', { className: 'lwiki-settings-form' },
            h('span', { className: 'lwiki-label' }, t('sectionBasic')),
            field('name', t('name')),
            h('span', { className: 'lwiki-label' }, t('sectionCredential')),
            field('username', t('username')),
            field('password', editingId != null ? t('passwordKeep') : t('password'), 'password'),
            field('host', t('host')),
            field('port', t('port')),
            field('database', t('database')),
          ) : null,
          wizardStep === 'scope' ? scopeTree : null,
          wizardStep === 'sync' ? h('div', { className: 'lwiki-settings-form' },
            h('p', { className: 'lwiki-intro' }, t('syncHint')),
            h('div', { className: 'lwiki-kinds' },
              h('button', { type: 'button', className: 'lwiki-kind', 'aria-pressed': syncNow ? 'false' : 'true', onClick: () => setSyncNow(false) }, t('syncLater')),
              h('button', { type: 'button', className: 'lwiki-kind', 'aria-pressed': syncNow ? 'true' : 'false', onClick: () => setSyncNow(true) }, t('syncNow')),
            ),
          ) : null,
        ),
        h('div', { className: 'lwiki-drawer-foot' },
          h('div', { className: 'lwiki-actions' },
            wizardStep === 'config' ? h('button', {
              type: 'button', className: 'lwiki-btn',
              disabled: busy !== '' || form.type === '' || form.host.trim() === '' || form.database.trim() === '' || (editingId == null && form.password === ''),
              onClick: () => testConnection(),
            }, t('testConnection')) : null,
            wizardStep === 'config' ? h('span', {
              className: connectionNote.tone === 'error' || scopeError ? 'lwiki-error' : 'lwiki-card-meta',
              role: connectionNote.tone === 'error' || scopeError ? 'alert' : undefined,
            }, scopeError || connectionNote.text) : null,
            wizardIndex > 0 ? h('button', { type: 'button', className: 'lwiki-btn', disabled: busy !== '' || scopeBusy, onClick: () => setWizardStep(wizardSteps[wizardIndex - 1][0]) }, t('prev')) : null,
          ),
          h('div', { className: 'lwiki-actions' },
            h('button', { type: 'button', className: 'lwiki-btn', disabled: busy !== '', onClick: () => closeWizard() }, t('cancel')),
            h('button', { type: 'button', className: 'lwiki-btn lwiki-btn-primary', disabled: primaryDisabled, onClick: () => primaryClick() }, primaryLabel),
          ),
        ),
      ),
      dbMenu && wizardStep === 'scope' ? h('div', {
        className: 'lwiki-db-mask',
        onClick: (event) => { event.stopPropagation(); closeDbMenu() },
      }) : null,
      dbMenu && wizardStep === 'scope' ? h('div', {
        className: 'lwiki-db-pop', role: 'dialog', 'aria-label': t('scopeDbMenu'),
        style: { top: `${dbMenu.top}px`, left: `${dbMenu.left}px`, width: `${dbMenu.width}px` },
        onClick: (event) => event.stopPropagation(),
      }, databaseRows.map((row) => h('label', { className: 'lwiki-check', key: row.id },
        h('input', {
          type: 'checkbox', checked: dbDraft.includes(row.id),
          onChange: () => setDbDraft((current) => current.includes(row.id) ? current.filter((id) => id !== row.id) : [...current, row.id]),
        }),
        scopeName(row.label, row.description),
        row.isDefault ? h('span', { className: 'lwiki-card-meta' }, t('defaultDatabase')) : null,
      ))) : null,
      ) : null
      const confirmTitle = !confirm ? ''
        : confirm.kind === 'base' ? t('confirmDelete').replace('{name}', confirm.name)
          : confirm.kind === 'source' ? t('confirmSource').replace('{name}', confirm.name)
            : confirm.kind === 'clear' ? t('confirmClear').replace('{name}', confirm.name)
              : confirm.kind === 'material' ? t('confirmMaterial').replace('{name}', confirm.name)
                : t('confirmUnbind').replace('{name}', confirm.name)
      const confirmBody = !confirm ? ''
        : confirm.kind === 'base' ? t('confirmBodyBase')
          : confirm.kind === 'source' ? t('confirmBodySource')
            : confirm.kind === 'clear' ? t('confirmBodyClear')
              : confirm.kind === 'material' ? t('confirmBodyMaterial')
                : t('confirmBodyUnbind')
      const confirmDialog = confirm ? overlay('lwiki-confirm-title', confirmTitle,
        h('p', { className: 'lwiki-intro' }, confirmBody),
        h(React.Fragment, null,
          h('span', null),
          h('div', { className: 'lwiki-actions' },
            h('button', { type: 'button', className: 'lwiki-btn', onClick: () => setConfirm(null) }, t('cancel')),
            h('button', {
              type: 'button', className: 'lwiki-btn lwiki-btn-primary', disabled: busy !== '',
              onClick: () => {
                const pending = confirm
                setBusy(pending.kind)
                const line = pending.kind === 'base'
                  ? `/wiki ${JSON.stringify({ op: 'baseRemove', id: pending.id })}`
                  : pending.kind === 'source'
                    ? `/datasource ${JSON.stringify({ op: 'remove', id: pending.id })}`
                    : pending.kind === 'clear'
                    ? `/wiki ${JSON.stringify({ op: 'materialsClear', ...scopeOf(baseId) })}`
                    : pending.kind === 'material'
                      ? `/wiki ${JSON.stringify({ op: 'materialRemove', id: pending.id })}`
                      : `/wiki ${JSON.stringify({ op: 'unbind', id: manageBase?.id, datasourceId: pending.id })}`
                call(ctx, line).then(() => {
                  setConfirm(null)
                  if (pending.kind === 'unbind') {
                    setShowForm(false)
                    setEditingId(null)
                    flashNotice(t('unbound'))
                  }
                  if (pending.kind === 'material' && materialFocus === pending.id) setMaterialFocus(null)
                  if (pending.kind === 'clear') setMaterialFocus(null)
                  if (pending.kind === 'base') {
                    if (settingsId === pending.id) setSettingsId(null)
                    if (baseId === pending.id) setBaseId(null)
                    publishBases()
                  }
                  if (pending.kind === 'source') flashNotice(t('removed'))
                  return load(pending.kind === 'base' ? null : baseId)
                }).catch(fail).finally(() => setBusy(''))
              },
            }, confirm.kind === 'base' ? t('removeBase') : confirm.kind === 'source' ? t('remove') : confirm.kind === 'clear' ? t('clearMaterials') : confirm.kind === 'material' ? t('removeMaterial') : t('unbind')),
          ),
        ), () => setConfirm(null)) : null
      const failureStageOf = (reason) => {
        const text = String(reason || '')
        if (/^project failed:/i.test(text)) return 'project'
        if (/page belongs to another knowledge base|new decision targets|update decision targets|decision invalid/i.test(text)) return 'apply'
        return 'compile'
      }
      const failurePanel = (item) => {
        if (!item || item.status !== 'failed') return null
        const stage = failureStageOf(item.failureReason)
        const steps = [
          ['compile', t('failStageCompile')],
          ['apply', t('failStageApply')],
          ['project', t('failStageProject')],
        ]
        const order = { compile: 0, apply: 1, project: 2 }
        const failedAt = order[stage] ?? 0
        return h('section', { className: 'lwiki-fail', 'aria-label': t('failDetailTitle') },
          h('h3', { className: 'lwiki-fail-title' }, t('failDetailTitle')),
          h('p', { className: 'lwiki-fail-label' }, t('failProcess')),
          h('ol', { className: 'lwiki-fail-steps' }, steps.map(([id, label], index) => {
            const state = index < failedAt ? 'done' : index === failedAt ? 'failed' : 'pending'
            const mark = state === 'done' ? '✓' : state === 'failed' ? '✗' : '·'
            return h('li', { key: id, className: 'lwiki-fail-step', 'data-state': state },
              h('span', { className: 'lwiki-fail-mark', 'aria-hidden': 'true' }, mark),
              h('span', null, label),
            )
          })),
          h('p', { className: 'lwiki-fail-label' }, t('failReason')),
          h('pre', { className: 'lwiki-fail-reason' }, item.failureReason || t('failUnknown')),
          h('p', { className: 'lwiki-fail-hint' }, t('failHint')),
        )
      }
      const viewDialog = view ? drawer('lwiki-view-title', view.title,
        h('div', null,
          view.slug && view.kind === 'review' ? h('p', { className: 'lwiki-meta' }, view.slug) : null,
          view.guide ? h('div', { className: 'lwiki-md' }, renderMarkdown(t('reviewGuide'))) : null,
          h('div', { className: 'lwiki-md' }, renderMarkdown(view.body)),
          view.kind === 'delete' ? h('p', { className: 'lwiki-meta' }, t('deleteKeeps')) : null,
        ),
        view.id ? h('div', { className: 'lwiki-actions' },
          h('button', {
            type: 'button', className: 'lwiki-btn', disabled: busy !== '',
            onClick: () => { setBusy(view.id); call(ctx, `/wiki ${JSON.stringify({ op: 'resolve', id: view.id, status: 'accepted' })}`).then(() => { setView(null); return load(baseId) }).catch(fail).finally(() => setBusy('')) },
          }, t('accept')),
          h('button', {
            type: 'button', className: 'lwiki-btn', disabled: busy !== '',
            onClick: () => { setBusy(view.id); call(ctx, `/wiki ${JSON.stringify({ op: 'resolve', id: view.id, status: 'rejected' })}`).then(() => { setView(null); return load(baseId) }).catch(fail).finally(() => setBusy('')) },
          }, t('reject')),
        ) : null,
        () => setView(null),
      ) : null
      const folderOrder = [t('folderTable'), t('folderDomain'), t('folderLink'), t('folderDict'), t('folderOther')]
      const sourceBuckets = new Map()
      const materialFiles = []
      for (const item of shownMaterials) {
        const sourceId = item.datasourceId == null ? '' : String(item.datasourceId)
        const found = sources.find((row) => row.id === item.datasourceId)
        const name = item.datasourceId == null ? t('folderOther') : (found?.name || t('unnamedSource').replace('{id}', sourceId))
        const bucket = sourceBuckets.get(sourceId) ?? { id: sourceId || 'other', name, items: 0, folders: new Map() }
        bucket.items += 1
        sourceBuckets.set(sourceId, bucket)
        for (const file of filesOf(item)) {
          materialFiles.push(file)
          bucket.folders.set(file.folder, [...(bucket.folders.get(file.folder) ?? []), file])
        }
      }
      const materialNodes = [...sourceBuckets.values()]
        .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
        .map((bucket) => ({
          id: bucket.id,
          label: bucket.name,
          count: bucket.items,
          children: folderOrder.filter((name) => bucket.folders.has(name)).map((name) => ({
            id: `${bucket.id}/${name}`,
            label: name,
            count: bucket.folders.get(name).length,
            rows: bucket.folders.get(name),
          })),
        }))
      const focusedFile = materialFiles.find((file) => file.id === materialFocus) ?? null
      const openEdit = (row, step = 'config') => {
        setShowForm(true)
        setSourceMode('edit')
        setWizardStep(step)
        setEditingId(row.id)
        setSyncNow(false)
        setError('')
        setAttempt(null)
        const nextForm = { name: row.name ?? '', type: row.type, host: row.host ?? '', port: String(row.port ?? ''), database: row.database ?? '', username: row.username ?? '', password: '' }
        setForm(nextForm)
        const key = configFingerprint(nextForm)
        const status = row.connection?.status ?? 'unknown'
        setVerifiedKey(status === 'ok' ? key : '')
        setSavedProbe({ key, status, error: row.connection?.error ?? '' })
        const kb = showCreate ? (baseDraft.scopes?.[row.id] ?? []) : ((settingsBase ?? selected)?.scopes?.[String(row.id)]?.tables ?? [])
        const defaults = row.scope?.tables ?? []
        const follow = mode !== 'defaults' && kb.length === 0
        setFollowDefault(follow)
        const tables = mode === 'defaults' ? defaults : (kb.length ? kb : defaults)
        setPicked(tables)
        setChosenDbs([])
        setDbMenu(null)
        setDbDraft([])
        setBaseline({ name: nextForm.name.trim(), key, tables: [...tables].sort(), follow, syncNow: false, scopeKey: key })
        if (step === 'config') setCatalog({ groups: [], siblings: [], database: '' })
        else {
          loadCatalog({ id: row.id, inline: false, fields: nextForm, databaseName: row.database, savedTables: tables }).then((loaded) => {
            if (!loaded) return
            setVerifiedKey(key)
            setSavedProbe({ key, status: 'ok', error: '' })
            setBaseline((current) => current && current.key === key ? { ...current, tables: [...loaded.tables].sort(), scopeKey: key } : current)
          })
        }
      }
      const editorOpen = showCreate || Boolean(settingsBase)
      const editorSection = showCreate ? createSection : settingsSection
      const setEditorSection = showCreate ? setCreateSection : setSettingsSection
      const editorSources = showCreate ? sources.filter((row) => baseDraft.datasourceIds.includes(row.id)) : manageBound
      const editorMeta = (row) => {
        const inherited = (tables) => (tables?.length ? databaseCountText(tables) : (row.scope?.tables?.length ? t('scopeInherited') : t('scopeDefault')))
        if (showCreate) return inherited(baseDraft.scopes?.[row.id])
        const saved = settingsBase?.collects?.[String(row.id)]
        const collect = saved?.state === 'done' ? t('collectOk') : saved?.state === 'failed' ? t('collectFail') : saved?.state === 'cancelled' ? t('taskCancelled') : t('collectNone')
        const tables = settingsBase?.scopes?.[String(row.id)]?.tables
        const scope = inherited(tables)
        return `${collect} · ${scope}`
      }
      const packsEditor = !showCreate && editorSection === 'packs' ? h('div', { className: 'lwiki-settings-form' },
        availablePacks.length === 0
          ? h('p', { className: 'lwiki-empty' }, t('packNone'))
          : availablePacks.map((pack) => {
            const id = String(pack.id)
            const checked = settingsDraft.packIds.includes(id)
            return h('label', { key: id, className: 'lwiki-field', style: { flexDirection: 'row', alignItems: 'center', gap: 8 } },
              h('input', {
                type: 'checkbox',
                checked,
                onChange: () => {
                  const next = checked
                    ? settingsDraft.packIds.filter((item) => item !== id)
                    : [...settingsDraft.packIds, id]
                  setSettingsDraft({ ...settingsDraft, packIds: next })
                  setBusy('packs')
                  setError('')
                  call(ctx, `/wiki ${JSON.stringify({ op: 'setPacks', id: settingsBase.id, packIds: next })}`)
                    .then(() => { flashNotice(t('saved')); return load(baseId) })
                    .catch(fail)
                    .finally(() => setBusy(''))
                },
              }),
              h('span', null, pack.title || id),
            )
          }),
      ) : null
      const baseDialog = editorOpen ? studio(showCreate ? 'lwiki-create-title' : 'lwiki-settings-title', showCreate ? t('createTitle') : t('baseConfig'), editorSection, setEditorSection,
        editorSection === 'info' ? h('div', { className: 'lwiki-settings-form' },
          h('label', { className: 'lwiki-field' },
            h('span', { className: 'lwiki-label' }, t('baseName')),
            h('input', {
              className: 'lwiki-input',
              value: showCreate ? baseDraft.name : settingsDraft.name,
              onChange: (event) => (showCreate ? setBaseDraft({ ...baseDraft, name: event.target.value }) : setSettingsDraft({ ...settingsDraft, name: event.target.value })),
            }),
          ),
          h('label', { className: 'lwiki-field' },
            h('span', { className: 'lwiki-label' }, t('baseDescription')),
            h('input', {
              className: 'lwiki-input',
              value: showCreate ? baseDraft.description : settingsDraft.description,
              onChange: (event) => (showCreate ? setBaseDraft({ ...baseDraft, description: event.target.value }) : setSettingsDraft({ ...settingsDraft, description: event.target.value })),
            }),
          ),
        ) : editorSection === 'packs' ? packsEditor : h('div', { className: 'lwiki-grid' },
          editorSources.map((row) => sourceCard(row, { meta: editorMeta(row), onOpen: () => openEdit(row) })),
          h('button', { type: 'button', className: 'lwiki-source-add', onClick: openAdd }, h(PlusIcon), h('span', null, t('addSourceCard'))),
        ),
        h(React.Fragment, null,
          h('span', { className: 'lwiki-card-meta' }, !showCreate && editorSection === 'sources' ? t('settingsLive') : (!showCreate && editorSection === 'packs' ? t('packsLive') : '')),
          h('div', { className: 'lwiki-actions' },
            showCreate ? h('button', { type: 'button', className: 'lwiki-btn', onClick: () => setShowCreate(false) }, t('cancel')) : null,
            showCreate ? h('button', {
              type: 'button', className: 'lwiki-btn lwiki-btn-primary', disabled: busy !== '' || baseDraft.name.trim() === '',
              onClick: async () => {
                setBusy('create')
                setError('')
                try {
                  const created = await call(ctx, `/wiki ${JSON.stringify({ op: 'baseCreate', name: baseDraft.name.trim(), description: baseDraft.description.trim() })}`)
                  for (const datasourceId of baseDraft.datasourceIds) {
                    await call(ctx, `/wiki ${JSON.stringify({ op: 'bind', id: created.base.id, datasourceId })}`)
                    const tables = baseDraft.scopes?.[datasourceId]
                    if (tables?.length) await call(ctx, `/wiki ${JSON.stringify({ op: 'setScope', id: created.base.id, datasourceId, tables })}`)
                  }
                  const collectId = baseDraft.collectIds[0]
                  setShowCreate(false)
                  setBaseDraft(emptyBase())
                  setTab('sources')
                  setBaseId(created.base.id)
                  publishBases()
                  if (collectId) {
                    beginCollectMarks()
                    const result = await call(ctx, `/wiki ${JSON.stringify({ op: 'collect', datasourceId: collectId, knowledgeBaseId: created.base.id })}`)
                    setJob(result.task)
                  }
                } catch (err) {
                  fail(err)
                } finally {
                  setBusy('')
                }
              },
            }, t('createBase')) : null,
            !showCreate && editorSection === 'info' ? h('button', {
              type: 'button', className: 'lwiki-btn lwiki-btn-primary', disabled: busy !== '' || settingsDraft.name.trim() === '',
              onClick: () => {
                setBusy('settings')
                setError('')
                call(ctx, `/wiki ${JSON.stringify({ op: 'baseUpdate', id: settingsBase.id, name: settingsDraft.name.trim(), description: settingsDraft.description.trim() })}`)
                  .then(() => { flashNotice(t('saved')); return load(baseId) })
                  .catch(fail)
                  .finally(() => setBusy(''))
              },
            }, t('save')) : null,
            showCreate ? null : h('button', { type: 'button', className: 'lwiki-btn', onClick: () => setSettingsId(null) }, t('close')),
          ),
        ),
        () => { if (!showForm) { setShowCreate(false); setSettingsId(null) } },
      ) : null
      const tabHint = { sources: t('stepSources'), materials: t('stepMaterials'), wiki: t('stepWiki'), proposals: t('stepProposals') }
      const selectTab = (id) => {
        setTab(id)
        setNotice('')
        if (noticeTimer.current) {
          window.clearTimeout(noticeTimer.current)
          noticeTimer.current = 0
        }
        setTabMarks((marks) => {
          const mark = marks[id]
          // 处理中转圈不能点 Tab 清掉；只清完成态的绿/红点与数量角标。
          if (!mark || mark.spinning) return marks
          const copy = { ...marks }
          delete copy[id]
          return copy
        })
        if (id !== 'wiki') setPage(null)
        if (id !== 'materials') setMaterialFocus(null)
        if (id !== 'proposals') setView(null)
        if (id !== 'sources') setMenuId(null)
      }
      if (mode === 'defaults') {
        return h('div', { className: 'lwiki' },
          h('p', { className: 'lwiki-intro' }, t('defaultsHint')),
          error ? h('p', { className: 'lwiki-error', role: 'alert' }, error) : null,
          notice ? h('p', { className: 'lwiki-intro' }, notice) : null,
          h('div', { className: 'lwiki-grid' },
            sources.map((row) => {
              const menuKey = `ds:${row.id}`
              return sourceCard(row, {
                meta: row.scope?.tables?.length ? databaseCountText(row.scope.tables) : t('scopeDefault'),
                onOpen: () => { setMenuId(null); openEdit(row) },
                menu: h(React.Fragment, null,
                  h('button', {
                    type: 'button', className: 'lwiki-icon-btn lwiki-more', 'data-lwiki-menu': 'true', 'aria-label': t('more'), 'aria-expanded': menuId === menuKey ? 'true' : 'false',
                    onClick: (event) => { event.stopPropagation(); setMenuId(menuId === menuKey ? null : menuKey) },
                  }, '…'),
                  menuId === menuKey ? h('div', { className: 'lwiki-menu', 'data-lwiki-menu': 'true' },
                    h('button', { type: 'button', className: 'lwiki-menu-item', onClick: () => { setMenuId(null); openEdit(row, 'scope') } }, t('editScope')),
                    h('button', { type: 'button', className: 'lwiki-menu-item lwiki-menu-danger', onClick: () => { setMenuId(null); setConfirm({ kind: 'source', id: row.id, name: row.name }) } }, t('remove')),
                  ) : null,
                ),
              })
            }),
            h('button', { type: 'button', className: 'lwiki-source-add', onClick: openAdd }, h(PlusIcon), h('span', null, t('addSourceCard'))),
          ),
          sourceDialog,
          confirmDialog,
        )
      }
      if (!baseId) {
        return h('div', { className: 'lwiki' },
          h('header', { className: 'lwiki-head' },
            h('div', { className: 'lwiki-titles' },
              h('h1', null, t('nav')),
              h('p', { className: 'lwiki-sub' }, t('intro')),
            ),
            h('button', {
              type: 'button', className: 'lwiki-btn lwiki-btn-primary',
              onClick: () => { setShowCreate(true); setCreateSection('info'); setBaseDraft(emptyBase()); setError('') },
            }, t('createBase')),
          ),
          h('div', { className: 'lwiki-scroll' },
            error ? h('p', { className: 'lwiki-error', role: 'alert' }, error) : null,
            bases.length === 0 ? h('p', { className: 'lwiki-empty' }, t('emptyBases')) : h('div', { className: 'lwiki-grid' }, bases.map((base) => h('div', { className: 'lwiki-kb-shell', key: base.id },
              h('button', {
                type: 'button', className: 'lwiki-kb',
                onClick: () => {
                  setTab((base.pageCount ?? 0) > 0 ? 'wiki' : 'sources')
                  setPage(null)
                  setView(null)
                  setConfirm(null)
                setShowForm(false)
                setMaterialFocus(null)
                setOpenNodes({})
                setMenuId(null)
                setSettingsId(null)
                setBaseId(base.id)
                setNotice('')
              },
            },
              h('span', { className: 'lwiki-kb-head' },
                h(FolderIcon),
                h('span', { className: 'lwiki-kb-title' }, base.name),
                base.isDefault ? h('span', { className: 'lwiki-kb-mark' }, h(StarIcon), t('defaultMark')) : null,
                h('span', { className: 'lwiki-card-meta' }, base.description || t('noDesc')),
              ),
              h('span', { className: 'lwiki-pills' },
                h('span', { className: 'lwiki-pill' }, `${t('sources')} ${base.datasourceIds?.length ?? 0}`),
                h('span', { className: 'lwiki-pill' }, `${t('materials')} ${base.materialCount ?? 0}`),
                h('span', { className: 'lwiki-pill' }, `${t('wiki')} ${base.pageCount ?? 0}`),
              ),
            ),
            h('button', {
              type: 'button', className: 'lwiki-icon-btn lwiki-more', 'data-lwiki-menu': 'true', 'aria-label': t('more'), 'aria-expanded': menuId === base.id ? 'true' : 'false',
              onClick: (event) => { event.stopPropagation(); setMenuId(menuId === base.id ? null : base.id) },
            }, '…'),
            menuId === base.id ? h('div', { className: 'lwiki-menu', 'data-lwiki-menu': 'true' },
              h('button', {
                type: 'button', className: 'lwiki-menu-item', disabled: base.isDefault,
                onClick: () => {
                  setMenuId(null)
                  call(ctx, `/wiki ${JSON.stringify({ op: 'setDefault', id: base.id })}`).then(() => publishBases()).catch(fail)
                },
              }, t('setDefault')),
              h('button', { type: 'button', className: 'lwiki-menu-item', onClick: () => { setMenuId(null); setSettingsId(base.id) } }, t('settings')),
              h('button', { type: 'button', className: 'lwiki-menu-item lwiki-menu-danger', onClick: () => { setMenuId(null); setConfirm({ kind: 'base', id: base.id, name: base.name }) } }, t('removeBase')),
            ) : null,
          ))),
        ),
        baseDialog,
        sourceDialog,
        confirmDialog,
      )
      }
      const collectStateOf = (id) => {
        const sameSource = job?.datasourceId == null || Number(job.datasourceId) === Number(id)
        const forThisBase = job?.kind === 'collect'
          && sameSource
          && (!job.knowledgeBaseId || job.knowledgeBaseId === baseId)
        if (forThisBase && (job.status === 'running' || job.status === 'paused')) {
          return { state: job.status === 'paused' ? 'paused' : 'running', job }
        }
        if (forThisBase && job.status === 'failed') return { state: 'failed', error: job.error }
        if (forThisBase && job.status === 'cancelled') return { state: 'cancelled' }
        if (forThisBase && job.status === 'done') return { state: 'done' }
        const saved = selected?.collects?.[String(id)]
        if (saved?.state) return saved
        if (materials.some((item) => item.datasourceId === id)) return { state: 'done' }
        return null
      }
      const collectLabelOf = (state) => {
        if (!state) return t('collectNone')
        if (state.state === 'running' || state.state === 'paused') return t('taskCollect')
        if (state.state === 'done') return t('collectOk')
        if (state.state === 'failed') return t('collectFail')
        if (state.state === 'cancelled') return t('taskCancelled')
        return t('collectNone')
      }
      const collectToneOf = (state) => {
        if (state?.state === 'running' || state?.state === 'paused') return 'active'
        if (state?.state === 'done') return 'ok'
        if (state?.state === 'failed') return 'error'
        return undefined
      }
      const cardScopeDetail = (row) => {
        const own = selected?.scopes?.[String(row.id)]?.tables
        if (own?.length) return databaseCountText(own)
        const inherited = row.scope?.tables
        if (inherited?.length) return `${databaseCountText(inherited)} · ${t('scopeDefaultTag')}`
        const db = row.database || t('defaultDatabase')
        return `${db} · ${t('scopeDefaultTag')}`
      }
      const dirRow = (key, current, label, count, onClick, open) => h('button', {
        key, type: 'button', className: 'lwiki-dir-row', 'aria-current': current ? 'page' : undefined,
        'aria-expanded': open == null ? undefined : (open ? 'true' : 'false'),
        onClick,
      }, open == null ? null : h(Caret, { open }), h(FolderIcon), h('span', { className: 'lwiki-row-label' }, label), h('span', { className: 'lwiki-status' }, String(count)))
      const toneOf = (status) => (status === 'published' || status === 'decided' ? 'ok' : status === 'failed' ? 'error' : status === 'compiling' ? 'active' : '')
      const docRow = (key, current, title, meta, tag, status, tone, onClick, compact) => h('li', { key },
        h('button', {
          type: 'button', className: compact ? 'lwiki-doc' : 'lwiki-doc lwiki-doc-row',
          'aria-current': current ? 'page' : undefined, onClick,
        },
          h('span', { className: 'lwiki-doc-lead' },
            h('span', { className: 'lwiki-doc-icon' }, h(DocIcon)),
            h('span', { className: 'lwiki-doc-text' },
              h('span', { className: 'lwiki-doc-title' }, title),
              meta ? h('span', { className: 'lwiki-doc-meta' }, meta) : null,
            ),
          ),
          compact ? null : h('span', { className: 'lwiki-pill' }, tag || ''),
          compact
            ? (status ? h('span', { className: 'lwiki-pill' }, status) : null)
            : h('span', { className: 'lwiki-status-line', 'data-tone': tone || undefined }, h('span', { className: 'lwiki-dot' }), status),
        ),
      )
      const modeToggle = h('div', { className: 'lwiki-mode' },
        h('button', { type: 'button', className: 'lwiki-icon-btn', 'aria-pressed': browse === 'columns' ? 'true' : 'false', 'aria-label': t('modeColumns'), title: t('modeColumns'), onClick: () => setBrowse('columns') }, h(ColumnsIcon)),
        h('button', { type: 'button', className: 'lwiki-icon-btn', 'aria-pressed': browse === 'reader' ? 'true' : 'false', 'aria-label': t('modeReader'), title: t('modeReader'), onClick: () => setBrowse('reader') }, h(ReaderIcon)),
      )
      const openWikiLink = (slug) => { openPage(slug).catch(fail) }
      const wikiNodes = [...grouped.entries()].map(([key, rows]) => ({ id: key, label: labelOf(t, key), count: rows.length, rows }))
      const activeWiki = wikiNodes.some((node) => node.id === wikiGroup) ? wikiGroup : (wikiNodes[0]?.id ?? null)
      const materialLeaves = materialNodes.flatMap((node) => node.children ?? [])
      const activeMaterial = materialLeaves.some((node) => node.id === materialGroup) ? materialGroup : (materialLeaves[0]?.id ?? null)
      const wikiLeaf = (row, compact) => {
        const title = row.title || row.slug
        const when = formatWhen(row.published?.editedAt || row.draft?.editedAt || '')
        return docRow(row.slug, page?.slug === row.slug, title, compact ? (row.slug !== title ? row.slug : '') : (when || row.slug), labelOf(t, row.pageType), labelOf(t, row.status), toneOf(row.status), () => openWikiLink(row.slug), compact)
      }
      const materialLeafRow = (file, compact) => {
        const when = formatWhen(file.item.updatedAt || file.item.createdAt || '')
        const meta = compact ? file.meta : [when, file.meta].filter(Boolean).join(' · ')
        const status = materialStatusOf(file.item)
        return docRow(file.id, materialFocus === file.id, file.title, meta, file.folder, labelOf(t, status), toneOf(status), () => setMaterialFocus(file.id), compact)
      }
      const pageTitleText = page?.title || page?.slug || ''
      const editedAt = page?.published?.editedAt || page?.draft?.editedAt || ''
      const aliases = page?.published?.aliases || page?.draft?.aliases || []
      const backlinkSlugs = page ? [...new Set([
        ...(page.backlinks ?? []),
        ...pages.filter((item) => item.slug !== page.slug && (item.links ?? []).includes(page.slug)).map((item) => item.slug),
      ])] : []
      const pageArticle = page ? h('article', { className: 'lwiki-article' },
        h('header', { className: 'lwiki-article-head' },
          h('div', { className: 'lwiki-article-main' },
            h('h2', { className: 'lwiki-article-title' }, pageTitleText),
            h('div', { className: 'lwiki-pills' },
              page.pageType ? h('span', { className: 'lwiki-pill' }, labelOf(t, page.pageType)) : null,
              h('span', { className: 'lwiki-pill' }, labelOf(t, page.status)),
              page.version != null ? h('span', { className: 'lwiki-pill' }, `v${page.version}`) : null,
              h('span', { className: 'lwiki-pill lwiki-pill-mono' }, page.slug),
            ),
          ),
          editedAt ? h('time', { className: 'lwiki-article-time', dateTime: editedAt }, formatWhen(editedAt)) : null,
        ),
        h('div', { className: 'lwiki-md' }, renderMarkdown(liftZeroShares(withoutTitle(body, pageTitleText)), openWikiLink)),
        aliases.length ? h('p', { className: 'lwiki-meta' }, `${t('aliases')}${aliases.join('、')}`) : null,
        backlinkSlugs.length || cited.length ? h('div', { className: 'lwiki-refs' },
          backlinkSlugs.length ? h('div', { className: 'lwiki-ref' },
            h('span', { className: 'lwiki-ref-label' }, t('backlinks')),
            h('span', { className: 'lwiki-ref-links' }, backlinkSlugs.map((slug) => h('button', {
              key: slug, type: 'button', className: 'lwiki-wikilink', onClick: () => openWikiLink(slug),
            }, pages.find((item) => item.slug === slug)?.title || slug))),
          ) : null,
          cited.length ? h('div', { className: 'lwiki-ref' },
            h('span', { className: 'lwiki-ref-label' }, t('sourceDocs')),
            h('span', { className: 'lwiki-ref-links' }, cited.map((id) => {
              const item = materials.find((row) => row.id === id)
              return h('span', { key: id }, item ? materialName(item.sourceRef) : id)
            })),
          ) : null,
        ) : null,
      ) : h('p', { className: 'lwiki-empty' }, t('readerEmpty'))
      const fileMarkdown = (file) => {
        if (file.slice === 'dict' || file.slice === 'domain') {
          const column = file.column
          const lines = []
          if (column.comment) lines.push(`注释：${column.comment}`, '')
          const sampled = Number(column.sampleRows) || Number(column.nullCount ?? 0) + Number(column.nonNullCount ?? 0)
          const nullRate = column.nullRate != null ? shareText(column.nullRate, column.nullCount) : (sampled > 0 ? shareText(column.nullCount / sampled, column.nullCount) : '—')
          const cardinality = column.cardinality === null || column.role === 'masked' || column.role === 'large' ? '—' : String(column.cardinality ?? column.distinctCount ?? 0)
          const selectivity = column.selectivity === null || column.role === 'masked' || column.role === 'large'
            ? '—'
            : (column.selectivity != null ? Number(column.selectivity).toFixed(2) : (column.nonNullCount ? (column.distinctCount / column.nonNullCount).toFixed(2) : '—'))
          lines.push('| 指标 | 数值 |', '| --- | --- |', `| 空值率 | ${nullRate} |`, `| 基数 | ${cardinality} |`, `| 区分度 | ${selectivity} |`, '', valueTable(column).trim())
          return lines.join('\n')
        }
        if (file.slice === 'link') {
          const rel = file.rel
          const lines = []
          if (rel.verdict === 'review') lines.push(t('reviewInProposals'), '')
          if (rel.holdText) lines.push(rel.holdText, '')
          const fixed = (value) => (Number.isFinite(Number(value)) ? Number(value).toFixed(2) : '—')
          const count = (value) => (Number.isFinite(Number(value)) ? String(value) : '—')
          const a = Number(rel.fromDistinct)
          const b = Number(rel.toDistinct)
          const cover = Number(rel.containment)
          const back = Number(rel.reverseContainment)
          const fromInter = Number.isFinite(a) && Number.isFinite(cover) ? Math.round(cover * a) : null
          const toInter = Number.isFinite(b) && Number.isFinite(back) ? Math.round(back * b) : null
          const inter = fromInter ?? toInter
          const overlap = Number.isFinite(inter) && Number.isFinite(a) && Number.isFinite(b) ? Math.max(0, Math.min(a, b, inter)) : null
          const coverCell = (rate, distinct) => {
            if (!Number.isFinite(Number(rate)) || !Number.isFinite(Number(distinct))) return '—'
            return Number.isFinite(overlap) ? `${shareText(rate)}（${overlap}/${distinct}）` : shareText(rate)
          }
          const jaccard = Number.isFinite(overlap) ? `${fixed(rel.jaccard)}（${overlap}/${a + b - overlap}）` : fixed(rel.jaccard)
          lines.push(
            `| 指标 | ${rel.fromTable}.${rel.fromColumn} | ${rel.toTable}.${rel.toColumn} |`,
            '| --- | --- | --- |',
            `| 表总行数 | ${count(rel.fromRows)} | ${count(rel.toRows)} |`,
            `| 基数 | ${count(rel.fromDistinct)} | ${count(rel.toDistinct)} |`,
            `| 区分度 | ${fixed(rel.fromUniqueness)} | ${fixed(rel.toUniqueness)} |`,
            `| 包含率 \\|A∩B\\|/\\|A\\| | ${coverCell(rel.containment, rel.fromDistinct)} | ${coverCell(rel.reverseContainment, rel.toDistinct)} |`,
            `| Jaccard \\|A∩B\\|/\\|A∪B\\| | ${jaccard} | — |`,
          )
          return lines.join('\n')
        }
        if (file.slice === 'fk') return '声明的外键'
        return file.item.content || ''
      }
      const materialArticle = (file) => file ? h('article', { className: 'lwiki-article' },
        h('header', { className: 'lwiki-article-head' },
          h('div', { className: 'lwiki-article-main' },
            h('h2', { className: 'lwiki-article-title' }, file.title),
            h('div', { className: 'lwiki-pills' },
              h('span', { className: 'lwiki-pill' }, file.folder),
              h('span', { className: 'lwiki-pill' }, labelOf(t, materialStatusOf(file.item))),
            ),
          ),
          (file.item.updatedAt || file.item.createdAt) ? h('time', { className: 'lwiki-article-time', dateTime: file.item.updatedAt || file.item.createdAt }, formatWhen(file.item.updatedAt || file.item.createdAt)) : null,
        ),
        (file.slice === 'table' || file.slice === 'all') ? failurePanel(file.item) : null,
        h('div', { className: 'lwiki-md' }, renderMarkdown(withoutTitle(fileMarkdown(file), file.title), openWikiLink)),
      ) : h('p', { className: 'lwiki-empty' }, t('readerEmptyMaterial'))
      const removeMaterialButton = focusedFile && (focusedFile.slice === 'table' || focusedFile.slice === 'all') ? h('button', {
        type: 'button', className: 'lwiki-btn', disabled: busy !== '' || taskLive,
        onClick: () => setConfirm({ kind: 'material', id: focusedFile.item.id, name: focusedFile.title }),
      }, t('removeMaterial')) : null
      const promoteButton = page && (page.draft || page.status === 'draft_only' || page.status === 'published_with_draft')
        ? h('button', {
          type: 'button', className: 'lwiki-btn', disabled: busy !== '',
          onClick: () => {
            setBusy('promote')
            call(ctx, `/wiki ${JSON.stringify({ op: 'promote', slug: page.slug, ...scopeOf(baseId) })}`).then(() => openPage(page.slug)).then(() => load(baseId)).catch(fail).finally(() => setBusy(''))
          },
        }, t('promote'))
        : null
      const holdsNode = (node, active, contains) => node.id === active || Boolean(node.rows && contains(node.rows)) || Boolean(node.children?.some((child) => holdsNode(child, active, contains)))
      const browserOf = (nodes, active, setActive, nodePrefix, leafOf, article, contains) => {
        const rowsOf = (list) => {
          for (const node of list) {
            if (node.children?.length) {
              const found = rowsOf(node.children)
              if (found) return found
            } else if (node.id === active) return node.rows ?? []
          }
          return null
        }
        const renderDir = (list) => list.map((node) => {
          const nodeKey = `${nodePrefix}:${node.id}`
          const stored = openNodes[nodeKey]
          if (node.children?.length) {
            const open = stored === false ? false : stored === true || holdsNode(node, active, contains)
            return h('div', { key: node.id },
              dirRow(nodeKey, false, node.label, node.count, () => setOpenNodes((current) => ({ ...current, [nodeKey]: !open })), open),
              open ? h('div', { className: 'lwiki-dir-nest' }, renderDir(node.children)) : null,
            )
          }
          if (browse === 'columns') return dirRow(node.id, node.id === active, node.label, node.count, () => setActive(node.id))
          const open = stored === false ? false : stored === true || contains(node.rows ?? []) || (nodePrefix === 'wiki' && needle !== '')
          return h('div', { key: node.id },
            dirRow(nodeKey, false, node.label, node.count, () => setOpenNodes((current) => ({ ...current, [nodeKey]: !open })), open),
            open ? h('ul', { className: 'lwiki-docs lwiki-docs-tree' }, (node.rows ?? []).map((row) => leafOf(row, true))) : null,
          )
        })
        return h('div', { className: browse === 'reader' ? 'lwiki-browser lwiki-browser-reader' : 'lwiki-browser' },
          h('div', { className: 'lwiki-dir' }, renderDir(nodes)),
          h('div', { className: 'lwiki-pane' }, browse === 'columns'
            ? h('div', { className: 'lwiki-doc-table' },
              h('div', { className: 'lwiki-doc-head' },
                h('span', null, t('colName')),
                h('span', null, t('colTag')),
                h('span', null, t('colStatus')),
              ),
              h('ul', { className: 'lwiki-docs' }, (rowsOf(nodes) ?? []).map((row) => leafOf(row, false))),
            )
            : article),
        )
      }
      return h('div', { className: 'lwiki' },
        h('header', { className: 'lwiki-top' },
          h('nav', { className: 'lwiki-nav', 'aria-label': t('nav') },
            h('button', { type: 'button', className: 'lwiki-back', onClick: leaveBase }, t('nav')),
            h('span', { className: 'lwiki-nav-sep', 'aria-hidden': 'true' }, '/'),
            h('span', { className: 'lwiki-nav-current' }, selected?.name || ''),
          ),
          h('div', { className: 'lwiki-tabs', role: 'tablist' },
            tabs.map(([id, label, count]) => h('button', {
              key: id, type: 'button', className: 'lwiki-tab', role: 'tab', title: tabHint[id], 'aria-selected': tab === id ? 'true' : 'false', onClick: () => selectTab(id),
            },
              h('span', null, `${label} ${count}`),
              tabMarkNode(id),
            )),
            h('button', { type: 'button', className: 'lwiki-icon-btn', 'aria-label': t('settings'), onClick: () => setSettingsId(baseId) }, h(GearIcon)),
          ),
        ),
        h('div', { className: 'lwiki-main' },
          error ? h('p', { className: 'lwiki-error', role: 'alert' }, error) : null,
          notice ? h('p', { className: 'lwiki-intro' }, notice) : null,
          tab === 'materials' ? h('div', { className: 'lwiki-toolbar' },
            h('div', { className: 'lwiki-filters' }, [
              ['all', t('filterAll'), materials.length],
              ['captured', t('captured'), materials.filter((item) => item.status === 'captured' || materialStatusOf(item) === 'compiling').length],
              ['decided', t('decided'), materials.filter((item) => item.status === 'decided').length],
              ['failed', t('failed'), materials.filter((item) => item.status === 'failed').length],
            ].map(([id, label, count]) => h('button', {
              key: id, type: 'button', className: 'lwiki-chip', 'aria-pressed': materialFilter === id ? 'true' : 'false',
              onClick: () => setMaterialFilter(id),
            }, `${label} ${count}`))),
            compileProgress,
            h('div', { className: 'lwiki-actions' },
              modeToggle,
              h('button', {
                type: 'button', className: 'lwiki-btn lwiki-btn-primary', disabled: busy !== '' || taskLive || pendingCompile === 0,
                onClick: () => {
                  setNotice('')
                  setError('')
                  beginCompileMarks()
                  call(ctx, `/wiki ${JSON.stringify({ op: 'compile', ...scopeOf(baseId) })}`).then((result) => {
                    setJob(result.task)
                    return load(baseId)
                  }).catch((err) => {
                    setTabMarks((marks) => {
                      const copy = { ...marks }
                      delete copy.materials
                      return copy
                    })
                    fail(err)
                  })
                },
              }, t('compile')),
            ),
          ) : null,
          tab === 'wiki' ? h('div', { className: 'lwiki-toolbar' },
            h('input', { className: 'lwiki-input', value: query, placeholder: t('search'), 'aria-label': t('search'), onChange: (event) => setQuery(event.target.value) }),
            modeToggle,
          ) : null,
          h('div', { className: 'lwiki-list-scroll' },
          tab === 'sources' ? h('div', { className: 'lwiki-grid' }, bound.map((row) => {
              const menuKey = `ds:${row.id}`
              const collectState = collectStateOf(row.id)
              const collecting = collectState?.state === 'running' || collectState?.state === 'paused'
              return sourceCard(row, {
                collectLabel: collectLabelOf(collectState),
                collectTone: collectToneOf(collectState),
                detail: collecting ? undefined : cardScopeDetail(row),
                progress: collecting ? collectState.job : null,
                onOpen: () => { setMenuId(null); openEdit(row) },
                menu: h(React.Fragment, null,
                  h('button', {
                    type: 'button', className: 'lwiki-icon-btn lwiki-more', 'data-lwiki-menu': 'true', 'aria-label': t('more'), 'aria-expanded': menuId === menuKey ? 'true' : 'false',
                    onClick: (event) => { event.stopPropagation(); setMenuId(menuId === menuKey ? null : menuKey) },
                  }, '…'),
                  menuId === menuKey ? h('div', { className: 'lwiki-menu', 'data-lwiki-menu': 'true' },
                    h('button', { type: 'button', className: 'lwiki-menu-item', disabled: taskLive, onClick: () => collectSaved(row) }, t('collect')),
                    h('button', { type: 'button', className: 'lwiki-menu-item', onClick: () => { setMenuId(null); openEdit(row, 'scope') } }, t('editScope')),
                  ) : null,
                ),
              })
            }),
            h('button', { type: 'button', className: 'lwiki-source-add', onClick: openAdd }, h(PlusIcon), h('span', null, t('addSourceCard'))),
          ) : null,
          tab === 'materials' ? (
            shownMaterials.length === 0 ? h('p', { className: 'lwiki-empty' }, t('emptyMaterials')) : browserOf(materialNodes, activeMaterial, setMaterialGroup, 'mat', materialLeafRow, h('div', null, materialArticle(focusedFile), removeMaterialButton ? h('div', { className: 'lwiki-actions' }, removeMaterialButton) : null), (rows) => rows.some((file) => file.id === materialFocus))
          ) : null,
          tab === 'wiki' ? (
            visiblePages.length === 0 ? h('p', { className: 'lwiki-empty' }, t('emptyPages')) : browserOf(wikiNodes, activeWiki, setWikiGroup, 'wiki', wikiLeaf, h('div', null, pageArticle, promoteButton ? h('div', { className: 'lwiki-actions' }, promoteButton) : null), (rows) => Boolean(page && rows.some((row) => row.slug === page.slug)))
          ) : null,
          tab === 'proposals' ? (
            proposals.length === 0 ? h('p', { className: 'lwiki-empty' }, t('emptyProposals')) : h('ul', { className: 'lwiki-cards' }, proposals.map((item) => h('li', { key: item.id },
              h('button', {
                type: 'button', className: 'lwiki-card', 'aria-current': view?.id === item.id ? 'page' : undefined,
                onClick: () => setView({
                  id: item.id,
                  kind: item.kind,
                  title: item.kind === 'review' ? t('reviewAsk') : item.slug,
                  slug: item.slug,
                  guide: item.kind === 'review' && !item.brief,
                  body: item.brief || item.reason || (item.reasons ?? []).join('\n'),
                }),
              },
                h('span', { className: 'lwiki-card-text' },
                  h('span', { className: 'lwiki-card-title' }, item.kind === 'review' ? t('reviewAsk') : item.slug),
                  h('span', { className: 'lwiki-card-meta' }, item.kind === 'review' ? item.slug : labelOf(t, item.kind)),
                  item.kind === 'review' ? null : (item.reason ? h('span', { className: 'lwiki-card-meta' }, item.reason) : null),
                ),
              ),
            )))
          ) : null,
          ),
        ),
        tab === 'materials' && browse === 'columns' && focusedFile ? drawer('lwiki-material-title', focusedFile.title,
          materialArticle(focusedFile),
          removeMaterialButton,
          () => setMaterialFocus(null),
          true,
        ) : null,
        tab === 'wiki' && browse === 'columns' && page ? drawer('lwiki-page-title', page.title || page.slug,
          pageArticle,
          promoteButton,
          () => setPage(null),
          true,
        ) : null,
        baseDialog,
        sourceDialog,
        confirmDialog,
        viewDialog,
      )
    }
  },
})
