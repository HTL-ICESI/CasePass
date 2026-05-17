# Citation Policy

## Rule

Every legal statement produced by CasePass must be source-backed or visibly downgraded.

## Legal Statement

A legal statement includes any output that says or implies:

- a deadline applies,
- a form is required,
- a court or tribunal rule governs the matter,
- a party or representative must or may take a procedural step,
- a hearing, filing, bundle, evidence, disclosure, costs or appeal rule applies,
- a feature is prohibited or restricted by law, professional conduct, data protection or AML duties.

## Minimum Citation Fields

| Field | Required | Example |
|---|---:|---|
| `authority_name` | Yes | Justice UK |
| `document_name` | Yes | CPR Part 15 - Defence and Reply |
| `canonical_url` | Yes | `https://www.justice.gov.uk/courts/procedure-rules/civil/rules/part15` |
| `pinpoint_label` | Yes | `CPR Part 15, r.15.4(1)(b)` |
| `chunk_type` | Yes | rule |
| `short_excerpt` | Yes | Short quote or faithful paraphrase. |
| `trust_tier` | Yes | A |
| `confidence_score` | Yes | 0.96 |
| `human_verified` | Yes | false |

## Pinpoint Rules

- CPR and Practice Directions should cite rule or paragraph numbers.
- Statutes should cite section or regulation numbers.
- Forms should cite the publication page plus PDF page or field label.
- PDF guides should cite page and heading where available.
- HTML guidance should cite section heading and retrieval date if no numbered paragraph exists.

## Display Rules

- Use inline citations for short answers: `CPR Part 15, r.15.4`.
- Use a source panel for the full source, URL, pinpoint and excerpt.
- For PDFs, show an `Open PDF at cited page` action when the page is known.
- Show one badge per answer: `Verified primary source`, `Regulator guidance`, `AI inferred - needs review`, or `Unverified / forum uncertain`.

## Override Rule

A solicitor may approve an answer with missing or conflicting citation support, but CasePass must record the override reason, reviewer and timestamp.
