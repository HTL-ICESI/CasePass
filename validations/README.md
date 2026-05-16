# CasePass Validations Roadmap

This folder is the implementation contract for adapting CasePass from a Colombian litigation scaffold to an England and Wales common-law workflow.

The priority for the hackathon is documentation before code: the product must know which legal system, forum, role, procedural route and validation gate applies before it accepts documents or produces operational status updates.

## Critical Risks

| Risk | Product consequence | Required control |
|---|---|---|
| Wrong forum classification | CPR, tribunal rules and court guides diverge immediately. | Mandatory forum and ruleset selector before workflow routing. |
| Document-first sequence | Uploading the file before recipient clearance can expose confidential material. | Referral shell and clearance gate before file ingestion. |
| Generic legal roles | Solicitor, barrister, advocate and agent have different procedural effects. | Representation model tied to LSA 2007 and CPR Part 42. |
| Hearing recording | Unauthorised court recording can create criminal and contempt risk. | No live recording feature; only attendance notes or official transcript import. |
| Single human checkpoint | AI may convert an uncertain update into an operational case state. | Human verification before handoff and before post-action state change. |

## Layers

1. `legal-framework/` defines the legal rules that govern design decisions.
2. `metadata-schema/` defines the 13 required metadata groups that should replace the current Colombian-oriented case fields.
3. `workflow-gates/` will define stage-by-stage validation rules.
4. `legal-knowledge-base/` will split chatbot rules into sourced topics.
5. `../casos-prueba/` should be migrated to England and Wales test matters using the metadata schema.

## Hackathon Order

For a 24-hour build, implement in this order:

1. Wire the forum/ruleset selector and metadata shape.
2. Add the two human verification checkpoints.
3. Block document ingestion until recipient clearance is captured.
4. Replace generic roles with solicitor-on-record, instructed counsel, advocate-only and full change of solicitor.
5. Add no-recording guardrails and post-hearing attendance-note/transcript workflows.

## Current Code Gap

`backend/src/db/schema.sql` still uses fields such as `radicado` and `apoderado_notes`. Those should be replaced or migrated through the schema proposed in `metadata-schema/01-schema-overview.md`.
