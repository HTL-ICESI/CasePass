# Representation Handoff

## Fields

| Field | Required | Notes |
|---|---:|---|
| `solicitor_on_record` | Yes | Current court-record solicitor where applicable. |
| `instructing_solicitor` | Optional | Sender of limited instruction. |
| `receiving_lawyer` | Yes | Person or firm receiving the handoff. |
| `receiving_role` | Yes | Solicitor, counsel, advocate-only, agent, internal fee earner. |
| `hearing_only_advocate_flag` | Yes | Boolean. |
| `N434_status` | Conditional | Required where representation change may apply. |
| `handoff_scope` | Yes | Full conduct, hearing only, document review, post-hearing update, other. |
| `recipient_clearance_status` | Yes | Not started, pending, cleared, rejected. |

## Validation Rules

- Full file ingestion should not occur before recipient clearance.
- `hearing_only_advocate_flag=true` should not be described as a change of solicitor.
- `N434_status=unknown` blocks "new solicitor on record" language.
