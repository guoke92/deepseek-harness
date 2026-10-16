window.__ModuleLoader__.load({
  id: '@local/datasource',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useEffect, useState } = React
    const zh = {
      nav: '数据源',
      intro: '连接 PostgreSQL 或 MySQL。密码只在新增或修改时提交，列表中不显示',
      empty: '还没有数据源',
      name: '名称',
      type: '类型',
      host: '主机',
      port: '端口',
      database: '库名',
      username: '用户名',
      password: '密码',
      passwordKeep: '密码（留空不修改）',
      add: '新增',
      save: '保存',
      cancel: '取消',
      edit: '编辑',
      remove: '删除',
      confirmRemove: '确认删除',
      collect: '采集原料',
      refresh: '刷新',
      saved: '已保存',
      removed: '已删除',
      needSession: '先打开一个会话，再操作数据源',
      collected: '新入库 {captured} 条，已有 {reused} 条',
    }
    const en = {
      nav: 'Data sources',
      intro: 'Connect PostgreSQL or MySQL. The password is sent only when you add or change a source and never appears in the list',
      empty: 'No data sources yet',
      name: 'Name',
      type: 'Type',
      host: 'Host',
      port: 'Port',
      database: 'Database',
      username: 'Username',
      password: 'Password',
      passwordKeep: 'Password (leave blank to keep)',
      add: 'Add',
      save: 'Save',
      cancel: 'Cancel',
      edit: 'Edit',
      remove: 'Delete',
      confirmRemove: 'Confirm delete',
      collect: 'Collect materials',
      refresh: 'Refresh',
      saved: 'Saved',
      removed: 'Deleted',
      needSession: 'Open a session before changing data sources',
      collected: 'Captured {captured}, already stored {reused}',
    }
    const blank = () => ({ name: '', type: 'postgresql', host: '127.0.0.1', port: '5432', database: '', username: '', password: '' })
    async function collect(context, datasourceId) {
      return call(context, `/wiki ${JSON.stringify({ op: 'collect', datasourceId })}`)
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
    const CSS = `
.lds { display: flex; flex-direction: column; gap: 12px; max-width: 720px; color: var(--dsw-alias-label-primary); }
.lds-intro, .lds-empty { margin: 0; font-size: 13px; line-height: 20px; color: var(--dsw-alias-label-tertiary); }
.lds-error { margin: 0; font-size: 12px; line-height: 18px; color: var(--dsw-alias-state-error-primary); }
.lds-cards { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.lds-card { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 14px; border: 0.5px solid var(--dsw-alias-settings-card-stroke); border-radius: var(--dsw-radius-xl); background: var(--dsw-alias-settings-card-fill); }
.lds-card-text { min-width: 0; }
.lds-card-title { font-size: 14px; line-height: 22px; font-weight: 500; }
.lds-card-meta { font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary); }
.lds-form { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 12px; }
.lds-field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.lds-label { font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary); }
.lds-input { box-sizing: border-box; width: 100%; height: 32px; padding: 0 10px; border: 0.5px solid var(--dsw-alias-border-l4); border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font: inherit; font-size: 14px; line-height: 22px; }
.lds-input:focus { outline: none; border-color: var(--dsw-alias-state-business-primary); }
.lds-select { appearance: none; cursor: pointer; padding-right: 32px; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none'%3E%3Cpath d='M3 4.5L6 7.5L9 4.5' stroke='%2381858C' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; background-size: 12px 12px; }
.lds-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.lds-btn { box-sizing: border-box; display: inline-flex; align-items: center; height: 28px; padding: 0 10px; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-sm); background: transparent; color: var(--dsw-alias-label-primary); font: inherit; font-size: 12px; line-height: 18px; cursor: pointer; }
.lds-btn:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }
.lds-btn:focus-visible { outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); outline-offset: 2px; }
.lds-btn:disabled { cursor: not-allowed; opacity: 0.4; }
.lds-btn-primary { border: 0; background: var(--dsw-alias-button-primary-fill); color: var(--dsw-alias-label-primary-foreground); }
.lds-btn-primary:hover:not(:disabled) { background: var(--dsw-alias-button-primary-hover); }
`
    function ensureStyles() {
      if (typeof document === 'undefined' || document.getElementById('local-datasource-style')) return
      const el = document.createElement('style')
      el.id = 'local-datasource-style'
      el.textContent = CSS
      document.head.appendChild(el)
    }
    return {
      inject: ['slots', 'locale', 'remote', 'remote.commands', 'sessions'],
      apply(ctx) {
        ensureStyles()
        const ns = 'local.datasource'
        ctx.effect(() => ctx.locale.register(ns, { zh, en }), 'datasource.locale')
        const t = () => ctx.locale.bind(ns)
        ctx.effect(() => ctx.slots.inject('settings.section', () => ctx.slots.register({
          name: 'settings.section',
          id: 'local-datasource',
          order: 40,
          label: () => t()('nav'),
          locale: ns,
        }, function DatasourceSettings() {
          return h(Panel, { ctx, t: t() })
        })), 'datasource.settings')
      },
    }

    function Panel({ ctx, t }) {
      const [rows, setRows] = useState([])
      const [error, setError] = useState('')
      const [notice, setNotice] = useState('')
      const [busy, setBusy] = useState('')
      const [editingId, setEditingId] = useState(null)
      const [confirmId, setConfirmId] = useState(null)
      const [form, setForm] = useState(blank)
      const fail = (err) => setError(messageOf(err, t))
      const load = async () => {
        setError('')
        const data = await call(ctx, '/datasource {"op":"list"}')
        setRows(data.datasources ?? [])
      }
      useEffect(() => { load().catch(fail) }, [])
      const payload = () => ({
        name: form.name.trim(),
        type: form.type,
        host: form.host.trim(),
        port: Number(form.port),
        database: form.database.trim(),
        username: form.username,
        password: form.password,
      })
      const field = (key, label, type = 'text') => h('label', { className: 'lds-field' },
        h('span', { className: 'lds-label' }, label),
        h('input', {
          className: 'lds-input',
          type,
          value: form[key],
          autoComplete: type === 'password' ? 'new-password' : 'off',
          onChange: (event) => setForm({ ...form, [key]: event.target.value }),
        }),
      )
      return h('div', { className: 'lds' },
        h('p', { className: 'lds-intro' }, t('intro')),
        error ? h('p', { className: 'lds-error', role: 'alert' }, error) : null,
        notice ? h('p', { className: 'lds-intro' }, notice) : null,
        rows.length === 0 ? h('p', { className: 'lds-empty' }, t('empty')) : h('ul', { className: 'lds-cards' }, rows.map((row) => h('li', { className: 'lds-card', key: row.id },
          h('div', { className: 'lds-card-text' },
            h('div', { className: 'lds-card-title' }, row.name),
            h('div', { className: 'lds-card-meta' }, `${row.type} · ${row.host}:${row.port}/${row.database}`),
          ),
          h('div', { className: 'lds-actions' },
            h('button', {
              type: 'button',
              className: 'lds-btn',
              disabled: busy !== '',
              onClick: () => {
                setBusy(String(row.id))
                setNotice('')
                collect(ctx, row.id).then((result) => {
                  setNotice(t('collected').replace('{captured}', String(result.captured ?? 0)).replace('{reused}', String(result.reused ?? 0)))
                }).catch(fail).finally(() => setBusy(''))
              },
            }, t('collect')),
            h('button', {
              type: 'button',
              className: 'lds-btn',
              disabled: busy !== '',
              onClick: () => {
                setError('')
                setNotice('')
                setConfirmId(null)
                setEditingId(row.id)
                setForm({
                  name: row.name ?? '',
                  type: row.type,
                  host: row.host ?? '',
                  port: String(row.port ?? ''),
                  database: row.database ?? '',
                  username: row.username ?? '',
                  password: '',
                })
              },
            }, t('edit')),
            h('button', {
              type: 'button',
              className: 'lds-btn',
              disabled: busy !== '',
              onClick: () => {
                if (confirmId !== row.id) { setConfirmId(row.id); return }
                setBusy(`remove-${row.id}`)
                setNotice('')
                call(ctx, `/datasource ${JSON.stringify({ op: 'remove', id: row.id })}`).then(() => {
                  if (editingId === row.id) { setEditingId(null); setForm(blank()) }
                  setConfirmId(null)
                  setNotice(t('removed'))
                  return load()
                }).catch(fail).finally(() => setBusy(''))
              },
            }, confirmId === row.id ? t('confirmRemove') : t('remove')),
          ),
        ))),
        h('div', { className: 'lds-form' },
          field('name', t('name')),
          h('label', { className: 'lds-field' },
            h('span', { className: 'lds-label' }, t('type')),
            h('select', {
              className: 'lds-input lds-select',
              value: form.type,
              onChange: (event) => setForm({ ...form, type: event.target.value, port: event.target.value === 'mysql' ? '3306' : '5432' }),
            }, h('option', { value: 'postgresql' }, 'PostgreSQL'), h('option', { value: 'mysql' }, 'MySQL')),
          ),
          field('host', t('host')),
          field('port', t('port')),
          field('database', t('database')),
          field('username', t('username')),
          field('password', editingId === null ? t('password') : t('passwordKeep'), 'password'),
        ),
        h('div', { className: 'lds-actions' },
          h('button', {
            type: 'button',
            className: 'lds-btn lds-btn-primary',
            disabled: busy !== '' || form.name.trim() === '',
            onClick: async () => {
              setError('')
              setNotice('')
              setBusy(editingId === null ? 'add' : 'save')
              try {
                const body = editingId === null
                  ? { op: 'add', ...payload() }
                  : { op: 'update', id: editingId, ...payload() }
                await call(ctx, `/datasource ${JSON.stringify(body)}`)
                setEditingId(null)
                setForm(blank())
                setNotice(t('saved'))
                await load()
              } catch (err) {
                fail(err)
              } finally {
                setBusy('')
              }
            },
          }, editingId === null ? t('add') : t('save')),
          editingId !== null ? h('button', {
            type: 'button',
            className: 'lds-btn',
            disabled: busy !== '',
            onClick: () => { setEditingId(null); setForm(blank()); setError('') },
          }, t('cancel')) : null,
          h('button', { type: 'button', className: 'lds-btn', disabled: busy !== '', onClick: () => load().catch(fail) }, t('refresh')),
        ),
      )
    }
  },
})
