# Costs Settlement

## Fields

| Field | Required | Notes |
|---|---:|---|
| `costs_regime` | Conditional | FRC, budgeted, summary assessment, detailed assessment, tribunal, unknown. |
| `FRC_flag` | Yes | Boolean or unknown. |
| `QOCS_flag` | Yes | Boolean or unknown. |
| `costs_budget_status` | Optional | Required, filed, approved, varied, unknown. |
| `Part36_offer_flag` | Yes | Boolean or unknown. |
| `settlement_status` | Optional | Negotiation, offer open, settled, unknown. |

## Validation Rules

- Costs and settlement metadata may be sensitive; maintain privilege/provenance labels.
- Part 36 should be flagged without exposing confidential offer content unless user role permits access.
- Costs regime uncertainty should be surfaced before hearing handoff.
