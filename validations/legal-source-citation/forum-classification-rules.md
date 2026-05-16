# Forum Classification Rules

The citation layer depends on forum classification. A source-backed answer is still unsafe if the wrong ruleset was selected.

## Classification Order

1. Detect court or tribunal name from uploaded documents.
2. Detect form code, claim number pattern, chamber/list or division.
3. Detect procedural route: Part 7, Part 8, application, appeal, tribunal claim or response.
4. Detect specialist overlay: BPC, Commercial Court, TCC, Chancery, KBD or tribunal chamber.
5. Select source pack from `../source-registry/`.

## Route Rules

| Indicator | Route |
|---|---|
| N1, CPR Part 7 language, County Court civil claim | CPR civil courts source pack. |
| BPC, Commercial Court, TCC, Chancery, Part 57A | CPR plus BPC/specialist guide source pack. |
| Employment Tribunal, ET1, ET3, FTT, UT, chamber | Tribunal source pack; do not default to CPR. |
| N161 or permission to appeal | CPR Part 52 appeal source pack. |
| N164 | Small-claims-track appeal archetype; not respondent notice. |
| N434 or notice of change | CPR Part 42 representation source pack. |

## Blocking Conditions

- If `forum_uncertain=true`, the chatbot may only ask classification questions.
- If `ruleset_mismatch_risk=true`, do not compute deadlines.
- If a form code conflicts with the forum, require solicitor review.
