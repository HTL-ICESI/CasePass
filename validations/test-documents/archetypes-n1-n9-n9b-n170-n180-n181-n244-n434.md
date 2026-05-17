# Public Form Archetypes

| Form | Classification | Official source | Key fields to extract | Gate |
|---|---|---|---|---|
| N1 | Part 7 claim form | GOV.UK Form N1 publication page | parties, value, brief details, court/hearing centre, representative costs | `ingest`, `pleadings-validation` |
| N9 | Response pack / acknowledgment of service | GOV.UK Form N9 publication page | AoS intent, jurisdiction challenge, response route | `response-deadline` |
| N9B | Defence and counterclaim | HMCTS PDF | defence scope, admission/dispute, counterclaim flag | `pleadings-validation` |
| N170 | Listing questionnaire / pre-trial checklist | GOV.UK Form N170 publication page | trial readiness, trial window, compliance with directions | `hearing-readiness` |
| N180 | Small claims directions questionnaire | GOV.UK Form N180 publication page | small-claims track, mediation, hearing needs, service/copy status | `allocation-dq` |
| N181 | Fast/intermediate/multi-track directions questionnaire | GOV.UK Form N181 publication page | track, complexity, experts, trial length, directions | `allocation-dq` |
| N244 | Application notice | GOV.UK Form N244 publication page | order sought, draft order, hearing mode, judge level, service list | `interim-application` |
| N434 | Notice of change of solicitor | GOV.UK Form N434 plus PD 42 | outgoing/incoming representative, address for service, signatures | `representation-check` |
| N164 | Small-claims-track appeal | County Court forms collection | appeal type, small-claims appeal flag | `appeal` |

## Extraction Standard

Every extracted field should carry:

- `document_type`
- `form_code`
- `source_registry_id`
- `pdf_page`
- `field_label`
- `extracted_value`
- `confidence_score`
- `human_verified`

## Test Assertions

- N1 must map to Part 7 workflow, not tribunal workflow.
- N180 must map to small claims.
- N181 must not map to small claims.
- N434 must activate Part 42 checks.
- N164 must not be classified as respondent notice.
