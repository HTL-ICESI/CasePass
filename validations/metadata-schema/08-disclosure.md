# Disclosure

## Fields

| Field | Required | Notes |
|---|---:|---|
| `disclosure_regime` | Conditional | Part 31, PD 57AD, small claims excluded, tribunal, unknown. |
| `PD57AD_flag` | Yes | Boolean or unknown. |
| `N265_status` | Optional | Not applicable, required, drafted, served, filed, unknown. |
| `edisclosure_flag` | Optional | Captures electronic disclosure issues. |
| `disclosure_deadline` | Optional | From order or ruleset. |

## Validation Rules

- BPC matters should prompt for PD 57AD.
- Small claims should not silently inherit Part 31 assumptions.
- Tribunal disclosure must route to tribunal-specific rules or remain unknown.
