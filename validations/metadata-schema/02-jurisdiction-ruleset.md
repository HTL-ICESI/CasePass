# Jurisdiction Ruleset

## Fields

| Field | Required | Notes |
|---|---:|---|
| `jurisdiction` | Yes | Default target is `england_wales`. |
| `forum` | Yes | County Court, High Court, CA Civil Division, Tribunal. |
| `court` | Yes | Court name or tribunal name. |
| `division_list` | Conditional | Required for High Court/BPC/specialist lists where known. |
| `ruleset` | Yes | CPR, CPR appeal, tribunal rules, unknown. |
| `pilot_scheme` | Optional | Use for active pilots or specialist regimes. |
| `tribunal_chamber` | Conditional | Required if forum is tribunal. |

## Validation Rules

- `forum=tribunal` must not route to CPR workflow by default.
- `forum_uncertain=true` blocks deadline and handoff finalization.
- High Court matters should prompt for division/list because overlays may apply.

## Example

```json
{
  "jurisdiction": "england_wales",
  "forum": "High Court",
  "court": "Business and Property Courts",
  "division_list": "Commercial Court",
  "ruleset": "CPR",
  "tribunal_chamber": null
}
```
