# Track Management

## Fields

| Field | Required | Notes |
|---|---:|---|
| `track` | Conditional | Small claims, fast, intermediate, multi-track, unknown. |
| `complexity_band` | Conditional | Especially relevant for intermediate track. |
| `allocated_court` | Optional | Court handling after allocation or transfer. |
| `transfer_history` | Optional | Prior transfers between courts/lists. |
| `CMC_flag` | Yes | Case management conference known/pending? |
| `PTR_flag` | Yes | Pre-trial review known/pending? |
| `listing_questionnaire_flag` | Yes | Captures N170/pre-trial checklist status. |

## Validation Rules

- `track=unknown` should set `track_uncertain=true`.
- Disclosure/costs defaults must not be asserted until track and latest order are reviewed.
- Latest sealed directions order overrides inferred track-management assumptions.
