import type { MatterUpdate } from "./types";

const days = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

export const MOCK_UPDATES: Record<string, MatterUpdate[]> = {
  hf_whitfield: [
    {
      id: "u_wf_1",
      matterId: "hf_whitfield",
      authorName: "Eleanor Hayes",
      authorRole: "Solicitor",
      createdAt: days(2),
      whatWasDone: "Filed reply to amended defence and bundle index update.",
      whatHappened:
        "Court accepted filing; defendant's solicitor confirmed receipt and reserved position on force-majeure annexes.",
      whatFollows:
        "Compile supplier correspondence Aug–Sep 2025; brief leading counsel by Thursday EOD.",
      hearingAt: days(-9),
      attachments: ["Reply to amended defence.pdf", "Bundle index v4.pdf"],
      citations: [{ doc: "Reply to amended defence", page: 3 }],
    },
    {
      id: "u_wf_2",
      matterId: "hf_whitfield",
      authorName: "Marcus Whitman",
      authorRole: "Receiving counsel",
      createdAt: days(6),
      whatWasDone: "Reviewed disclosure bundle and flagged three missing exhibits to opposing side.",
      whatHappened:
        "Opposing solicitor agreed to provide EX-08 and EX-11 by next Monday; EX-14 disputed.",
      whatFollows: "Application for specific disclosure if EX-14 not produced by 22 May.",
      attachments: [],
      citations: [{ doc: "Disclosure bundle — exhibits", page: 12 }],
    },
  ],
  hf_arden_employment: [
    {
      id: "u_ar_1",
      matterId: "hf_arden_employment",
      authorName: "Priya Sharma",
      authorRole: "Solicitor",
      createdAt: days(1),
      whatWasDone: "Circulated draft brief v3 to partner for sign-off.",
      whatHappened: "Partner returned minor comments on causation section.",
      whatFollows: "Finalise v4 and serve on claimant counsel by Friday.",
      attachments: ["Draft brief v3.pdf"],
      citations: [{ doc: "Draft brief v3", page: 8 }],
    },
  ],
  hf_kingsway: [
    {
      id: "u_kg_1",
      matterId: "hf_kingsway",
      authorName: "James Okafor",
      authorRole: "Receiving counsel",
      createdAt: days(3),
      whatWasDone: "Instructed independent surveyor for rent review valuation.",
      whatHappened: "Surveyor accepted appointment; site visit scheduled.",
      whatFollows: "Report due in 14 days; review against tenant's comparables.",
      hearingAt: days(-21),
      attachments: ["Surveyor instruction letter.pdf"],
      citations: [{ doc: "Surveyor instruction letter", page: 1 }],
    },
  ],
  hf_orwell_insolvency: [],
  hf_navarro_regulatory: [
    {
      id: "u_nv_1",
      matterId: "hf_navarro_regulatory",
      authorName: "Eleanor Hayes",
      authorRole: "Solicitor",
      createdAt: days(45),
      whatWasDone: "Archived file and circulated post-action note to regulatory team.",
      whatHappened: "MHRA confirmed enquiry closed; no further action.",
      whatFollows: "Retain file for 6 years per retention policy.",
      attachments: ["Post-action update.pdf", "Closure letter — MHRA.pdf"],
      citations: [{ doc: "MHRA letter 12 Dec", page: 1 }],
    },
  ],
};
