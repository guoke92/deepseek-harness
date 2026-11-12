# Agent Note: Coarse materials and fine multi-source knowledge compile

Status: rejected — Domain Pack priors as the business layer; superseded by extract/corroborate rounds without packs

English | [中文](2026-11-09-knowledge-coarse-fine-compile.zh.md)

## Problem

The local wiki pipeline already collects database tables into materials and publishes entity, dictionary, and relation pages. That path is too thin for a durable knowledge system: page text is both the truth and the retrieval unit; deposit events stay `captured`; business names, processes, and industry priors have no place; structure and sampling statistics share one content hash so observation jitter rewrites pages.

## Proposal

Split the pipeline into coarse and fine processing, with optional Domain Pack YAML priors (for example SCF) expanded at compile as `suggested` objects, weak regex alignment into coverage gaps, and RetrievalView projection. Pages would remain a projection, but industry knowledge would enter through pack binding on the knowledge base.

## Alternatives considered

- **Evidence-anchored multi-round extract and corroboration without packs.** Chosen later in [2026-11-10-knowledge-extract-corroborate-rounds](../../implemented/architecture/2026-11-10-knowledge-extract-corroborate-rounds.md); packs were rejected because they turn model world knowledge into a checkbox shell and favor regex “alignment” over mutual corroboration.
- **Model-written wiki pages as the store.** Rejected for database facts in both this proposal and the successor.
