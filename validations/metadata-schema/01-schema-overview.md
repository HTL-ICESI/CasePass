# Metadata Schema Overview

The current database schema contains Colombia-oriented fields such as `radicado` and `apoderado_notes`. For England and Wales, CasePass should move to 13 metadata groups that mirror the procedural architecture.

## Required Groups

| Group | Purpose |
|---|---|
| Jurisdiction and ruleset | Prevents CPR/tribunal/forum confusion. |
| Matter identity | Anchors the case, parties and document matching. |
| Procedural route | Determines forms, response route, appeal status and claim type. |
| Track and management | Drives disclosure, evidence, costs and listing expectations. |
| Service and response | Calculates issue, service, AOS and defence status. |
| Hearing and listing | Captures the next event and preparation duties. |
| Disclosure | Distinguishes Part 31, PD 57AD and excluded regimes. |
| Evidence | Tracks witness, expert and PD 57AC issues. |
| Costs and settlement | Flags FRC, QOCS, budgets, Part 36 and assessment. |
| Representation and handoff | Distinguishes solicitor-on-record from counsel/advocate-only instructions. |
| Provenance | Separates sealed orders, filed documents, internal notes and AI summaries. |
| Risk flags | Prevents silent conversion of uncertainty into operational status. |
| Human verification | Enforces solicitor review before handoff and post-action state changes. |

## Migration Direction

| Current field | Proposed replacement |
|---|---|
| `radicado` | `claim_number` |
| `name` | `case_title` or internal matter name |
| `plaintiff` | `claimant` |
| `defendant` | `defendant` |
| `apoderado_notes` | `handoff_notes` with provenance and privilege flags |
| `last_action` | latest verified timeline event |
| `next_action` | next verified procedural action |

## Implementation Rule

The schema should support partial unknowns. Unknown values must be stored explicitly as `unknown` or nullable fields plus risk flags, not guessed by the AI.
