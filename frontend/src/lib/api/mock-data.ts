import type { Handoff } from "./types";

// Stable demo dataset. All IDs are deterministic so they survive reloads.

const NOW = new Date("2026-04-08T09:00:00.000Z").getTime();
const days = (n: number) => new Date(NOW + n * 86_400_000).toISOString();

export const MOCK_HANDOFFS: Handoff[] = [
  {
    id: "hf_whitfield",
    caseName: "Whitfield v. Marrow Holdings",
    matterType: "Commercial litigation",
    court: "Commercial Court",
    parties: { plaintiff: "Whitfield Industries Ltd", defendant: "Marrow Holdings plc" },
    status: "handoff-active",
    ownerId: "usr_solicitor",
    receivingId: "usr_receiving",
    createdAt: days(-21),
    nextHearingAt: days(6),
    summary:
      "Plaintiff seeks specific performance on the September SPA; defence relies on a force-majeure clause invoked 11 Aug 2025.",
    documentsCount: 12,
    pagesIndexed: 184,
    deadlines: [
      { id: "d1", label: "Exhibit disclosure (3 outstanding)", dueAt: days(2), urgent: true, citation: { doc: "Directions", page: 2 } },
      { id: "d2", label: "Pre-trial review", dueAt: days(4), citation: { doc: "Order", page: 3 } },
      { id: "d3", label: "Trial — Commercial Court", dueAt: days(6), citation: { doc: "Order", page: 3 } },
    ],
  },
  {
    id: "hf_arden_employment",
    caseName: "Arden v. Polaris Logistics",
    matterType: "Employment",
    court: "Employment Tribunal",
    parties: { plaintiff: "Sarah Arden", defendant: "Polaris Logistics Ltd" },
    status: "indexed",
    ownerId: "usr_solicitor",
    createdAt: days(-9),
    nextHearingAt: days(34),
    summary:
      "Unfair dismissal claim following restructuring. Disclosure bundle indexed; brief ready for partner sign-off.",
    documentsCount: 7,
    pagesIndexed: 96,
    deadlines: [
      { id: "d1", label: "ET3 response", dueAt: days(11) },
      { id: "d2", label: "Witness statements exchange", dueAt: days(24), urgent: true },
    ],
  },
  {
    id: "hf_kingsway",
    caseName: "Kingsway Estates — lease renewal",
    matterType: "Real estate",
    court: "County Court",
    parties: { plaintiff: "Kingsway Estates LLP", defendant: "Halberd Retail Ltd" },
    status: "in-review",
    ownerId: "usr_solicitor",
    receivingId: "usr_receiving",
    createdAt: days(-40),
    nextHearingAt: days(19),
    summary:
      "Contested lease renewal under the 1954 Act; tenant disputes the rent review mechanism. Receiving counsel reviewing brief.",
    documentsCount: 18,
    pagesIndexed: 312,
    deadlines: [
      { id: "d1", label: "Surveyor report due", dueAt: days(5), urgent: true },
      { id: "d2", label: "Counter-notice deadline", dueAt: days(12) },
    ],
  },
  {
    id: "hf_orwell_insolvency",
    caseName: "Re Orwell Foods Ltd (in administration)",
    matterType: "Insolvency",
    court: "High Court (KBD)",
    parties: { plaintiff: "Joint administrators", defendant: "—" },
    status: "intake",
    ownerId: "usr_solicitor",
    createdAt: days(-1),
    summary:
      "Fresh file. Indexing 4 pleading bundles and 2 statements of affairs; brief drafting in progress.",
    documentsCount: 9,
    pagesIndexed: 41,
    deadlines: [
      { id: "d1", label: "Statement of proposals (para 49)", dueAt: days(7), urgent: true },
    ],
  },
  {
    id: "hf_navarro_regulatory",
    caseName: "Navarro Pharma — MHRA enquiry",
    matterType: "Regulatory",
    court: "High Court (KBD)",
    parties: { plaintiff: "MHRA", defendant: "Navarro Pharma Ltd" },
    status: "closed",
    ownerId: "usr_solicitor",
    receivingId: "usr_receiving",
    createdAt: days(-120),
    summary:
      "Enquiry closed with undertakings. Final brief and post-action update archived for the firm's regulatory team.",
    documentsCount: 22,
    pagesIndexed: 488,
    deadlines: [],
  },
];
