# Extraction Checklist

Use this checklist when testing document recognition or designing synthetic case files.

## Before Extraction

- Confirm forum: County Court, High Court, Civil Division appeal or tribunal.
- Confirm document source: official form, sealed court document, party document, internal note or synthetic sample.
- Attach source registry ID when the document is an official form or rule-derived artifact.

## During Extraction

- Capture page and field label for forms.
- Capture rule or paragraph locator for legal-rule answers.
- Separate court-record facts from internal notes.
- Store `unknown` for missing legal facts instead of guessing.

## After Extraction

- Set risk flags for missing source, unknown forum, track uncertainty, Part 42 uncertainty and recording risk.
- Require solicitor verification before handoff pack release.
- Require second human verification before post-action updates change operational matter status.

## Must-Pass Tests

- JSON source registries parse successfully.
- No document label maps N164 to respondent notice.
- All legal answer templates require source, URL and pinpoint.
- No hearing-note workflow permits live recording.
