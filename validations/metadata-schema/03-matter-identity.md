# Matter Identity

## Fields

| Field | Required | Notes |
|---|---:|---|
| `claim_number` | Yes | Replaces `radicado`. |
| `neutral_reference_if_any` | Optional | Judgment reference where applicable. |
| `case_title` | Yes | Formal title of proceedings. |
| `claimant` | Conditional | Required for first instance civil claims. |
| `defendant` | Conditional | Required for first instance civil claims. |
| `appellant` | Conditional | Required for appeal matters. |
| `respondent` | Conditional | Required for appeal or tribunal matters. |
| `insured_party` | Optional | Useful for PI/insurance-driven cases. |
| `litigation_friend` | Optional | Required where identified. |

## Validation Rules

- Appeal matters require appellant/respondent even if claimant/defendant are known.
- Tribunal matters may use claimant/respondent terminology; store without forcing CPR labels.
- If `claim_number` is missing, the matter can remain a referral shell but cannot become verified.
