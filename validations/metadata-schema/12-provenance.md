# Provenance

## Fields

| Field | Required | Notes |
|---|---:|---|
| `document_type` | Yes | Claim form, defence, sealed order, attendance note, transcript, internal note, etc. |
| `sealed_or_unsealed` | Conditional | Required for orders and court documents where applicable. |
| `filed_or_served_status` | Optional | Filed, served, both, draft, unknown. |
| `source_owner` | Optional | Court, party, solicitor, counsel, internal, AI. |
| `legal_source_id` | Optional | Link to canonical source registry entry where the fact depends on a legal rule. |
| `legal_source_document_id` | Optional | Link to specific CPR, statute, form, guide or regulator document. |
| `legal_source_chunk_id` | Optional | Rule, paragraph, page or form-field chunk used as citation support. |
| `pinpoint_label` | Optional | Human-readable locator such as `CPR Part 15, r.15.4(1)(b)` or `Form N1, PDF p.1`. |
| `short_excerpt` | Optional | Short quoted excerpt or faithful paraphrase for user verification. |
| `confidence_score` | Yes | AI extraction confidence. |
| `human_verified` | Yes | Boolean. |
| `verified_by` | Optional | User id/role. |
| `verified_at` | Optional | Timestamp. |

## Validation Rules

- Court-record facts require court/party document provenance or human verification.
- AI summaries are not source documents.
- Internal notes must not overwrite sealed orders or filed pleadings.
- Legal-rule claims require a source registry entry and pinpoint unless explicitly marked `unverified`.
- PDF citations require a page number; HTML citations require a rule, paragraph, section or stable heading.
- If a source is Tier C CasePass policy, the UI must label it as inference rather than legal authority.
