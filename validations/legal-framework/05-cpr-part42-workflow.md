# CPR Part 42 Workflow

Part 42 is the procedural line between a true change of solicitor/legal representative and a limited instruction that does not change the court record.

## Classification

| Scenario | Part 42/N434 likely required? | Product route |
|---|---:|---|
| Internal fee-earner reassignment within same firm | No | Internal reassignment note. |
| Counsel or advocate instructed for hearing only | No | Advocate-only handoff. |
| External agent assists but original solicitor remains on record | Usually no | Agent instruction with scope limits. |
| Party changes solicitor on record | Yes | Notice of change workflow. |
| Litigant in person instructs a solicitor to go on record | Yes | Notice of change workflow. |

## Gate Requirements

Before marking a handoff as a full representation change, CasePass must capture:

- `solicitor_on_record`
- `new_solicitor`
- `N434_status`
- `notice_filed_date`
- `notice_served_on_parties`
- `service_evidence_document_id`
- `human_verified`

## System Rule

If `N434_status` is `required_not_filed` or `unknown`, the system must not present the receiving solicitor as already on record. It should present the handoff as pending solicitor verification.

## Primary References

- CPR Part 42
- Practice Direction 42
- Form N434
