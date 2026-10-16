window.__ModuleLoader__.load({
  id: '@local/wiki',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useEffect, useState } = React
    const zh = {
      nav: '知识库',
      intro: '每个知识库单独选择数据源。采集和编译只使用这个库绑定的来源',
      emptyBases: '还没有知识库',
      createBase: '新建知识库',
      baseName: '名称',
      baseDescription: '说明',
      back: '全部知识库',
      bind: '绑定数据源',
      unbind: '解除绑定',
      unbound: '已解除绑定',
      boundEmpty: '还没有绑定数据源',
      availableEmpty: '没有可绑定的数据源。可以在这里新建数据库，或先到设置里添加',
      picker: '选择要绑定的数据源',
      counts: '{sources} 个数据源 · {pages} 个页面',
      removeBase: '删除知识库',
      confirmRemoveBase: '确认删除',
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
      compile: '编译原料',
      refresh: '刷新',
      cited: '出处',
      links: '{n} 条链接',
      needSession: '先打开一个会话，再使用知识库',
      published: '已发布',
      draft_only: '草稿',
      published_with_draft: '有未发布草稿',
      archived: '已归档',
      captured: '待编译',
      decided: '已编译',
      failed: '失败',
      review: '待审核',
      delete: '删除',
      entity: '实体',
      concept: '概念',
      summary: '概览',
      synthesis: '综合',
      comparison: '对照',
      addSource: '添加数据源',
      edit: '编辑',
      save: '保存',
      cancel: '取消',
      remove: '删除',
      confirmRemove: '确认删除',
      collect: '采集',
      kindDb: '数据库',
      kindCsv: 'CSV',
      kindCode: '源码',
      soon: '即将支持',
      name: '名称',
      type: '类型',
      host: '主机',
      port: '端口',
      database: '库名',
      username: '用户名',
      password: '密码',
      passwordKeep: '密码（留空不修改）',
      collected: '新入库 {captured} 条，已有 {reused} 条',
      saved: '已保存',
      removed: '已删除',
      compiled: '编译完成',
      readerEmpty: '从左侧选择一个页面',
      chooseScope: '选择范围',
      scopeTitle: '选择范围',
      scopeHint: '勾选要采集的库和表，未选择时采集连接默认库的全部表',
      scopeDefault: '默认库全部表',
      scopeCount: '已选 {n} 张表',
      scopeSaved: '范围已保存',
      scopeLoading: '正在读取库和表',
      scopeEmpty: '没有可读的表',
      otherDatabases: '其他库',
      loadTables: '加载表',
      useDefault: '恢复默认库',
    }
    const en = {
      nav: 'Knowledge',
      intro: 'Each knowledge base chooses its own data sources. Collect and compile use only the sources bound to that base',
      emptyBases: 'No knowledge bases yet',
      createBase: 'New knowledge base',
      baseName: 'Name',
      baseDescription: 'Description',
      back: 'All knowledge bases',
      bind: 'Bind source',
      unbind: 'Unbind',
      unbound: 'Unbound',
      boundEmpty: 'No sources bound yet',
      availableEmpty: 'No sources available to bind. Create a database here, or add one in Settings',
      picker: 'Choose a source to bind',
      counts: '{sources} sources · {pages} pages',
      removeBase: 'Delete knowledge base',
      confirmRemoveBase: 'Confirm delete',
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
      refresh: 'Refresh',
      cited: 'Sources',
      links: '{n} links',
      needSession: 'Open a session before using Knowledge',
      published: 'Published',
      draft_only: 'Draft',
      published_with_draft: 'Unpublished draft',
      archived: 'Archived',
      captured: 'Captured',
      decided: 'Decided',
      failed: 'Failed',
      review: 'Review',
      delete: 'Delete',
      entity: 'Entity',
      concept: 'Concept',
      summary: 'Summary',
      synthesis: 'Synthesis',
      comparison: 'Comparison',
      addSource: 'Add source',
      edit: 'Edit',
      save: 'Save',
      cancel: 'Cancel',
      remove: 'Delete',
      confirmRemove: 'Confirm delete',
      collect: 'Collect',
      kindDb: 'Database',
      kindCsv: 'CSV',
      kindCode: 'Source code',
      soon: 'Coming later',
      name: 'Name',
      type: 'Type',
      host: 'Host',
      port: 'Port',
      database: 'Database',
      username: 'Username',
      password: 'Password',
      passwordKeep: 'Password (leave blank to keep)',
      collected: 'Captured {captured}, already stored {reused}',
      saved: 'Saved',
      removed: 'Deleted',
      compiled: 'Compile finished',
      readerEmpty: 'Choose a page from the list',
      chooseScope: 'Choose scope',
      scopeTitle: 'Choose scope',
      scopeHint: 'Select the databases and tables to collect. With no selection, collect uses every table in the connection default database',
      scopeDefault: 'All tables in the default database',
      scopeCount: '{n} tables selected',
      scopeSaved: 'Scope saved',
      scopeLoading: 'Reading databases and tables',
      scopeEmpty: 'No tables to read',
      otherDatabases: 'Other databases',
      loadTables: 'Load tables',
      useDefault: 'Use default database',
    }
    const panelId = 'local-wiki'
    const blank = () => ({ name: '', type: 'postgresql', host: '127.0.0.1', port: '5432', database: '', username: '', password: '' })
    const CSS = `
.lwiki { display: flex; flex-direction: column; height: 100%; min-height: 0; color: var(--dsw-alias-label-primary); background: var(--dsw-alias-bg-base); font-size: 14px; line-height: 22px; }
.lwiki-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 28px clamp(24px, 4vw, 48px) 0; }
[data-platform='darwin'] .lwiki-head { padding-top: calc(28px + var(--dsh-frame-top-clearance, 0px)); }
.lwiki-head h1 { flex: 1; min-width: 0; margin: 0; font-size: 20px; line-height: 28px; font-weight: 500; }
.lwiki-actions, .lwiki-card-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.lwiki-tabs { display: flex; flex-wrap: wrap; gap: 8px; padding: 16px clamp(24px, 4vw, 48px) 0; }
.lwiki-tab { display: inline-flex; align-items: center; height: 28px; padding: 0 10px; border: 0; border-radius: 14px; background: transparent; color: var(--dsw-alias-label-tertiary); font: inherit; font-size: 14px; line-height: 22px; cursor: pointer; }
.lwiki-tab:hover, .lwiki-tab[aria-selected='true'] { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.lwiki-tab:focus-visible, .lwiki-btn:focus-visible, .lwiki-row:focus-visible, .lwiki-kind:focus-visible { outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); outline-offset: 2px; }
.lwiki-scroll { flex: 1 1 auto; min-height: 0; overflow: auto; padding: 16px clamp(24px, 4vw, 48px) 48px; }
.lwiki-intro, .lwiki-empty, .lwiki-meta { margin: 0 0 12px; font-size: 13px; line-height: 20px; color: var(--dsw-alias-label-tertiary); }
.lwiki-error { margin: 0 0 12px; font-size: 12px; line-height: 18px; color: var(--dsw-alias-state-error-primary); }
.lwiki-cards { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.lwiki-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
.lwiki-kb { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; min-height: 112px; padding: 14px 16px; border: 0.5px solid var(--dsw-alias-settings-card-stroke); border-radius: var(--dsw-radius-xl); background: var(--dsw-alias-settings-card-fill); color: inherit; font: inherit; text-align: left; cursor: pointer; }
.lwiki-kb:hover { background: var(--dsw-alias-interactive-bg-hover); }
.lwiki-kb:focus-visible { outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); outline-offset: 2px; }
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
.lwiki-form { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 12px; margin-top: 16px; }
.lwiki-field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.lwiki-label { font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary); }
.lwiki-input { box-sizing: border-box; width: 100%; height: 32px; padding: 0 10px; border: 0.5px solid var(--dsw-alias-border-l4); border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font: inherit; font-size: 14px; line-height: 22px; }
.lwiki-input:focus { outline: none; border-color: var(--dsw-alias-state-business-primary); }
.lwiki-select { appearance: none; cursor: pointer; padding-right: 32px; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none'%3E%3Cpath d='M3 4.5L6 7.5L9 4.5' stroke='%2381858C' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; background-size: 12px 12px; }
.lwiki-btn { box-sizing: border-box; display: inline-flex; align-items: center; height: 28px; padding: 0 10px; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-sm); background: transparent; color: var(--dsw-alias-label-primary); font: inherit; font-size: 12px; line-height: 18px; cursor: pointer; }
.lwiki-btn:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }
.lwiki-btn:disabled { cursor: not-allowed; opacity: 0.4; }
.lwiki-btn-primary { height: 32px; padding: 0 12px; border: 0; border-radius: 16px; background: var(--dsw-alias-button-primary-fill); color: var(--dsw-alias-label-primary-foreground); font-size: 13px; line-height: 20px; }
.lwiki-btn-primary:hover:not(:disabled) { background: var(--dsw-alias-button-primary-hover); }
.lwiki-split { display: grid; grid-template-columns: minmax(220px, 280px) minmax(0, 1fr); gap: 16px; min-height: 360px; }
.lwiki-list { list-style: none; margin: 0; padding: 0; }
.lwiki-group { margin: 12px 0 4px; font-size: 12px; line-height: 18px; font-weight: 500; color: var(--dsw-alias-label-tertiary); }
.lwiki-row { display: flex; width: 100%; align-items: center; gap: 8px; min-width: 0; padding: 5px 8px; border: 0; border-radius: var(--dsw-radius-sm); background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; }
.lwiki-row:hover, .lwiki-row[aria-current='page'] { background: var(--dsw-alias-interactive-bg-hover); }
.lwiki-row-label { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lwiki-status { flex: 0 0 auto; color: var(--dsw-alias-label-tertiary); font-size: 12px; }
.lwiki-reader { min-width: 0; padding: 12px 14px; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-layer-1); }
.lwiki-reader h2 { margin: 0 0 8px; font-size: 16px; line-height: 24px; font-weight: 500; }
.lwiki-body { margin: 0; white-space: pre-wrap; font: inherit; }
.lwiki-mask { position: fixed; inset: 0; z-index: 80; display: flex; align-items: center; justify-content: center; padding: 24px; background: var(--dsw-alias-bg-mask-1); }
.lwiki-dialog { display: flex; flex-direction: column; width: min(560px, 100%); max-height: min(640px, 100%); border: 0.5px solid var(--dsw-alias-settings-card-stroke); border-radius: var(--dsw-radius-xl); background: var(--dsw-alias-bg-layer-1); box-shadow: var(--dsw-shadow-lv3); }
.lwiki-dialog-head, .lwiki-dialog-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px; }
.lwiki-dialog-head h2 { margin: 0; font-size: 16px; line-height: 24px; font-weight: 500; }
.lwiki-dialog-body { flex: 1 1 auto; min-height: 120px; overflow: auto; padding: 0 16px; }
.lwiki-check { display: flex; align-items: center; gap: 8px; min-width: 0; padding: 4px 0; font-size: 13px; line-height: 20px; cursor: pointer; }
.lwiki-check input { margin: 0; }
.lwiki-tree { margin: 0 0 8px 22px; }
@media (max-width: 720px) { .lwiki-split, .lwiki-form { grid-template-columns: 1fr; } }
`
    function ensureStyles() {
      if (typeof document === 'undefined' || document.getElementById('local-wiki-style')) return
      const el = document.createElement('style')
      el.id = 'local-wiki-style'
      el.textContent = CSS
      document.head.appendChild(el)
    }
    async function call(context, line) {
      const sessionId = sessionIdOf(context)
      if (!sessionId) throw new Error('open a session first')
      const result = await context.remote.commands.execute(sessionId, line, [])
      if (!result?.ok) throw new Error(result?.error?.message || 'command failed')
      const settled = result.value?.result ?? result.value
      if (!settled) throw new Error('command unavailable')
      if (settled.kind === 'error') throw new Error(settled.text || 'command failed')
      return settled.text ? JSON.parse(settled.text) : {}
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
      return h('svg', { width: size, height: size, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true' },
        h('path', { d: 'M3 2.75h6.2c1.6 0 2.8 1.05 2.8 2.45V13.25H5.2C4 13.25 3 12.3 3 11.1V2.75z', stroke: 'currentColor', strokeWidth: 1.2, strokeLinejoin: 'round' }),
        h('path', { d: 'M3 11.1h9', stroke: 'currentColor', strokeWidth: 1.2 }),
      )
    }
    return {
      inject: ['slots', 'locale', 'remote', 'remote.commands', 'sessions'],
      apply(ctx) {
        ensureStyles()
        const ns = 'local.wiki'
        ctx.effect(() => ctx.locale.register(ns, { zh, en }), 'wiki.locale')
        const t = () => ctx.locale.bind(ns)
        ctx.effect(() => ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist',
          id: panelId,
          order: 20,
          label: () => t()('nav'),
          locale: ns,
        }, KnowledgeIcon)), 'wiki.nav')
        ctx.effect(() => ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main',
          key: panelId,
          locale: ns,
        }, function KnowledgePage() {
          return h(Panel, { ctx, t: t() })
        })), 'wiki.page')
      },
    }

    function Panel({ ctx, t }) {
      const [tab, setTab] = useState('wiki')
      const [bases, setBases] = useState([])
      const [baseId, setBaseId] = useState(null)
      const [sources, setSources] = useState([])
      const [materials, setMaterials] = useState([])
      const [pages, setPages] = useState([])
      const [proposals, setProposals] = useState([])
      const [page, setPage] = useState(null)
      const [graph, setGraph] = useState(null)
      const [query, setQuery] = useState('')
      const [error, setError] = useState('')
      const [notice, setNotice] = useState('')
      const [busy, setBusy] = useState('')
      const [kind, setKind] = useState('db')
      const [editingId, setEditingId] = useState(null)
      const [confirmId, setConfirmId] = useState(null)
      const [showForm, setShowForm] = useState(false)
      const [showCreate, setShowCreate] = useState(false)
      const [showPicker, setShowPicker] = useState(false)
      const [confirmBase, setConfirmBase] = useState(false)
      const [baseDraft, setBaseDraft] = useState({ name: '', description: '' })
      const [form, setForm] = useState(blank)
      const [scopeSource, setScopeSource] = useState(null)
      const [catalog, setCatalog] = useState({ groups: [], siblings: [], database: '' })
      const [picked, setPicked] = useState([])
      const [scopeError, setScopeError] = useState('')
      const [scopeBusy, setScopeBusy] = useState(false)
      const fail = (err) => setError(messageOf(err, t))
      const scopeOf = (id) => ({ knowledgeBaseId: id })
      const load = async (id = baseId) => {
        setError('')
        const listedBases = await call(ctx, '/wiki {"op":"bases"}')
        const ds = await call(ctx, '/datasource {"op":"list"}')
        setBases(listedBases.bases ?? [])
        setSources(ds.datasources ?? [])
        if (!id) {
          setPages([])
          setMaterials([])
          setProposals([])
          return
        }
        const scope = scopeOf(id)
        const listed = await call(ctx, `/wiki ${JSON.stringify({ op: 'pages', ...scope })}`)
        const mats = await call(ctx, `/wiki ${JSON.stringify({ op: 'materials', ...scope })}`)
        const propsals = await call(ctx, `/wiki ${JSON.stringify({ op: 'proposals', ...scope })}`)
        setPages(listed.pages ?? [])
        setMaterials(mats.materials ?? [])
        setProposals((propsals.proposals ?? []).filter((item) => item.status === 'open'))
      }
      useEffect(() => { load(baseId).catch(fail) }, [baseId])
      useEffect(() => {
        if (!scopeSource) return undefined
        const onKey = (event) => { if (event.key === 'Escape') setScopeSource(null) }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
      }, [scopeSource])
      const openPage = async (slug) => {
        setError('')
        const scope = scopeOf(baseId)
        const found = await call(ctx, `/wiki ${JSON.stringify({ op: 'page', slug })}`)
        const expanded = await call(ctx, `/wiki ${JSON.stringify({ op: 'expand', center: slug, depth: 1, ...scope })}`)
        setPage(found.page)
        setGraph(expanded)
      }
      const openScope = async (row, saved) => {
        setScopeSource(row)
        setPicked(saved ?? [])
        setScopeError('')
        setCatalog({ groups: [], siblings: [], database: '' })
        setScopeBusy(true)
        try {
          const data = await call(ctx, `/datasource ${JSON.stringify({ op: 'catalog', id: row.id })}`)
          setCatalog({ groups: data.groups ?? [], siblings: data.siblings ?? [], database: data.database ?? '' })
        } catch (err) {
          setScopeError(messageOf(err, t))
        } finally {
          setScopeBusy(false)
        }
      }
      const loadSibling = async (name) => {
        if (!scopeSource) return
        setScopeBusy(true)
        setScopeError('')
        try {
          const data = await call(ctx, `/datasource ${JSON.stringify({ op: 'catalog', id: scopeSource.id, database: name })}`)
          setCatalog((current) => ({
            database: current.database,
            groups: [...current.groups, ...(data.groups ?? [])],
            siblings: current.siblings.filter((item) => item !== name),
          }))
        } catch (err) {
          setScopeError(messageOf(err, t))
        } finally {
          setScopeBusy(false)
        }
      }
      const saveScope = async (tables) => {
        if (!scopeSource) return
        setScopeBusy(true)
        setScopeError('')
        try {
          await call(ctx, `/wiki ${JSON.stringify({ op: 'setScope', id: baseId, datasourceId: scopeSource.id, tables })}`)
          setScopeSource(null)
          setNotice(tables.length > 0 ? t('scopeSaved') : t('scopeDefault'))
          await load(baseId)
        } catch (err) {
          setScopeError(messageOf(err, t))
        } finally {
          setScopeBusy(false)
        }
      }
      const payload = () => ({
        name: form.name.trim(),
        type: form.type,
        host: form.host.trim(),
        port: Number(form.port),
        database: form.database.trim(),
        username: form.username,
        password: form.password,
      })
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
      const grouped = new Map()
      for (const item of visiblePages) {
        const key = item.pageType || 'page'
        grouped.set(key, [...(grouped.get(key) ?? []), item])
      }
      const body = page?.published?.body || page?.draft?.body || ''
      const cited = page?.published?.sources || page?.draft?.sources || []
      const linkCount = (graph?.edges ?? []).length
      const selected = bases.find((item) => item.id === baseId) ?? null
      const boundIds = selected?.datasourceIds ?? []
      const bound = sources.filter((row) => boundIds.includes(row.id))
      const available = sources.filter((row) => !boundIds.includes(row.id))
      const tabs = [
        ['sources', t('sources'), bound.length],
        ['materials', t('materials'), materials.length],
        ['wiki', t('wiki'), pages.length],
        ['proposals', t('proposals'), proposals.length],
      ]
      const counts = (base) => t('counts').replace('{sources}', String(base.datasourceIds?.length ?? 0)).replace('{pages}', String(base.pageCount ?? 0))
      const scopeText = (id) => {
        const tables = selected?.scopes?.[String(id)]?.tables
        if (!tables?.length) return t('scopeDefault')
        return t('scopeCount').replace('{n}', String(tables.length))
      }
      if (!baseId) {
        return h('div', { className: 'lwiki' },
          h('header', { className: 'lwiki-head' },
            h('h1', null, t('nav')),
            h('button', {
              type: 'button', className: 'lwiki-btn lwiki-btn-primary',
              onClick: () => { setShowCreate(true); setBaseDraft({ name: '', description: '' }); setError('') },
            }, t('createBase')),
          ),
          h('div', { className: 'lwiki-scroll' },
            h('p', { className: 'lwiki-intro' }, t('intro')),
            error ? h('p', { className: 'lwiki-error', role: 'alert' }, error) : null,
            bases.length === 0 ? h('p', { className: 'lwiki-empty' }, t('emptyBases')) : h('div', { className: 'lwiki-grid' }, bases.map((base) => h('button', {
              key: base.id, type: 'button', className: 'lwiki-kb',
              onClick: () => { setTab('wiki'); setPage(null); setGraph(null); setConfirmBase(false); setBaseId(base.id); setNotice('') },
            },
              h('span', { className: 'lwiki-kb-title' }, base.name),
              base.description ? h('span', { className: 'lwiki-card-meta' }, base.description) : null,
              h('span', { className: 'lwiki-card-meta' }, counts(base)),
            ))),
            showCreate ? h('div', { className: 'lwiki-form' },
              h('label', { className: 'lwiki-field' },
                h('span', { className: 'lwiki-label' }, t('baseName')),
                h('input', { className: 'lwiki-input', value: baseDraft.name, onChange: (event) => setBaseDraft({ ...baseDraft, name: event.target.value }) }),
              ),
              h('label', { className: 'lwiki-field' },
                h('span', { className: 'lwiki-label' }, t('baseDescription')),
                h('input', { className: 'lwiki-input', value: baseDraft.description, onChange: (event) => setBaseDraft({ ...baseDraft, description: event.target.value }) }),
              ),
              h('div', { className: 'lwiki-actions' },
                h('button', {
                  type: 'button', className: 'lwiki-btn lwiki-btn-primary', disabled: busy !== '' || baseDraft.name.trim() === '',
                  onClick: async () => {
                    setBusy('create')
                    setError('')
                    try {
                      const created = await call(ctx, `/wiki ${JSON.stringify({ op: 'baseCreate', name: baseDraft.name.trim(), description: baseDraft.description.trim() })}`)
                      setShowCreate(false)
                      setBaseDraft({ name: '', description: '' })
                      setTab('sources')
                      setBaseId(created.base.id)
                    } catch (err) {
                      fail(err)
                    } finally {
                      setBusy('')
                    }
                  },
                }, t('createBase')),
                h('button', { type: 'button', className: 'lwiki-btn', onClick: () => setShowCreate(false) }, t('cancel')),
              ),
            ) : null,
          ),
        )
      }
      return h('div', { className: 'lwiki' },
        h('header', { className: 'lwiki-head' },
          h('div', null,
            h('button', {
              type: 'button', className: 'lwiki-back',
              onClick: () => { setBaseId(null); setPage(null); setGraph(null); setShowForm(false); setShowPicker(false); setConfirmBase(false); setScopeSource(null); setNotice('') },
            }, t('back')),
            h('h1', null, selected?.name || t('nav')),
          ),
          h('div', { className: 'lwiki-actions' },
            h('button', {
              type: 'button',
              className: 'lwiki-btn lwiki-btn-primary',
              disabled: busy !== '',
              onClick: () => {
                setBusy('compile')
                setNotice('')
                call(ctx, `/wiki ${JSON.stringify({ op: 'compile', ...scopeOf(baseId) })}`).then(() => { setNotice(t('compiled')); return load(baseId) }).catch(fail).finally(() => setBusy(''))
              },
            }, t('compile')),
            h('button', { type: 'button', className: 'lwiki-btn', disabled: busy !== '', onClick: () => load(baseId).catch(fail) }, t('refresh')),
            h('button', {
              type: 'button', className: 'lwiki-btn', disabled: busy !== '',
              onClick: () => {
                if (!confirmBase) { setConfirmBase(true); return }
                setBusy('remove-base')
                call(ctx, `/wiki ${JSON.stringify({ op: 'baseRemove', id: baseId })}`).then(() => { setBaseId(null); setConfirmBase(false) }).catch(fail).finally(() => setBusy(''))
              },
            }, confirmBase ? t('confirmRemoveBase') : t('removeBase')),
          ),
        ),
        h('div', { className: 'lwiki-tabs', role: 'tablist' }, tabs.map(([id, label, count]) => h('button', {
          key: id,
          type: 'button',
          className: 'lwiki-tab',
          role: 'tab',
          'aria-selected': tab === id ? 'true' : 'false',
          onClick: () => setTab(id),
        }, `${label} ${count}`))),
        h('div', { className: 'lwiki-scroll' },
          h('p', { className: 'lwiki-intro' }, t('intro')),
          error ? h('p', { className: 'lwiki-error', role: 'alert' }, error) : null,
          notice ? h('p', { className: 'lwiki-intro' }, notice) : null,
          tab === 'sources' ? h('div', null,
            h('div', { className: 'lwiki-actions' },
              h('button', {
                type: 'button', className: 'lwiki-btn lwiki-btn-primary',
                onClick: () => { setShowPicker((open) => !open); setShowForm(false); setEditingId(null) },
              }, t('bind')),
              h('button', {
                type: 'button', className: 'lwiki-btn',
                onClick: () => { setShowForm(true); setShowPicker(false); setEditingId(null); setKind('db'); setForm(blank()) },
              }, t('addSource')),
            ),
            bound.length === 0 ? h('p', { className: 'lwiki-empty' }, t('boundEmpty')) : h('ul', { className: 'lwiki-cards' }, bound.map((row) => h('li', { className: 'lwiki-card', key: row.id },
              h('div', { className: 'lwiki-card-text' },
                h('div', { className: 'lwiki-card-title' }, row.name),
                h('div', { className: 'lwiki-card-meta' }, `${row.type} · ${row.host}:${row.port}/${row.database}`),
                h('div', { className: 'lwiki-card-meta' }, scopeText(row.id)),
              ),
              h('div', { className: 'lwiki-card-actions' },
                h('button', {
                  type: 'button', className: 'lwiki-btn', disabled: busy !== '' || scopeBusy,
                  onClick: () => openScope(row, selected?.scopes?.[String(row.id)]?.tables ?? []).catch(fail),
                }, t('chooseScope')),
                h('button', {
                  type: 'button', className: 'lwiki-btn', disabled: busy !== '',
                  onClick: () => {
                    setBusy(`collect-${row.id}`)
                    setNotice('')
                    call(ctx, `/wiki ${JSON.stringify({ op: 'collect', datasourceId: row.id, ...scopeOf(baseId) })}`).then((result) => {
                      setNotice(t('collected').replace('{captured}', String(result.captured ?? 0)).replace('{reused}', String(result.reused ?? 0)))
                      return load(baseId)
                    }).catch(fail).finally(() => setBusy(''))
                  },
                }, t('collect')),
                h('button', {
                  type: 'button', className: 'lwiki-btn', disabled: busy !== '',
                  onClick: () => {
                    setShowForm(true)
                    setKind('db')
                    setEditingId(row.id)
                    setConfirmId(null)
                    setForm({ name: row.name ?? '', type: row.type, host: row.host ?? '', port: String(row.port ?? ''), database: row.database ?? '', username: row.username ?? '', password: '' })
                  },
                }, t('edit')),
                h('button', {
                  type: 'button', className: 'lwiki-btn', disabled: busy !== '',
                  onClick: () => {
                    if (confirmId !== row.id) { setConfirmId(row.id); return }
                    setBusy(`remove-${row.id}`)
                    call(ctx, `/wiki ${JSON.stringify({ op: 'unbind', id: baseId, datasourceId: row.id })}`).then(() => {
                      if (editingId === row.id) { setEditingId(null); setShowForm(false); setForm(blank()) }
                      setConfirmId(null)
                      setNotice(t('unbound'))
                      return load(baseId)
                    }).catch(fail).finally(() => setBusy(''))
                  },
                }, confirmId === row.id ? t('confirmRemove') : t('unbind')),
              ),
            ))),
            showPicker ? h('div', null,
              h('div', { className: 'lwiki-group' }, t('picker')),
              available.length === 0 ? h('p', { className: 'lwiki-empty' }, t('availableEmpty')) : h('ul', { className: 'lwiki-cards' }, available.map((row) => h('li', { className: 'lwiki-card', key: row.id },
                h('div', { className: 'lwiki-card-text' },
                  h('div', { className: 'lwiki-card-title' }, row.name),
                  h('div', { className: 'lwiki-card-meta' }, `${row.type} · ${row.host}:${row.port}/${row.database}`),
                ),
                h('button', {
                  type: 'button', className: 'lwiki-btn', disabled: busy !== '',
                  onClick: () => {
                    setBusy(`bind-${row.id}`)
                    call(ctx, `/wiki ${JSON.stringify({ op: 'bind', id: baseId, datasourceId: row.id })}`).then(async () => {
                      setShowPicker(false)
                      await load(baseId)
                      await openScope(row, [])
                    }).catch(fail).finally(() => setBusy(''))
                  },
                }, t('bind')),
              ))),
            ) : null,
            showForm ? h('div', null,
              h('div', { className: 'lwiki-kinds' }, [
                ['db', t('kindDb'), false],
                ['csv', t('kindCsv'), true],
                ['code', t('kindCode'), true],
              ].map(([id, label, locked]) => h('button', {
                key: id,
                type: 'button',
                className: 'lwiki-kind',
                'aria-pressed': kind === id ? 'true' : 'false',
                disabled: locked && editingId !== null,
                onClick: () => { if (editingId === null) setKind(id) },
              }, locked ? `${label} · ${t('soon')}` : label))),
              kind === 'db' ? h('div', { className: 'lwiki-form' },
                field('name', t('name')),
                h('label', { className: 'lwiki-field' },
                  h('span', { className: 'lwiki-label' }, t('type')),
                  h('select', {
                    className: 'lwiki-input lwiki-select',
                    value: form.type,
                    onChange: (event) => setForm({ ...form, type: event.target.value, port: event.target.value === 'mysql' ? '3306' : '5432' }),
                  }, h('option', { value: 'postgresql' }, 'PostgreSQL'), h('option', { value: 'mysql' }, 'MySQL')),
                ),
                field('host', t('host')),
                field('port', t('port')),
                field('database', t('database')),
                field('username', t('username')),
                field('password', editingId === null ? t('password') : t('passwordKeep'), 'password'),
              ) : h('p', { className: 'lwiki-empty' }, t('soon')),
              h('div', { className: 'lwiki-actions' },
                h('button', {
                  type: 'button',
                  className: 'lwiki-btn lwiki-btn-primary',
                  disabled: busy !== '' || kind !== 'db' || form.name.trim() === '',
                  onClick: async () => {
                    setBusy('save')
                    setError('')
                    try {
                      if (editingId === null) {
                        const added = await call(ctx, `/datasource ${JSON.stringify({ op: 'add', ...payload() })}`)
                        await call(ctx, `/wiki ${JSON.stringify({ op: 'bind', id: baseId, datasourceId: added.id })}`)
                        const opened = { id: added.id, name: form.name.trim(), type: form.type }
                        setShowForm(false)
                        setEditingId(null)
                        setForm(blank())
                        setNotice(t('saved'))
                        await load(baseId)
                        await openScope(opened, [])
                      } else {
                        await call(ctx, `/datasource ${JSON.stringify({ op: 'update', id: editingId, ...payload() })}`)
                        setShowForm(false)
                        setEditingId(null)
                        setForm(blank())
                        setNotice(t('saved'))
                        await load(baseId)
                      }
                    } catch (err) {
                      fail(err)
                    } finally {
                      setBusy('')
                    }
                  },
                }, editingId === null ? t('addSource') : t('save')),
                h('button', {
                  type: 'button', className: 'lwiki-btn', disabled: busy !== '',
                  onClick: () => { setShowForm(false); setEditingId(null); setForm(blank()) },
                }, t('cancel')),
              ),
            ) : null,
          ) : null,
          tab === 'materials' ? (
            materials.length === 0 ? h('p', { className: 'lwiki-empty' }, t('emptyMaterials')) : h('ul', { className: 'lwiki-cards' }, materials.map((item) => h('li', { className: 'lwiki-card', key: item.id },
              h('div', { className: 'lwiki-card-text' },
                h('div', { className: 'lwiki-card-title' }, item.sourceRef),
                h('div', { className: 'lwiki-card-meta' }, labelOf(t, item.status)),
              ),
            )))
          ) : null,
          tab === 'wiki' ? h('div', { className: 'lwiki-split' },
            h('div', null,
              h('input', {
                className: 'lwiki-input',
                value: query,
                placeholder: t('search'),
                'aria-label': t('search'),
                onChange: (event) => setQuery(event.target.value),
              }),
              visiblePages.length === 0 ? h('p', { className: 'lwiki-empty' }, t('emptyPages')) : [...grouped.entries()].map(([type, rows]) => h('section', { key: type },
                h('div', { className: 'lwiki-group' }, labelOf(t, type)),
                h('ul', { className: 'lwiki-list' }, rows.map((row) => h('li', { key: row.slug },
                  h('button', {
                    type: 'button',
                    className: 'lwiki-row',
                    'aria-current': page?.slug === row.slug ? 'page' : undefined,
                    onClick: () => openPage(row.slug).catch(fail),
                  },
                    h('span', { className: 'lwiki-row-label' }, row.title || row.slug),
                    h('span', { className: 'lwiki-status' }, labelOf(t, row.status)),
                  ),
                ))),
              )),
            ),
            page ? h('article', { className: 'lwiki-reader' },
              h('h2', null, page.title || page.slug),
              h('p', { className: 'lwiki-meta' }, labelOf(t, page.status)),
              h('pre', { className: 'lwiki-body' }, body),
              cited.length ? h('p', { className: 'lwiki-meta' }, `${t('cited')} ${cited.join(', ')}`) : null,
              graph ? h('p', { className: 'lwiki-meta' }, t('links').replace('{n}', String(linkCount))) : null,
              page.draft || page.status === 'draft_only' || page.status === 'published_with_draft'
                ? h('button', {
                  type: 'button', className: 'lwiki-btn', disabled: busy !== '',
                  onClick: () => {
                    setBusy('promote')
                    call(ctx, `/wiki ${JSON.stringify({ op: 'promote', slug: page.slug })}`).then(() => openPage(page.slug)).then(() => load(baseId)).catch(fail).finally(() => setBusy(''))
                  },
                }, t('promote'))
                : null,
            ) : h('p', { className: 'lwiki-empty' }, t('readerEmpty')),
          ) : null,
          tab === 'proposals' ? (
            proposals.length === 0 ? h('p', { className: 'lwiki-empty' }, t('emptyProposals')) : h('ul', { className: 'lwiki-cards' }, proposals.map((item) => h('li', { className: 'lwiki-card', key: item.id },
              h('div', { className: 'lwiki-card-text' },
                h('div', { className: 'lwiki-card-title' }, item.slug),
                h('div', { className: 'lwiki-card-meta' }, labelOf(t, item.kind)),
              ),
              h('div', { className: 'lwiki-card-actions' },
                h('button', {
                  type: 'button', className: 'lwiki-btn', disabled: busy !== '',
                  onClick: () => {
                    setBusy(item.id)
                    call(ctx, `/wiki ${JSON.stringify({ op: 'resolve', id: item.id, status: 'accepted' })}`).then(() => load(baseId)).catch(fail).finally(() => setBusy(''))
                  },
                }, t('accept')),
                h('button', {
                  type: 'button', className: 'lwiki-btn', disabled: busy !== '',
                  onClick: () => {
                    setBusy(item.id)
                    call(ctx, `/wiki ${JSON.stringify({ op: 'resolve', id: item.id, status: 'rejected' })}`).then(() => load(baseId)).catch(fail).finally(() => setBusy(''))
                  },
                }, t('reject')),
              ),
            )))
          ) : null,
        ),
        scopeSource ? h('div', {
          className: 'lwiki-mask',
          onClick: () => { if (!scopeBusy) setScopeSource(null) },
        }, h('div', {
          className: 'lwiki-dialog',
          role: 'dialog',
          'aria-modal': 'true',
          'aria-labelledby': 'lwiki-scope-title',
          onClick: (event) => event.stopPropagation(),
        },
          h('div', { className: 'lwiki-dialog-head' },
            h('h2', { id: 'lwiki-scope-title' }, `${t('scopeTitle')} · ${scopeSource.name}`),
          ),
          h('div', { className: 'lwiki-dialog-body' },
            h('p', { className: 'lwiki-intro' }, t('scopeHint')),
            scopeError ? h('p', { className: 'lwiki-error', role: 'alert' }, scopeError) : null,
            scopeBusy && catalog.groups.length === 0 ? h('p', { className: 'lwiki-empty' }, t('scopeLoading')) : null,
            !scopeBusy && catalog.groups.length === 0 && !scopeError ? h('p', { className: 'lwiki-empty' }, t('scopeEmpty')) : null,
            catalog.groups.map((group) => {
              const ids = group.tables.map((table) => table.id)
              const selectedCount = ids.filter((id) => picked.includes(id)).length
              const all = ids.length > 0 && selectedCount === ids.length
              const some = selectedCount > 0 && !all
              return h('div', { key: group.id },
                h('label', { className: 'lwiki-check' },
                  h('input', {
                    type: 'checkbox',
                    checked: all,
                    ref: (el) => { if (el) el.indeterminate = some },
                    onChange: () => setPicked((current) => all
                      ? current.filter((id) => !ids.includes(id))
                      : [...new Set([...current, ...ids])]),
                  }),
                  group.label,
                ),
                h('div', { className: 'lwiki-tree' }, group.tables.map((table) => h('label', { className: 'lwiki-check', key: table.id },
                  h('input', {
                    type: 'checkbox',
                    checked: picked.includes(table.id),
                    onChange: () => setPicked((current) => current.includes(table.id)
                      ? current.filter((id) => id !== table.id)
                      : [...current, table.id]),
                  }),
                  table.label,
                ))),
              )
            }),
            catalog.siblings.length > 0 ? h('div', null,
              h('div', { className: 'lwiki-group' }, t('otherDatabases')),
              catalog.siblings.map((name) => h('div', { className: 'lwiki-actions', key: name },
                h('span', { className: 'lwiki-card-meta' }, name),
                h('button', {
                  type: 'button', className: 'lwiki-btn', disabled: scopeBusy,
                  onClick: () => loadSibling(name),
                }, t('loadTables')),
              )),
            ) : null,
          ),
          h('div', { className: 'lwiki-dialog-foot' },
            h('span', { className: 'lwiki-card-meta' }, t('scopeCount').replace('{n}', String(picked.length))),
            h('div', { className: 'lwiki-actions' },
              h('button', {
                type: 'button', className: 'lwiki-btn', disabled: scopeBusy,
                onClick: () => saveScope([]),
              }, t('useDefault')),
              h('button', {
                type: 'button', className: 'lwiki-btn', disabled: scopeBusy,
                onClick: () => setScopeSource(null),
              }, t('cancel')),
              h('button', {
                type: 'button', className: 'lwiki-btn lwiki-btn-primary',
                disabled: scopeBusy || picked.length === 0,
                onClick: () => saveScope(picked),
              }, t('save')),
            ),
          ),
        )) : null,
      )
    }
  },
})
