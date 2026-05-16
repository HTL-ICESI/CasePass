# Test Documents

This folder defines the public document archetypes CasePass should recognize before production test cases are built. It does not store live client files.

## MVP Purpose

- Build deterministic document classifiers.
- Attach each classifier to an official source or form registry entry.
- Test extraction of metadata fields used by `../metadata-schema/`.
- Avoid relying on private or invented documents during the hackathon.

## Source Rule

Use official HMCTS, CPR, GOV.UK, legislation or regulator sources wherever possible. If a sample is synthetic, label it as synthetic and keep the official form or rule citation attached.

## First Archetypes

- N1 claim form.
- N9 acknowledgment of service / response pack.
- N9B defence and counterclaim.
- N170 pre-trial checklist.
- N180 small claims directions questionnaire.
- N181 fast/intermediate/multi-track directions questionnaire.
- N244 application notice.
- N434 notice of change of solicitor.
- N164 small-claims-track appeal form.

## Key Correction

N164 is not the respondent's notice for ordinary respondent-side appeal logic. Treat N164 as the small-claims-track appeal form. Respondent notices should be routed through CPR 52.13 until an official respondent-notice form/source is added.
