window.__ModuleLoader__.load({
  id: '@local/memory',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useEffect, useState } = React
    const zh = {
      nav: '长期记忆',
      intro: '已生效的偏好会进入之后的会话。待确认的条目不会进入提示词',
      empty: '还没有记忆',
      kind: '种类',
      content: '内容',
      add: '新增',
      confirm: '确认',
      reject: '拒绝',
      remove: '删除',
      refresh: '刷新',
      pending: '待确认',
      active: '已生效',
      needSession: '先打开一个会话，再管理记忆',
      profile: '画像',
      preference: '偏好',
      interest: '兴趣',
      fact: '事实',
      task: '任务',
    }
    const en = {
      nav: 'Memory',
      intro: 'Active preferences are included in later sessions. Pending items stay out of the prompt',
      empty: 'No memories yet',
      kind: 'Kind',
      content: 'Content',
      add: 'Add',
      confirm: 'Confirm',
      reject: 'Reject',
      remove: 'Delete',
      refresh: 'Refresh',
      pending: 'Pending',
      active: 'Active',
      needSession: 'Open a session before changing memory',
      profile: 'Profile',
      preference: 'Preference',
      interest: 'Interest',
      fact: 'Fact',
      task: 'Task',
    }
    const panelId = 'local-memory'
    const kinds = ['profile', 'preference', 'interest', 'fact', 'task']
    const CSS = `
.lmem { display: flex; flex-direction: column; height: 100%; min-height: 0; color: var(--dsw-alias-label-primary); background: var(--dsw-alias-bg-base); font-size: 14px; line-height: 22px; }
.lmem-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 28px clamp(24px, 4vw, 48px) 0; }
[data-platform='darwin'] .lmem-head { padding-top: calc(28px + var(--dsh-frame-top-clearance, 0px)); }
.lmem-head h1 { flex: 1; min-width: 0; margin: 0; font-size: 20px; line-height: 28px; font-weight: 500; }
.lmem-scroll { flex: 1 1 auto; min-height: 0; overflow: auto; padding: 16px clamp(24px, 4vw, 48px) 48px; }
.lmem-column { display: flex; flex-direction: column; gap: 12px; max-width: 960px; }
.lmem-intro, .lmem-empty { margin: 0; font-size: 13px; line-height: 20px; color: var(--dsw-alias-label-tertiary); }
.lmem-error { margin: 0; font-size: 12px; line-height: 18px; color: var(--dsw-alias-state-error-primary); }
.lmem-cards { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.lmem-card { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 12px 14px; border: 0.5px solid var(--dsw-alias-settings-card-stroke); border-radius: var(--dsw-radius-xl); background: var(--dsw-alias-settings-card-fill); }
.lmem-card-text { min-width: 0; }
.lmem-card-title { font-size: 14px; line-height: 22px; font-weight: 500; }
.lmem-card-meta { margin-top: 2px; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary); }
.lmem-form { display: grid; grid-template-columns: 160px 1fr; gap: 10px 12px; align-items: end; }
.lmem-field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.lmem-label { font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary); }
.lmem-input { box-sizing: border-box; width: 100%; height: 32px; padding: 0 10px; border: 0.5px solid var(--dsw-alias-border-l4); border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font: inherit; font-size: 14px; line-height: 22px; }
.lmem-input:focus { outline: none; border-color: var(--dsw-alias-state-business-primary); }
.lmem-select { appearance: none; cursor: pointer; padding-right: 32px; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none'%3E%3Cpath d='M3 4.5L6 7.5L9 4.5' stroke='%2381858C' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; background-size: 12px 12px; }
.lmem-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.lmem-btn { box-sizing: border-box; display: inline-flex; align-items: center; height: 28px; padding: 0 10px; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-sm); background: transparent; color: var(--dsw-alias-label-primary); font: inherit; font-size: 12px; line-height: 18px; cursor: pointer; }
.lmem-btn:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }
.lmem-btn:focus-visible { outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); outline-offset: 2px; }
.lmem-btn:disabled { cursor: not-allowed; opacity: 0.4; }
.lmem-btn-primary { height: 32px; padding: 0 12px; border: 0; border-radius: 16px; background: var(--dsw-alias-button-primary-fill); color: var(--dsw-alias-label-primary-foreground); font-size: 13px; line-height: 20px; }
.lmem-btn-primary:hover:not(:disabled) { background: var(--dsw-alias-button-primary-hover); }
@media (max-width: 720px) { .lmem-form { grid-template-columns: 1fr; } }
`
    function ensureStyles() {
      if (typeof document === 'undefined' || document.getElementById('local-memory-style')) return
      const el = document.createElement('style')
      el.id = 'local-memory-style'
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
    function MemoryIcon(props) {
      const size = props.size || 16
      return h('svg', { width: size, height: size, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true' },
        h('path', { d: 'M8 2.5c-2.4 1.5-3.6 1.7-5.2 1.7v5.2c0 2.3 2.1 3.7 5.2 4.6 3.1-.9 5.2-2.3 5.2-4.6V4.2C11.6 4.2 10.4 4 8 2.5z', stroke: 'currentColor', strokeWidth: 1.2, strokeLinejoin: 'round' }),
      )
    }
    return {
      inject: ['slots', 'locale', 'remote', 'remote.commands', 'sessions'],
      apply(ctx) {
        ensureStyles()
        const ns = 'local.memory'
        ctx.effect(() => ctx.locale.register(ns, { zh, en }), 'memory.locale')
        const t = () => ctx.locale.bind(ns)
        ctx.effect(() => ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist',
          id: panelId,
          order: 30,
          label: () => t()('nav'),
          locale: ns,
        }, MemoryIcon)), 'memory.nav')
        ctx.effect(() => ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main',
          key: panelId,
          locale: ns,
        }, function MemoryPage() {
          return h(Panel, { ctx, t: t() })
        })), 'memory.page')
      },
    }

    function Panel({ ctx, t }) {
      const [items, setItems] = useState([])
      const [error, setError] = useState('')
      const [busy, setBusy] = useState(false)
      const [kind, setKind] = useState('preference')
      const [content, setContent] = useState('')
      const fail = (err) => setError(messageOf(err, t))
      const load = async () => {
        setError('')
        const data = await call(ctx, '/memory {"op":"list"}')
        setItems(data.items ?? [])
      }
      useEffect(() => { load().catch(fail) }, [])
      const act = async (op, id) => {
        setError('')
        setBusy(true)
        try {
          await call(ctx, `/memory ${JSON.stringify({ op, id })}`)
          await load()
        } catch (err) {
          fail(err)
        } finally {
          setBusy(false)
        }
      }
      return h('div', { className: 'lmem' },
        h('header', { className: 'lmem-head' },
          h('h1', null, t('nav')),
          h('button', { type: 'button', className: 'lmem-btn', disabled: busy, onClick: () => load().catch(fail) }, t('refresh')),
        ),
        h('div', { className: 'lmem-scroll' },
          h('div', { className: 'lmem-column' },
            h('p', { className: 'lmem-intro' }, t('intro')),
            error ? h('p', { className: 'lmem-error', role: 'alert' }, error) : null,
            items.length === 0 ? h('p', { className: 'lmem-empty' }, t('empty')) : h('ul', { className: 'lmem-cards' }, items.map((item) => h('li', { className: 'lmem-card', key: item.id },
              h('div', { className: 'lmem-card-text' },
                h('div', { className: 'lmem-card-title' }, item.content),
                h('div', { className: 'lmem-card-meta' }, `${item.status === 'pending' ? t('pending') : t('active')} · ${labelOf(t, item.kind)}`),
              ),
              h('div', { className: 'lmem-actions' },
                item.status === 'pending' ? h('button', { type: 'button', className: 'lmem-btn', disabled: busy, onClick: () => act('confirm', item.id) }, t('confirm')) : null,
                item.status === 'pending' ? h('button', { type: 'button', className: 'lmem-btn', disabled: busy, onClick: () => act('reject', item.id) }, t('reject')) : null,
                h('button', { type: 'button', className: 'lmem-btn', disabled: busy, onClick: () => act('remove', item.id) }, t('remove')),
              ),
            ))),
            h('div', { className: 'lmem-form' },
              h('label', { className: 'lmem-field' },
                h('span', { className: 'lmem-label' }, t('kind')),
                h('select', {
                  className: 'lmem-input lmem-select',
                  value: kind,
                  onChange: (event) => setKind(event.target.value),
                }, kinds.map((value) => h('option', { key: value, value }, labelOf(t, value)))),
              ),
              h('label', { className: 'lmem-field' },
                h('span', { className: 'lmem-label' }, t('content')),
                h('input', {
                  className: 'lmem-input',
                  value: content,
                  onChange: (event) => setContent(event.target.value),
                }),
              ),
            ),
            h('div', { className: 'lmem-actions' },
              h('button', {
                type: 'button',
                className: 'lmem-btn lmem-btn-primary',
                disabled: busy || content.trim() === '',
                onClick: async () => {
                  setError('')
                  setBusy(true)
                  try {
                    await call(ctx, `/memory ${JSON.stringify({ op: 'add', kind, content })}`)
                    setContent('')
                    await load()
                  } catch (err) {
                    fail(err)
                  } finally {
                    setBusy(false)
                  }
                },
              }, t('add')),
            ),
          ),
        ),
      )
    }
  },
})
