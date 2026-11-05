# Fork changes vs official `deepseek-ai/deepseek-harness`

Sync branch: `sync/upstream-reapply-20261105`
Base: `upstream/master` (`fcc0ad4621`, includes `dsh-v0.2.2-rc.1`)
Pre-sync backup: branch `backup/pre-upstream-sync-20261105-095546`, tag `backup-pre-upstream-sync-20261105-095546` (`52da569b58`)
Offline archive: `/Users/fanjunwei/Projects/deepseek-harness-fork-backup-20261105`

Strategy: take official master as the tree, then re-apply only core analysis features. Optional core-tree polish from the old fork is dropped.

## Re-applied (KEEP)

| Area | Paths | Reason |
|------|-------|--------|
| Local analysis plugins | `local-plugins/{analyst,contracts,datasource,memory,wiki}/**` | Core product: KB-scoped analysis, datasource, wiki, memory |
| Panel command flags | `packages/interaction/commands/**`, `docs/subsystems/commands*` | `listed` / `recordResult` / `recordLifecycle` so panel RPCs do not pollute chat/session |
| Hide panel commands in chat | `packages/client/ui-chat/.../chat-visibility.ts` (+ test) | Hide `wiki` / `datasource` / `memory`; merged with upstream Team-toggle visibility |
| Honor `listed: false` | `packages/client/ui-commands/.../service.ts` (+ test) | Command palette must not list panel RPCs |
| Cordis type catalog | `packages/extensions/tool-cordis/src/api-catalog.ts` | Keep CommandDefinition / CommandDescriptor strings aligned |
| Desktop web stream fetch | `apps/web/src/main.ts` (+ test) | Plugin reload path uses page `fetch` instead of broken EventSource |

## Dropped (not re-applied)

| Area | Former paths | Reason |
|------|--------------|--------|
| Desktop `authenticatedHostFetch` | `apps/desktop/src/{main,web-document}.ts` (+ tests) | Upstream now authenticates once, passes an explicit cookie into `connectDesktopWelcome`, and clears legacy `dsh-auth-*` cookies via `removeLegacyHostCookies` |
| Markdown Mermaid/Vega charts | `packages/client/ui-primitives/src/markdown/{Mermaid*,Vega*,chartTheme*,render.tsx}` + deps/tests | Optional chart rendering; not required for KB analysis |
| Chart license notices | `THIRD_PARTY_NOTICES.md` | Follows dropped chart deps |
| Plugin/Task Manager CSS inset | `packages/client/ui-plugin-manager/...`, `packages/client/ui-schedule/...` | Cosmetic titlebar padding |
| `dsh web restart` | `apps/cli/src/web-restart.ts`, `apps/cli/src/args.ts` restart flag | Dev convenience only |
| Desktop restart helper | `restart-desktop.sh` | Local ops script |
| Codex exclude rewrite / mysql2 exclude | `pnpm-workspace.yaml` edits | Accidental or install-policy drift; re-add `mysql2` exclude only if install fails |
| Old lockfile patch | `pnpm-lock.yaml` as a replayed diff | Regenerated from the new upstream base |

## Completeness review (backup ↔ sync)

Compared `backup/pre-upstream-sync-20261105-095546` with `sync/upstream-reapply-20261105` on 2026-11-05.

### Intact

| Check | Result |
|-------|--------|
| `local-plugins/` git tree OID | Identical (`36da22a114…`) |
| KB-scope sources (`analyst` policy/plugin/tools, `contracts/db-document`, `datasource/document`, `wiki` service/entry) | Byte-identical to backup |
| Panel command API (`recordResult` / `recordLifecycle` / `listed`) + docs/tests | Identical to backup |
| `ui-commands` `listed: false` filter + test | Identical |
| `apps/web` stream `fetch` patch + test | Identical |
| `api-catalog` CommandDefinition / CommandDescriptor strings | Identical |
| Plugin `dsh.client.inject` package names | All still present under `packages/` |
| Preset `isolate` for `localAnalyst` | Still supported by agent-preset-registry |

### Intentional merge (not a loss)

`chat-visibility.ts` keeps panel-command hiding (`wiki` / `datasource` / `memory`) and adopts upstream Team-toggle hiding. Backup also hid ordinary Context unless it carried tool add/remove; upstream now shows ordinary Context — sync follows upstream for Context, which matches current official Chat behavior.

### Known non-blocker gaps (dropped on purpose)

| Gap | Impact | Mitigation |
|-----|--------|------------|
| No Mermaid/Vega markdown renderers | Analyst may still emit ` ```vega-lite ` fences; they render as code, not charts | Re-apply chart UI from backup if visual charts become required |
| No `restart-desktop.sh` / `dsh web restart` | Dev restart UX only | Use normal process restart |
| Desktop cookie helper dropped | None expected | Upstream `authenticateWebHost` + `removeLegacyHostCookies` covers the same failure mode |

### Evidence run on sync tip

- `pnpm run build:artifacts` — pass
- pre-push `typecheck` (earlier) — pass
- vitest KEEP suite (commands / ui-commands / ui-chat / desktop-boot) — 232 pass
- `local-plugins/{analyst,contracts,datasource,memory,wiki}` `npm test` — 209 pass (analyst 46 after artifacts build)

Backup branch and tag remain on `origin`; do not delete until master is cut over and product smoke is signed off.

## Restore pre-sync tree

```bash
git checkout backup/pre-upstream-sync-20261105-095546
# or
git switch -c restore-from-backup backup-pre-upstream-sync-20261105-095546
```
