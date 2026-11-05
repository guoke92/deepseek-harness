window.__ModuleLoader__.load({
  id: '@local/datasource',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const zh = {
      nav: '数据源',
      deskMissing: '知识库插件未加载，数据源卡片暂不可用',
    }
    const en = {
      nav: 'Data sources',
      deskMissing: 'The knowledge plugin is not loaded, so source cards are unavailable',
    }
    const CSS = `
.lds-wait { margin: 0; font-size: 13px; line-height: 20px; color: var(--dsw-alias-label-tertiary); }
`
    function ensureStyles() {
      if (typeof document === 'undefined' || document.getElementById('local-datasource-style')) return
      const el = document.createElement('style')
      el.id = 'local-datasource-style'
      el.textContent = CSS
      document.head.appendChild(el)
    }
    return {
      inject: ['slots', 'locale'],
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
          const Desk = window.__dshSourceDesk
          if (typeof Desk !== 'function') return h('p', { className: 'lds-wait' }, t()('deskMissing'))
          return h(Desk)
        })), 'datasource.settings')
      },
    }
  },
})
