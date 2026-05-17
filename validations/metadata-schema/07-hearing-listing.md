# Hearing Listing

## Fields

| Field | Required | Notes |
|---|---:|---|
| `next_hearing_type` | Conditional | CMC, interim application, PTR, trial, costs, appeal, tribunal hearing. |
| `next_hearing_date` | Optional | Date/time if known. |
| `hearing_mode` | Optional | In person, remote, hybrid, paper, unknown. |
| `hearing_venue_or_link_status` | Optional | Venue known, remote link pending, confidential, unknown. |
| `bundle_due` | Optional | Bundle deadline if known. |
| `skeleton_due` | Optional | Skeleton argument deadline if known. |
| `draft_order_due` | Optional | Draft order deadline if known. |

## Validation Rules

- Hearing mode must never enable live recording functionality.
- Bundle/skeleton dates require provenance from order, guide, listing notice or lawyer confirmation.
- Unknown hearing purpose should trigger a clarification request before generating a handoff pack.
