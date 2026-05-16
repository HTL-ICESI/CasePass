# CPR Hierarchy

CasePass must treat England and Wales civil procedure as a hierarchy of authority. The system should not flatten statutes, CPR rules, practice directions, protocols, court guides and uploaded notes into one undifferentiated source.

## Source Priority

| Priority | Source | Product rule |
|---|---|---|
| 1 | Statutes and primary legislation | Controls legality, reserved activities, data protection and recording prohibitions. |
| 2 | Civil Procedure Rules | Controls core civil litigation procedure in County Court, High Court and Civil Division appeals. |
| 3 | Practice Directions | Supplements CPR rules and often contains operational detail. |
| 4 | Pre-action protocol | Controls pre-issue conduct and protocol-specific timing. |
| 5 | Latest sealed order or listing notice | Overrides default timetable assumptions for the matter. |
| 6 | Court or specialist list guide | Adds local or specialist practice for KBD, Commercial Court, Chancery, BPC and other lists. |
| 7 | Forms and HMCTS guidance | Helps validate filing route, form choice and operational process. |
| 8 | Internal notes and AI summaries | Inform working context only; they do not create court-record facts. |

## Design Rule

Every AI output that mentions a rule, deadline or procedural next step must carry a source type. If sources conflict, CasePass should prefer the highest available source and flag the conflict for solicitor review.

## Citation Tiers

| Tier | Sources | Can support a legal citation? | UI label |
|---|---|---:|---|
| A | Statutes, CPR, Practice Directions, official forms, official court guides | Yes | Verified primary source |
| B | SRA, BSB, Law Society, HMCTS, ICO and other regulator or official guidance | Yes, as guidance | Regulator guidance |
| C | CasePass workflow policy, metadata mapping, deadline heuristics, AI inference | No | AI inferred - needs review |

The chatbot must not cite Tier C as legal authority. Tier C may explain why CasePass is asking a question or blocking a workflow step, but it must be labelled as product policy or inference.

## Pinpoint Requirement

Every source-backed legal answer should include:

- authority name,
- document title,
- canonical URL,
- pinpoint by rule, paragraph, section, page or form field,
- short excerpt or faithful paraphrase,
- confidence level,
- human verification status.

## MVP Fields

- `source_type`
- `source_title`
- `source_date`
- `source_url_or_document_id`
- `canonical_url`
- `pinpoint_label`
- `short_excerpt`
- `sealed_or_unsealed`
- `confidence_score`
- `human_verified`

## Primary References

- Civil Procedure Rules Parts 1 and 2
- Applicable Practice Directions
- Latest sealed court order in the uploaded matter
