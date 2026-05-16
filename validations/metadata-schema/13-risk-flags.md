# Risk Flags

## Fields

| Field | Required | Trigger |
|---|---:|---|
| `forum_uncertain` | Yes | Forum or ruleset not verified. |
| `track_uncertain` | Yes | Track/allocation not verified. |
| `ruleset_mismatch_risk` | Yes | Tribunal/BPC/appeal indicators conflict with selected route. |
| `bundle_noncompliance_risk` | Yes | Hearing exists but bundle obligations are unknown or overdue. |
| `recording_risk` | Yes | Any live recording, remote hearing capture or audio feature is attempted. |
| `part42_risk` | Yes | Possible full solicitor change without N434 clarity. |
| `conflict_clearance_risk` | Yes | Recipient not cleared before file access. |
| `human_verification_required` | Yes | Any operational status change lacks solicitor confirmation. |

## Validation Rules

- Risk flags should be visible in the UI and API response.
- Risk flags should block automation only where the workflow gate requires it.
- Clearing a risk requires a source, a human verifier or both.
