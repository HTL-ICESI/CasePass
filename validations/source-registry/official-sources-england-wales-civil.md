# Official Sources Registry - England and Wales Civil MVP

This registry translates the research source table into an implementation starter pack. It intentionally prefers official sources over blogs or law-firm commentary.

## Domain Allowlist

| Domain | Use |
|---|---|
| `legislation.gov.uk` | Statutes and statutory instruments. |
| `justice.gov.uk` | CPR, Practice Directions and procedure rules. |
| `gov.uk` | HMCTS forms, court guidance and tribunal pages. |
| `judiciary.uk` | Court guides, tribunal information and judicial guidance. |
| `sra.org.uk` | Solicitor and firm conduct, AML and AI guidance. |
| `barstandardsboard.org.uk` | Barrister conduct and conducting litigation guidance. |
| `lawsociety.org.uk` | Law Society guidance and public role explainers. |
| `ico.org.uk` | UK GDPR, data minimisation, lawful basis and AI data protection guidance. |

## Starter Source Families

| Family | Sources | Workflow coverage |
|---|---|---|
| CPR core | Parts 6, 7, 10, 15, 16, 23, 24, 25, 26, 30, 31, 32, 35, 39, 40, 42, 44, 52 | Issue, service, response, applications, allocation, disclosure, evidence, hearings, orders, representation, costs, appeals. |
| Practice directions | PD 23A, PD 31B, PD 42, PD 57AD, PD 57AC, PD 52A-52E | Application workflow, e-disclosure, change of solicitor, BPC disclosure/witnesses, appeals. |
| Forms | N1, N9, N9B, N170, N180, N181, N244, N434, N164 | Document recognition, extraction and workflow classification. |
| Specialist courts | Part 57A, PD 57AA, Commercial Court Guide, TCC Guide | BPC and specialist list classification. |
| Recording and hearings | CPR Part 39, Courts Act 2003 ss.85A-85B, HMCTS media guidance | Hearing note workflow, no-recording guardrail. |
| Representation | Legal Services Act 2007 s.12, CPR Part 42, PD 42, BSB guidance, Law Society role guidance | Solicitor-on-record, advocate-only, conduct of litigation, rights of audience. |
| Compliance | SRA Principles, SRA Codes, confidentiality/conflicts/supervision guidance, MLR 2017 regs.27/31, LSAG AML, ICO guidance | Clearance, CDD, confidentiality, data minimisation, solicitor review. |

## Known Corrections

- Do not model `N164` as a respondent's notice. The research identifies it as the small-claims-track appeal form in the official County Court forms collection. Respondent-side appeal logic should be linked to CPR 52.13.

## Open Gaps Before Production

- Add line-level source chunks for CPR Parts 1 and 2.
- Add official N161 publication source and extraction fields.
- Add official EX107 transcript request source and extraction fields.
- Add Form N260 and N265 publication pages and current PDF fields.
- Add a First-tier Tribunal source pack before tribunal test cases are treated as production-ready.
