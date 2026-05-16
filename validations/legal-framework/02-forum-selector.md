# Forum Selector

The forum selector is the first mandatory decision in the CasePass workflow. The system must not default to CPR just because the matter is civil or because a document contains words such as claim, hearing or order.

## Forum Values

| Forum | Ruleset | Typical indicators |
|---|---|---|
| County Court | CPR plus local listing/order requirements | Claim number, N1, directions order, small/fast/intermediate/multi-track. |
| High Court | CPR plus division/list guide | KB, Chancery, BPC, Commercial Court, TCC, Administrative Court. |
| Court of Appeal Civil Division | CPR Part 52 plus appeal forms/guidance | N161, appellant/respondent, permission to appeal, sealed order/judgment. |
| Tribunal | Tribunal Procedure Rules and chamber guidance | Employment Tribunal, FTT, UT, chamber name, ET1/ET3 or tribunal case number. |

## Required Gate

CasePass should require a confirmed `forum` before:

- accepting full file ingestion,
- selecting chatbot knowledge rules,
- computing procedural deadlines,
- creating a handoff pack,
- updating the matter into an operational state.

## Uncertainty Handling

If the forum cannot be determined from the referral shell, set:

- `forum_uncertain: true`
- `ruleset: unknown`
- `allowed_action: request_clarification_only`

The system may ask for the court, tribunal, division/list and case number, but should not produce procedural advice beyond identifying the uncertainty.
