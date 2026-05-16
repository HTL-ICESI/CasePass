# Procedural Route

## Fields

| Field | Required | Notes |
|---|---:|---|
| `part7_or_part8` | Conditional | Required for CPR first instance claims where known. |
| `claim_type` | Yes | Contract, tort, debt, possession, professional negligence, etc. |
| `cause_of_action` | Optional | Use when extractable from pleadings. |
| `relief_sought` | Optional | Damages, injunction, declaration, possession, appeal relief. |
| `counterclaim_flag` | Yes | Boolean or unknown. |
| `appeal_flag` | Yes | Boolean. |
| `pre_action_protocol` | Optional | Protocol name or none/unknown. |

## Validation Rules

- `appeal_flag=true` activates appeal workflow and disables ordinary first-instance assumptions.
- Unknown Part 7/Part 8 route should block confident response-deadline advice.
- Pre-action protocol should be treated as a live compliance issue, not a descriptive note.
