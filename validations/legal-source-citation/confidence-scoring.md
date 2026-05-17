# Confidence Scoring

Confidence is not legal correctness. It measures whether the answer is properly grounded and routed.

## Score Inputs

| Input | Weight | High-confidence condition |
|---|---:|---|
| Source tier | 30 | Tier A primary source or Tier B regulator guidance for regulatory topics. |
| Pinpoint quality | 25 | Rule, paragraph, section, page or form field is exact. |
| Forum certainty | 20 | Forum, ruleset and specialist overlay are confirmed. |
| Document provenance | 15 | Uploaded fact is linked to sealed/filed/served document or verified note. |
| Human verification | 10 | Solicitor has reviewed the output or source mapping. |

## Bands

| Band | Score | Meaning |
|---|---:|---|
| High | 0.85-1.00 | Can be shown as source-backed, subject to normal solicitor review. |
| Medium | 0.60-0.84 | Show answer with caution and missing-field explanation. |
| Low | 0.30-0.59 | Use as internal prompt only; do not update operational status. |
| Blocked | 0.00-0.29 | Refuse definitive answer. |

## Automatic Downgrades

- Unknown forum caps confidence at 0.59.
- Missing pinpoint caps confidence at 0.59.
- Secondary-only support caps confidence at 0.49.
- Source conflict caps confidence at 0.49 until reviewed.
- Recording or reserved-activity risk blocks publication until resolved.
