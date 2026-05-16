# Track Matrix

Track allocation is not a label; it changes disclosure, evidence, costs, listing and case-management expectations.

## Tracks

| Track | Product implications |
|---|---|
| Small claims | Lightweight procedure; ordinary Part 31 disclosure assumptions should not be applied. |
| Fast track | Directions, fixed recoverable costs exposure and tighter trial preparation expectations. |
| Intermediate track | Complexity band matters; costs and directions must be captured with care. |
| Multi-track | CMC/PTR, budgets, disclosure, experts, bundles and court guides are more likely to matter. |

## Required Fields

- `track`
- `complexity_band`
- `allocated_court`
- `transfer_history`
- `CMC_flag`
- `PTR_flag`
- `listing_questionnaire_flag`

## Validation Rule

If `track` is unknown, CasePass may summarize uploaded documents but must not assert disclosure, evidence, costs or listing obligations as final. The latest sealed allocation or directions order should override inferred track.

## Primary References

- CPR Parts 26 to 30
- Relevant Practice Directions for allocation and case management
