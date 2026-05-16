# Legal Source Citation Layer

This layer makes CasePass answers auditable. Any legal or procedural output must be traceable to an official source with a URL and pinpoint, or it must be downgraded to an uncertainty prompt.

## MVP Pipeline

| Step | Component | Output |
|---|---|---|
| 1 | Source registry | Canonical official source, domain, trust tier and citation convention. |
| 2 | Document ingestion | HTML or PDF record with version, hash and retrieval timestamp. |
| 3 | Text extraction | Page-aware PDF text and section-aware HTML text. |
| 4 | Chunking | Rule, paragraph, section, page or form-field chunks. |
| 5 | Citation resolver | Maps answer spans to source chunks and pinpoints. |
| 6 | Answer grounding | Forces chatbot and validation outputs to use retrieved Tier A or Tier B material. |
| 7 | Verification | Records confidence, forum certainty and solicitor approval. |

## Source Tiers

| Tier | Meaning | Examples | Citation status |
|---|---|---|---|
| A | Primary law or primary procedure | legislation.gov.uk, CPR, Practice Directions, official forms, court guides | Legal citation allowed. |
| B | Regulator or official guidance | SRA, BSB, Law Society, HMCTS, ICO | Guidance citation allowed. |
| C | CasePass policy or AI inference | workflow rules, schema mappings, heuristics | Must be labelled as inference. |

## Required Answer Shape

```text
Answer: [procedural answer]
Source: [authority]
Document: [document title]
URL: [canonical URL]
Pinpoint: [rule / paragraph / section / page / form field]
Excerpt: [short quote or faithful paraphrase]
Confidence: [high / medium / low]
Status: [verified primary source / regulator guidance / AI inferred - needs review / unverified]
```

## Integration Points

- Chatbot answers must cite the retrieved chunk that supports the answer.
- Metadata extraction should attach legal source IDs to rule-derived fields.
- Workflow gates should refuse final state changes when legal citations are missing.
- Solicitor approval should record the citations reviewed and any override.
- Post-action verification should link operational updates to a sealed document, filed document, transcript, attendance note or legal source.

## MVP Scope

Do not ingest the whole CPR universe during the hackathon. Start with the curated registries in `../source-registry/`, then expand as test cases demand more sources.
