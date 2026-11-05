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

## Restore pre-sync tree

```bash
git checkout backup/pre-upstream-sync-20261105-095546
# or
git switch -c restore-from-backup backup-pre-upstream-sync-20261105-095546
```
