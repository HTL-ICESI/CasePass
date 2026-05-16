# Evidence

## Fields

| Field | Required | Notes |
|---|---:|---|
| `witness_statements_status` | Optional | Required, drafted, served, missing, unknown. |
| `PD57AC_flag` | Yes | Boolean or unknown for BPC trial witness statements. |
| `expert_permission` | Optional | Granted, refused, pending, not applicable, unknown. |
| `expert_report_status` | Optional | Drafted, served, joint statement pending, unknown. |
| `statement_of_truth_flag` | Optional | Tracks documents verified by statement of truth. |

## Validation Rules

- BPC trial witness evidence should trigger PD 57AC review.
- Expert evidence should not be treated as permitted unless permission is identified or confirmed.
- AI summaries must distinguish evidence from internal notes.
