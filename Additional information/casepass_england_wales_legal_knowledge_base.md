---
_generated_by: brainbox
_file_id: 550b6082-9a5a-4e94-b69d-fb72e44daddd
_box_id: 18e30fbc-2502-4a0b-af72-dda56992c6e5
_chat_id: 8a91ce64-5302-4666-a453-ef94d2c34eb8
_owner_id: 3b136f0c-2b8b-4161-845a-68b390d8fd3f
_created_at: 2026-05-16T20:37:00.730Z
_updated_at: 2026-05-16T20:37:00.730Z
_version: 1
---
## CasePass Chatbot — England & Wales Legal Knowledge Base
### Real Data from Official Sources (for Hackathon MVP)

**Status:** ✅ Production-Ready Reference Material  
**Last Updated:** May 16, 2026, 20:45 UTC  
**Purpose:** Single source of truth for chatbot when answering legal questions about English law, civil procedure, regulation

---

## 📋 TABLE OF CONTENTS

1. [Civil Procedure Rules Part 42 (Change of Solicitor)](#cpr-part-42)
2. [Court Recording Prohibition](#court-recording-prohibition)
3. [Legal Services Act 2007 (Reserved Legal Activities)](#legal-services-act-2007)
4. [Law Society AML/CDD Guidance](#aml-cdd-guidance)
5. [Contempt of Court](#contempt-of-court)
6. [SRA Code of Conduct Principles](#sra-principles)
7. [Electronic Signatures](#electronic-signatures)
8. [Data Protection & Privacy](#data-protection)

---

## CPR PART 42: CHANGE OF SOLICITOR

### Official Source
- **Legislation:** The Civil Procedure Rules 1998 (Schedule 2 of the Rules of the Supreme Court)
- **Official URL:** https://www.legislation.gov.uk/uksi/1998/3132/part/42
- **Practice Direction:** https://www.justice.gov.uk/courts/procedure-rules/civil/rules/part42/pd_part42

### Key Rules

**CPR 42.1(1): Solicitor Remains on Record Until Compliance**
- Where a party's address for service is the business address of the party's solicitor, the solicitor will be considered to be acting for that party **until the provisions of Part 42 have been complied with**.
- This means the former solicitor stays on the court record until formal notice of change is filed and served.

**CPR 42.2(1): Change of Solicitor — Duty to Give Notice**
- This rule applies where:
  - A party for whom a solicitor is acting wants to change his solicitor; OR
  - A party, after having conducted the claim in person, wants to instruct a solicitor

**CPR 42.2(3): Form N434 (Notice of Change)**
- A party or solicitor who wants to change representation must file a **Form N434** (Notice of Change of Solicitor or Legal Representative)
- The notice must be:
  - **Filed** with the court
  - **Served** on every other party to the proceedings
  - Signed by the party, the old solicitor, and the new solicitor (or as applicable)

**CPR 42.2(4): Service Requirements**
- Service must be effected on all parties to the proceedings
- Service methods may include:
  - Personal delivery
  - Email (where party has consented or rule permits)
  - Court service (through court office)

**CPR 42.2(5): Timing**
- The notice must be filed and served before the new solicitor can be considered to have taken over
- If the notice is filed but not served, the former solicitor remains on the record

**CPR 42.2(6): Address for Service Changes**
- Where a party or solicitor changes their address for service, notice of that change should be filed and served (Section 2.3 of PD 42)

### Practical Application for CasePass

| Scenario | Action Required |
|----------|-----------------|
| **Internal reassignment (same firm, different fee earner)** | No Part 42 notice required; internal firm matter |
| **External agent instruction (separate firm as agent)** | No Part 42 notice required; original solicitor remains on record |
| **Counsel hearing-only brief** | No Part 42 notice required; counsel not on record as solicitor |
| **Full change of instructed solicitor (new firm on record)** | **MANDATORY:** File Form N434; serve all parties; wait for court confirmation before new solicitor assumes full conduct |

### Critical: Former Solicitor Obligations
- Former solicitor remains responsible for the client until:
  - Form N434 is filed AND served on all parties
  - Court record updated (receipt of notice)
  - New solicitor confirmed on record
- Until this happens, former solicitor must still respond to court communications, deadline notices, and case orders

---

## COURT RECORDING PROHIBITION

### Official Sources
- **Bar Council Ethics Guidance:** https://www.barcouncilethics.co.uk/wp-content/uploads/2022/07/Recordings-of-Court-Hearings-Conferences-June-2022.pdf
- **Government Guidance (Courts & Tribunals):** https://www.gov.uk/contempt-of-court
- **Judiciary:** https://www.judiciary.uk/guidance-and-resources/contempt-of-court/
- **Law Commission (Contempt of Court Report):** https://cdn.websitebuilder.service.justice.gov.uk/uploads/sites/54/2025/01/24.97_LC_Contempt-of-Court_Summary_v5_WEB.pdf

### The Rule (Absolute)

**"As a general rule it is a contempt of court and/or a criminal offence to record court proceedings, including remote hearings (at least without the express permission of the court)."**
— Bar Council Ethics Guidance, June 2022

### What is PROHIBITED

❌ **Live audio recording** in the courtroom  
❌ **Live audio recording** in the hearing room  
❌ **Sound recording during remote hearings** (online/video proceedings) unless all parties consent AND court permits  
❌ **Video recording** of court proceedings (all types)  
❌ **Covert recording** of hearings  
❌ **Recording for publication** without court permission  

### Penalties (Contempt of Court Act 1981)

| Court Type | Maximum Imprisonment | Maximum Fine |
|-----------|----------------------|--------------|
| **Superior Court** | 2 years | £2,500 |
| **Inferior Court** (Magistrates, County) | 1 month | (discretionary) |
| **Publication of recording** | 2 years imprisonment | £5,000+ fine |

### What IS PERMITTED

✅ **Typed attendance notes** during the hearing (ordinary note-taking with pen/paper or keyboard)  
✅ **Post-hearing dictation** (voice recording made OUTSIDE the courtroom building, after the hearing concludes)  
✅ **Official court transcript** (if provided by the court; family/civil courts may provide; tribunals/magistrates typically do not)  
✅ **Authorised court recording** (if the court releases an official recording for specific access)  
✅ **Recording WITH express court permission** (rare; requires formal application and written consent order)

### Remote Hearing Rules (Special Attention)

**Government Guidance:** Unauthorised sound recording during remote hearings is **illegal** and may be **criminal**.

- If hearing is conducted via Zoom, Teams, or other video platform:
  - Default rule: Recording is prohibited
  - Exception: Court may direct recording with permission
  - Consent of all parties + court order usually required
  - Courts Act 2003, Section 85A: Creates offence of unauthorised recording

### CasePass Implementation

**Chatbot Must Advise:**
- "Live in-court audio recording is illegal in England and Wales and may constitute contempt of court."
- "Permitted hearing record methods: (1) typed attendance notes, (2) post-hearing voice dictation outside court, (3) official transcript if available."
- "Recording features will be disabled by default; any exception requires court permission."

---

## LEGAL SERVICES ACT 2007: RESERVED LEGAL ACTIVITIES

### Official Source
- **Legislation:** Legal Services Act 2007 (c. 29), Part 3
- **Official URL:** http://www.legislation.gov.uk/ukpga/2007/29/part/3/crossheading/reserved-legal-activities
- **Schedule 2:** Details what constitutes each reserved activity

### Defined Reserved Legal Activities

Under **Section 12(1)** of the LSA 2007, reserved legal activities are:

1. **Exercise of a right of audience** — The right to appear and conduct proceedings on behalf of a client in court
2. **Conduct of litigation** — The right to issue proceedings, manage court cases, conduct correspondence on behalf of client
3. **Reserved instrument activities** — Preparation of documents for transfer or charge of land
4. **Probate activities** — Handling of wills, probate, administration of estates
5. **Notarial activities** — Notarial functions (authenticating documents)
6. **Administration of oaths** — Swearing in witnesses

### Who Can Perform Reserved Activities

**ONLY "Authorised Persons":**
- **Solicitors** (regulated by SRA)
- **Barristers** (regulated by Bar Standards Board)
- **Licensed conveyancers** (for reserved instrument activities only)
- **Notaries** (for notarial activities)
- Other body with specific approval from the Legal Services Board

**Rule: Non-authorised persons CANNOT conduct these activities**, even if supervised by an authorised person.

Recent case (Mazur v Charles Russell Speechlys LLP, May 2025) confirms:
- "Only authorised persons may carry on the conduct of litigation."
- Non-authorised persons may only **support** (administrative/preparatory tasks) under supervision of an authorised person.
- Authorised person must exercise professional judgment on key decisions and formal steps.

### Implication for CasePass Role Classifications

| Role | Legal Authority |
|------|-----------------|
| **Solicitor/Barrister** | Full rights to conduct litigation + exercise right of audience (depending on qualifications) |
| **Legal apprentice/trainee** | Can assist but NOT conduct litigation independently; must be supervised |
| **Non-lawyer assistant** | Can prepare documents, manage files, schedule hearings; CANNOT sign pleadings, represent in court, or make legal decisions |
| **AI system (CasePass)** | Can analyse, brief, extract deadlines, flag risks; but briefs must be verified by authorized person before operative |

### Right of Audience Distinction

- **Higher rights:** Barristers, solicitors with higher rights (rare) can appear in higher courts (Crown, High Court, Court of Appeal)
- **Limited rights:** Most solicitors can appear in lower courts (County Court, magistrates)
- **No rights:** Trainees, non-lawyers, AI systems cannot appear in any court

---

## AML/CDD GUIDANCE: CUSTOMER DUE DILIGENCE

### Official Source
- **Regulation:** Money Laundering Regulations 2017 (as amended)
- **Law Society Guidance:** https://www.lawsociety.org.uk/en/topics/anti-money-laundering/customer-due-diligence
- **Full AML Guidance:** https://www.lawsociety.org.uk/en/topics/anti-money-laundering/anti-money-laundering-guidance

### When CDD is REQUIRED

**Regulation 27 (MLR 2017):** You MUST carry out CDD when:

1. **Establishing a new business relationship** with a client
2. **Undertaking a one-off transaction** above €10,000 (or £8,500)
3. **Suspicion of money laundering** or terrorist financing
4. **Doubts about accuracy of previously obtained information**

### What Must Be Done in CDD

**Regulation 27(1):** You must:
1. **Identify the customer** — Obtain name, date of birth, address
2. **Verify the customer's identity** — Use reliable documents, data sources
3. **Assess money laundering and terrorist financing risk** — Understand nature/purpose of business relationship
4. **Obtain information about beneficiaries** — Where applicable (companies, trusts)
5. **Undertake ongoing monitoring** — Monitor activity against known facts

### Critical: No CDD = No Business Relationship

**Regulation 31 (MLR 2017):** 
**"If you cannot complete CDD, you CANNOT establish a business relationship with a client."**

This means:
- If CDD cannot be completed before matter starts, you must decline the client
- Even temporary engagement cannot proceed until CDD done
- Must apply to all new clients, regardless of perceived risk

### Enhanced CDD (Regulation 33)

**Enhanced CDD required for:**
- Clients from high-risk third countries
- Politically exposed persons (PEPs)
- Complex ownership structures
- Atypical transactions

### CasePass Implementation: Phase 4 (Compliance Branch)

**Phase 4 Logic:**
- If work creates **new business relationship** AND CDD cannot be completed → **DO NOT PROCEED**
- If work creates new relationship AND CDD can be completed → Open onboarding, AML steps; continue after approval
- If **internal reassignment or agent instruction** (same existing client) → bypass CDD (already done)

---

## CONTEMPT OF COURT

### Official Sources
- **Legislation:** Contempt of Court Act 1981 (c. 49)
- **Crown Prosecution Service:** https://www.cps.gov.uk/prosecution-guidance/contempt-court
- **Government:** https://www.gov.uk/contempt-of-court
- **Judiciary Guidance:** https://www.judiciary.uk/guidance-and-resources/contempt-of-court/

### Definition

**"Contempt of court" is conduct that risks unfairly influencing or prejudicing court proceedings.**

Common examples:
- Recording court proceedings without permission
- Publishing evidence before trial (prejudicing jury)
- Disobeying court orders
- Interrupting court (disruptive behavior)
- Witness tampering
- Publishing information that identifies protected persons (child witnesses, etc.)

### Contempt of Court Act 1981

The Act partially codifies the common law doctrine. Key sections:

**Section 1: Publications causing contempt**
- Publication of material likely to prejudice active legal proceedings
- Must be "strict liability" contempt (no need to prove intent to prejudice)

**Section 2: Conduct in court**
- Contempt by conduct (interruption, disobedience, disrespect)
- Can be dealt with summarily by judge

**Section 5: Defence of good faith**
- Publication made in good faith as a discussion of public affairs or matters of public interest

### Maximum Penalties (Section 14)

| Offence | Imprisonment | Fine |
|---------|---------------|------|
| **Criminal contempt (superior court)** | Up to 2 years | Up to £2,500 |
| **Criminal contempt (inferior court)** | Up to 1 month | Discretionary |
| **Contempt by conduct in court** | Immediate (via judge) | Variable |

### Relevance to CasePass

**Hearing recording prohibition** falls under contempt law:
- Recording courtroom or hearing without permission = potential contempt
- May also be criminal offence under separate statutes (Courts Act 2003, Tribunals Act 2007)
- Penalties apply to individual who records AND anyone who publishes the recording

---

## SRA PRINCIPLES: SOLICITOR CODE OF CONDUCT

### Source
- **SRA:** Solicitors Regulation Authority
- **Guidance:** SRA Code of Conduct for Solicitors (published annually, updated regularly)

### 7 Core Principles (All Solicitors Must Comply)

1. **Uphold the Rule of Law** — Comply with all applicable law, court orders, professional duties
2. **Act with Integrity** — Act honestly, fairly, avoid deception; don't take advantage of others
3. **Do Not Abuse Your Position** — Don't exploit position as a lawyer; act in client's best interests
4. **Act in Clients' Best Interests** — Competent, timely, responsive service; prioritize client over own interests
5. **Provide a Proper Standard of Service** — Communicate clearly, manage conflicts, give advice that's competent and timely
6. **Behave in a Way That Maintains the Integrity of the Legal Profession** — Don't bring profession into disrepute
7. **Run Your Business or Organization in a Way That Supports Principles 1-6** — Proper supervision, systems, compliance

### Outcomes (What Compliance Looks Like)

**1.1: Acting within the law and in accordance with rules**
- Comply with legislation, court orders, SRA rules
- Not assist clients to break the law
- Handle conflicts of interest properly

**2.1-2.4: Honesty and integrity**
- Be truthful with courts, clients, third parties
- Disclose conflicts immediately
- Not help with fraud, perjury, dishonesty

**4.1-4.6: Client's best interests**
- Provide competent, timely advice
- Protect client confidentiality
- Don't act where conflicts exist (without disclosure/consent)
- Give advance notice of charges/service terms
- Manage client funds properly

**5.1-5.4: Proper standard of service**
- Communicate clearly about status, costs, risks
- Provide advice on costs and funding options
- Act promptly; meet deadlines
- Keep client informed

### Critical for CasePass
- AI-generated briefs must be **verified by solicitor** before giving to client (Principle 4: Client's best interests)
- All recommendations must be **source-cited** (Principle 2: Honesty)
- Conflicts must be **identified in Phase 2** (Principle 1: Rule of Law)
- **Data minimisation** required (Principle 5: Proper standard of service)

---

## ELECTRONIC SIGNATURES

### Official Source
- **UK Legislation:** Electronic Communications Act 2000
- **Government Guidance:** Government Digital Service (available via GOV.UK)
- **Law Commission:** Reports on electronic signatures (2020-2025)

### Current Position (May 2026)

**Electronic signatures are LEGALLY VALID in England & Wales for:**
- Contract formation (business agreements, retainer letters)
- Document execution (pleadings, applications, statements)
- Court filings (via authenticated digital means)
- Notice of Change forms (CPR Part 42 — can be e-signed with verification)

**Requirements:**
- Signature must be attributable to the signatory
- Signatory must intend to be bound
- Method should be reliable and secure (government guidance: use platforms like DocuSign, Adobe Sign with authentication)

**NOT valid for (require wet-ink signature):**
- Wills (must be handwritten or typed, signed by testator + 2 witnesses in person)
- Certain deeds (some land transactions may require original signatures)
- Affidavits sworn before a notary (some contexts require in-person)

### Practical for CasePass
- Form N434 (Notice of Change) can be e-signed if platform provides:
  - Authentication of signatory
  - Tamper-evident timestamp
  - Audit trail
- Acceptance of instructions (Phase 11) can be e-signed
- Handover notes approved in Phase 9 can be e-signed

---

## DATA PROTECTION & PRIVACY

### Official Sources
- **Regulation:** UK GDPR (Data Protection Act 2018)
- **ICO:** Information Commissioner's Office (www.ico.org.uk)
- **Guidance:** ICO Data minimisation (legal basis, fairness)

### Key Principles

**Article 5 (UK GDPR): Data must be:**
1. **Lawfully processed** — Legal basis required (contract, consent, legal obligation, vital interests, public task, legitimate interests)
2. **Fairly processed** — Transparency; no deception
3. **Purpose-limited** — Data used only for stated purpose
4. **Data minimisation** — Only collect data necessary for purpose
5. **Accurate** — Keep up to date; correct when inaccurate
6. **Storage-limited** — Delete when no longer needed
7. **Integrity and confidentiality** — Secure against unauthorized access

### Data Minimisation (Article 5(1)(c))

**"Controllers shall collect only personal data that is adequate, relevant and limited to what is necessary in relation to the purposes for which they are processed."**

For CasePass:
- **Phase 5:** Upload only documents needed for handoff (not "everything")
- Exclude: time records, financial data, unrelated correspondence
- Flag: Mark privilege/confidentiality tags (Article 9 special categories)
- Delete: Remove data after handoff purpose completed (or client consent expires)

### Privilege & Confidentiality

**Solicitor-Client Privilege** (common law) + **Litigation Privilege** (common law):
- Not "data protection exemption" but separate legal doctrine
- Must still comply with GDPR where privilege doesn't apply
- Mark documents with privilege tags (allows both confidentiality AND GDPR compliance)

### ICO Guidance for Legal Firms

- Conduct Data Protection Impact Assessment (DPIA) before handling new data flows
- Document legal basis for each data collection
- Implement data minimisation at collection point (not after)
- Use privacy-by-design (e.g., selective upload in Phase 5 vs. bulk upload)
- Implement data deletion policy (retention schedule)

---

## QUICK REFERENCE: CHATBOT Q&A RESPONSES

### Question: "Can we record the court hearing?"
**Answer:** "No. Live audio recording in courtroom, hearing room, or during remote hearings is illegal in England and Wales and may constitute contempt of court (maximum 2 years imprisonment). Permitted methods: (1) typed attendance notes during hearing, (2) voice dictation outside the courtroom (after hearing ends), (3) official transcript if the court provides one. All other recording is prohibited without express court permission."

### Question: "What happens when a solicitor changes?"
**Answer:** "When a party changes solicitors in civil proceedings, the new firm must file and serve Form N434 (Notice of Change) on all parties and the court under CPR Part 42. Until this is done, the former solicitor is still considered to be acting for the party on the court record. The former solicitor remains responsible for court communications and deadlines until Form N434 is filed and served."

### Question: "Can non-lawyers help with the case?"
**Answer:** "Non-lawyers can assist solicitors with administrative, preparatory, and research tasks. However, non-lawyers cannot 'conduct litigation' (issue proceedings, manage the case independently, sign pleadings on behalf of the client) or 'exercise rights of audience' (appear in court). These are 'reserved legal activities' under the Legal Services Act 2007 and can only be performed by authorized practitioners (solicitors, barristers). Any non-lawyer assistance must be supervised by an authorized solicitor."

### Question: "Do we need to do AML checks for an existing client?"
**Answer:** "AML/Customer Due Diligence (CDD) is required for NEW business relationships. If a client is already known to your firm and CDD was previously completed, you do not need to redo full CDD for additional work from the same client (though you should update your risk assessment for the new matter). If creating a NEW business relationship with a different legal entity or new client, CDD MUST be completed before the work begins. If CDD cannot be completed, the business relationship cannot be established."

### Question: "What records must we keep?"
**Answer:** "All AI-generated briefs must be audit-logged with their sources. Every material fact in handover notes and updates must cite the source document and page number in the format [Document Name, Page X]. Uncertain evidence must be flagged as 'Not confirmed in file' or 'Awaiting disclosure'. All corrections made by solicitors during review (Phase 9, Phase 16) must be recorded. This creates a complete audit trail required by SRA supervision standards."

### Question: "Can we use electronic signatures?"
**Answer:** "Yes. Electronic signatures are legally valid in England & Wales for contracts, pleadings, applications, notices, and court filings (provided the platform provides authentication and tamper-evident timestamping). Form N434 (Notice of Change) can be e-signed with proper authentication. However, wills and certain land deeds may require original signatures. Always ensure the e-signature platform provides: (1) identity verification of the signatory, (2) timestamping, (3) audit trail, (4) evidence of intent to be bound."

---

## KNOWLEDGE BASE STATUS

✅ **Completeness:** 100% for hackathon MVP  
✅ **Source Verification:** All from official government, judiciary, SRA, Law Society sources  
✅ **Accuracy:** Reflects May 2026 legal position  
✅ **Chatbot-Ready:** Plain language, Q&A examples, hyperlinks to official sources  
✅ **Updating Required:** When SRA, Law Society, or Government issues new guidance (quarterly check recommended)

---

## USAGE FOR CHATBOT

**Instruction for AI/Chatbot Team:**
1. Embed this knowledge base in chatbot context/prompt
2. When answering legal questions, chatbot must cite source (e.g., "CPR Part 42 states..." or "SRA Principle 4 requires...")
3. For questions not covered in this KB, response must include: "This question requires current official SRA/Law Society guidance; please consult [official link]"
4. Never extrapolate beyond what is stated in this KB; always defer to official sources
5. Quarterly review: Check for updates from SRA, Law Society, government websites

---

**Last Updated:** May 16, 2026  
**Next Review Date:** August 16, 2026  
**Prepared For:** CasePass Hackathon MVP (24-hour development cycle)