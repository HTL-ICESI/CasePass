# Refusal Rules

CasePass should refuse a definitive legal answer or downgrade it to a clarification request in these situations.

| Trigger | System response | Risk flag |
|---|---|---|
| No primary or regulator source found | Say the point is not source-verified and ask for review. | `citation_missing_risk` |
| Only secondary material supports the answer | Mark as guidance gap; do not give definitive procedural answer. | `secondary_source_only_risk` |
| Forum or ruleset is uncertain | Ask for court/tribunal/division/list before applying rules. | `forum_uncertain` |
| Sources conflict | Present conflict and require solicitor review. | `source_conflict_risk` |
| Answer requires strategic legal judgment | Explain that CasePass can summarize sources but cannot decide strategy. | `human_verification_required` |
| Role authority cannot be verified | Do not imply conduct of litigation or rights of audience. | `reserved_activity_risk` |
| Live hearing recording is requested | Refuse live recording workflow and offer attendance note or transcript import. | `recording_risk` |

## Safe Downgrade Template

```text
I cannot verify that as a procedural rule from the current source set.
Known issue: [forum/source/role/deadline uncertainty].
Next safe step: [ask for document, court, source, sealed order, or solicitor review].
Status: Unverified - needs review.
```

## Non-Refusal Clarification

If the system can identify a likely source family but not the exact pinpoint, it may say:

```text
This appears to be governed by [source family], but the exact rule or page has not been retrieved. I can only treat this as a clarification prompt until a pinpoint source is attached.
```
