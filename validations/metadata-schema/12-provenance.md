# Provenance

## Fields

| Field | Required | Notes |
|---|---:|---|
| `document_type` | Yes | Claim form, defence, sealed order, attendance note, transcript, internal note, etc. |
| `sealed_or_unsealed` | Conditional | Required for orders and court documents where applicable. |
| `filed_or_served_status` | Optional | Filed, served, both, draft, unknown. |
| `source_owner` | Optional | Court, party, solicitor, counsel, internal, AI. |
| `confidence_score` | Yes | AI extraction confidence. |
| `human_verified` | Yes | Boolean. |
| `verified_by` | Optional | User id/role. |
| `verified_at` | Optional | Timestamp. |

## Validation Rules

- Court-record facts require court/party document provenance or human verification.
- AI summaries are not source documents.
- Internal notes must not overwrite sealed orders or filed pleadings.
