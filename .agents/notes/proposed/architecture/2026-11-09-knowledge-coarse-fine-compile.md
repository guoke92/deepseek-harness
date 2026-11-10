# Agent Note: Coarse materials and fine multi-source knowledge compile

Status: proposed

English | [中文](2026-11-09-knowledge-coarse-fine-compile.zh.md)

## Problem

The local wiki pipeline already collects database tables into materials and publishes entity, dictionary, and relation pages. That path is too thin for a durable knowledge system: page text is both the truth and the retrieval unit; deposit events stay `captured`; business names, processes, and industry priors have no place; structure and sampling statistics share one content hash so observation jitter rewrites pages.

Industry document RAG (for example WeKnora) stages parse → chunk → optional wiki/graph, but treats model-written pages as knowledge. Semantic layers keep metrics stable only because analysts hand-author them. Neither matches the product need: multi-source evidence stacked into a stable metamodel, with conversation confirmation flowing back through the same compile path.

## Proposal

Split the pipeline into **coarse** and **fine** processing on a closed metamodel.

1. **Coarse processing** is source-specific. Database materials emphasize schema, profile, and association candidates; code will emphasize enums, mappings, and flows; documents emphasize terms, scenarios, and policies by subtype; deposits accept only confirmed SQL, caliber, or label events. Each material carries typed `assertions` plus separate `structureHash` and `profileHash`.
2. **Fine processing** is knowledge-base-wide. It upserts technical objects, expands an optional Domain Pack as `suggested` priors, aligns and weaves relations, promotes or opens proposals, then projects Pages, a rebuildable RetrievalView, and Coverage. Pages are not the source of truth.
3. **Retrieval** uses `wiki_resolve` over RetrievalView facets (technical names, business labels, values, associations, cases, policies). Ask-data tools must not treat whole-page keyword search as the primary linker.
4. **Domain Packs** supply industry competency questions, concepts, document types, and weak grounding hints. They never invent physical columns; unrealized pack concepts become coverage gaps.

### Business metamodel (closed)

Domain, Concept, Role, DocumentType, Process, Activity, EventType, Policy, Case, plus technical assets and Grounding. Retrieval facets are derived projections, not metamodel kinds.

### Implementation slices

- **P0** — assertion contract and dual hashes on database materials.
- **P1** — Technical upsert, RetrievalView, `wiki_resolve`.
- **P2** — Deposit compilers to Case / policy draft / label proposal; compile after deposit.
- **P3** — Pack align and coverage gaps (starting with a minimal SCF pack).
- **P4** — Structured code/document ingest (`code.module` / `doc.artifact`), pack expand beyond columns, ask-data prefers `wiki_resolve`.
- **P5+** — Automatic AST/doc extractors; full process/event promotion rules; dictionary presentation migration.

## Alternatives considered

- **Model-written wiki as the store (WeKnora-style).** Rejected for database facts: column completeness and relation thresholds must stay deterministic.
- **Hard-coded retrieval record enum as the ontology.** Rejected: that freezes ask-data facets instead of source capabilities and business types.
- **OWL/triplestore-first (Knora-style).** Deferred: identity and versioning ideas are reused; RDF runtime is out of scope for the first ship.

## Acceptance criteria

- Database capture writes assertions with distinct structure and profile hashes; profile-only refresh reprojects without new page decision bodies when `refreshKind` is `profile`.
- After compile, `wiki_resolve` returns field, value, association, and business-label hits for the active knowledge base.
- Confirmed SQL deposits compile into accepted Case objects visible to `wiki_resolve`.
- An optional Domain Pack can mark unrealized concepts in Coverage without fabricating tables.
- Existing wiki, datasource, contracts, and analyst unit suites stay green.

## Risks

- Keeping legacy `concept/` dictionary pages beside business Concept objects can confuse readers until dictionary presentation is migrated.
- Defaulting compile to the SCF pack may over-suggest grounding on unrelated schemas; pack binding is per-knowledge-base (`packIds`) and must stay opt-in.
- Automatic code/document extractors are still unimplemented; structured ingest covers enums, mappings, terms, and processes until AST/doc parsers land.
