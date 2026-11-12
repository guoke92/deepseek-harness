# Agent Note: Knowledge extract rounds and corroborate compile

Status: implemented

English | [中文](2026-11-10-knowledge-extract-corroborate-rounds.zh.md)

## Problem

The Domain Pack checkbox treated industry priors as a selectable config shell, while collect only wrote fixed schema facts and compile either stayed offline rules or risked model-written wiki pages as truth. That could not squeeze direct, indirect, and implicit knowledge from a source, could not preliminarily link within a source, and could not corroborate across sources with world knowledge under an explicit completeness loop.

## Decision

Ship a two-stage pipeline without Domain Packs, orchestrated by peer lead agent presets.

1. **Collect L0** remains a deterministic tool (`wiki_collect_l0`) with `structureHash` / `profileHash`. The model must not rewrite L0.
2. **Panel collect** runs deterministic `wiki_collect_l0` and a rule extract scaffold on the host, then starts preset `wiki-collect`. The lead deep-extracts with `wiki_extract_*` (optionally via subagents). If the lead fails, the host keeps the L0 result and finishes `done_partial`.
3. **Panel compile** runs `wiki_project_technical` on the host, then starts preset `wiki-compile`. The lead writes `CompileJudgement` through `wiki_corroborate_apply` (not page `Decision` bodies). If the lead fails, the host keeps the projection.
4. Host mini-loops (`wikiModelComplete` round scripts) are not the product path. Without agents, the panel keeps the deterministic segment and finishes `done_partial`.

WeKnora’s staged completeness idea remains in tool contracts and lead prompts; model-authored Markdown wiki pages are not the knowledge store.

This supersedes the Pack-centric proposal in [2026-11-09-knowledge-coarse-fine-compile](../../rejected/architecture/2026-11-09-knowledge-coarse-fine-compile.md) (rejected for Pack-as-business-layer).

## Alternatives considered

- **Keep Domain Pack YAML priors.** Rejected: duplicates model world knowledge as a checkbox and drifts from evidence-grounded extract/corroborate.
- **Reuse `createModelDecider` page Decision as compile main path.** Rejected: recreates WeKnora-style prose-as-truth.
- **Model during L0 sampling.** Rejected for fingerprint reproducibility; deep extract runs after L0.

## Consequences

- `wiki_set_packs` / `packs.js` / SCF pack UI are removed.
- Panel collect/compile run L0 or technical projection on the host, then launch `wiki-collect` / `wiki-compile`; host round scripts are legacy/test-only.
- Tests exercise contract-gated tools and may still inject fake `complete` into service helpers; CI does not require a live model for L0/technical projection.
- Tasks may finish `done_partial` when the lead cannot endorse completeness.

## Required verification

- `node --test` under `local-plugins/contracts` and `local-plugins/wiki` covering round stop rules, extract seal, corroborate upsert, and no Pack tools.
