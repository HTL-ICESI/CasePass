import type { Document, MatterReview } from "./types";

export const MOCK_REVIEWS: Record<string, MatterReview> = {
  hf_whitfield: {
    stage: "Pre-trial — exhibits outstanding",
    lastEvent: {
      text: "Defendant served amended particulars relying on force-majeure (cl. 14.2 SPA).",
      citation: { doc: "Amended defence", page: 7 },
    },
    urgentIssues: [
      {
        text: "Three exhibits (EX-08, EX-11, EX-14) remain unfiled against the disclosure order.",
        citation: { doc: "Directions", page: 2 },
      },
      {
        text: "Force-majeure notice dated 11 Aug 2025 — supplier correspondence not in bundle.",
        citation: { doc: "Defence bundle", page: 41 },
      },
    ],
    missingDocs: [
      "Supplier correspondence Aug–Sep 2025",
      "Board minutes ratifying performance notice",
    ],
    nextStep: {
      text: "File outstanding exhibits before pre-trial review on Friday; brief leading counsel on force-majeure reply.",
      citation: { doc: "Order", page: 3 },
    },
  },
  hf_arden_employment: {
    stage: "Disclosure complete — brief ready for sign-off",
    lastEvent: {
      text: "Respondent's grounds of resistance filed; restructuring rationale relies on Q2 board paper.",
      citation: { doc: "ET3", page: 4 },
    },
    urgentIssues: [
      {
        text: "Witness statement of HR Director still in draft; exchange in 24 days.",
      },
    ],
    missingDocs: ["Final HR Director witness statement", "Selection matrix scoring sheet"],
    nextStep: {
      text: "Partner sign-off on draft brief; circulate to claimant counsel.",
      citation: { doc: "Brief draft v3", page: 1 },
    },
  },
  hf_kingsway: {
    stage: "Receiving counsel reviewing brief",
    lastEvent: {
      text: "Tenant served counter-notice under s.26 of the 1954 Act disputing rent review.",
      citation: { doc: "Counter-notice", page: 1 },
    },
    urgentIssues: [
      {
        text: "Surveyor instruction overdue; report needed before counter-notice deadline.",
        citation: { doc: "File note 14 Mar", page: 1 },
      },
    ],
    missingDocs: ["Independent surveyor valuation", "Schedule of comparables"],
    nextStep: {
      text: "Confirm surveyor appointment and confirm strategy on rent review mechanism.",
    },
  },
  hf_orwell_insolvency: {
    stage: "Intake — indexing in progress",
    lastEvent: {
      text: "Administrators appointed 7 Apr; statement of affairs being compiled.",
      citation: { doc: "Notice of appointment", page: 1 },
    },
    urgentIssues: [
      {
        text: "Para 49 statement of proposals due within 8 weeks — drafting not yet started.",
      },
    ],
    missingDocs: ["Audited accounts FY24", "Schedule of secured creditors"],
    nextStep: {
      text: "Complete document indexing and circulate first draft of proposals.",
    },
  },
  hf_navarro_regulatory: {
    stage: "Closed — undertakings filed",
    lastEvent: {
      text: "MHRA confirmed enquiry closed on receipt of executed undertakings.",
      citation: { doc: "MHRA letter 12 Dec", page: 1 },
    },
    urgentIssues: [],
    missingDocs: [],
    nextStep: {
      text: "Archive brief and post-action update for regulatory team reference.",
    },
  },
};

function makeDocs(matterId: string, defs: Array<Partial<Document> & { filename: string; pages: number }>): Document[] {
  return defs.map((d, i) => ({
    id: `${matterId}_doc_${i + 1}`,
    matterId,
    filename: d.filename,
    pages: d.pages,
    chunks: d.chunks ?? Math.max(4, Math.round(d.pages / 3)),
    privilege: d.privilege ?? "none",
    status: d.status ?? "indexed",
    uploadedAt: d.uploadedAt ?? new Date().toISOString(),
  }));
}

export const MOCK_DOCUMENTS: Record<string, Document[]> = {
  hf_whitfield: makeDocs("hf_whitfield", [
    { filename: "SPA — executed 14 Sep 2025.pdf", pages: 42 },
    { filename: "Particulars of claim.pdf", pages: 18 },
    { filename: "Amended defence.pdf", pages: 22 },
    { filename: "Directions order — Comm. Ct.pdf", pages: 6, privilege: "none" },
    { filename: "Disclosure bundle — exhibits.pdf", pages: 64 },
    { filename: "Counsel's advice — force majeure.pdf", pages: 14, privilege: "work-product" },
    { filename: "Client briefing note.pdf", pages: 8, privilege: "client-privilege" },
    { filename: "Witness statement — CFO.pdf", pages: 10 },
  ]),
  hf_arden_employment: makeDocs("hf_arden_employment", [
    { filename: "ET1 claim form.pdf", pages: 9 },
    { filename: "ET3 response.pdf", pages: 11 },
    { filename: "Selection matrix.pdf", pages: 4 },
    { filename: "Q2 board paper.pdf", pages: 18, privilege: "client-privilege" },
    { filename: "Restructuring announcement.pdf", pages: 3 },
    { filename: "Draft brief v3.pdf", pages: 28, privilege: "work-product" },
    { filename: "HR director WS — DRAFT.pdf", pages: 7, status: "processing" },
  ]),
  hf_kingsway: makeDocs("hf_kingsway", [
    { filename: "Lease — 2009 (counterpart).pdf", pages: 86 },
    { filename: "Section 25 notice.pdf", pages: 2 },
    { filename: "Counter-notice — tenant.pdf", pages: 3 },
    { filename: "Rent review correspondence.pdf", pages: 41 },
    { filename: "Surveyor instruction letter.pdf", pages: 4 },
    { filename: "Schedule of comparables — DRAFT.pdf", pages: 12, status: "processing" },
    { filename: "Title pack.pdf", pages: 92 },
    { filename: "Tenant accounts (last 3yr).pdf", pages: 72 },
  ]),
  hf_orwell_insolvency: makeDocs("hf_orwell_insolvency", [
    { filename: "Notice of appointment.pdf", pages: 2 },
    { filename: "Statement of affairs — draft.pdf", pages: 14, status: "processing" },
    { filename: "Pleadings bundle 1.pdf", pages: 9 },
    { filename: "Pleadings bundle 2.pdf", pages: 11, status: "processing" },
    { filename: "Creditor schedule (partial).pdf", pages: 5, status: "error" },
  ]),
  hf_navarro_regulatory: makeDocs("hf_navarro_regulatory", [
    { filename: "MHRA enquiry letter.pdf", pages: 6 },
    { filename: "Executed undertakings.pdf", pages: 12, privilege: "client-privilege" },
    { filename: "Internal investigation report.pdf", pages: 88, privilege: "work-product" },
    { filename: "Closure letter — MHRA.pdf", pages: 2 },
    { filename: "Post-action update.pdf", pages: 18 },
  ]),
};
