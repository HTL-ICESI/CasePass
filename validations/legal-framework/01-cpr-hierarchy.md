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

## MVP Fields

- `source_type`
- `source_title`
- `source_date`
- `source_url_or_document_id`
- `sealed_or_unsealed`
- `confidence_score`
- `human_verified`

## Primary References

- Civil Procedure Rules Parts 1 and 2
- Applicable Practice Directions
- Latest sealed court order in the uploaded matter
