import type { Chunk, ChatAnswer } from "./types";

// A small library of citable chunks per matter, plus canned answers
// for the demo prompt examples. Anything outside the keyword map
// returns "Insufficient evidence in the file" — by design.

type AnswerRule = {
  match: RegExp;
  text: string;
  citationKeys: string[]; // chunk ids
};

type MatterChat = {
  chunks: Chunk[];
  rules: AnswerRule[];
  suggested: string[];
};

const WHITFIELD: MatterChat = {
  chunks: [
    {
      id: "wf_c1",
      doc: "SPA — executed 14 Sep 2025",
      page: 23,
      excerpt:
        "Clause 14.2 — Force majeure. Neither party shall be liable for any failure or delay in performance caused by events beyond its reasonable control, provided written notice is served within seven (7) business days of the triggering event.",
    },
    {
      id: "wf_c2",
      doc: "Amended defence",
      page: 7,
      excerpt:
        "The Defendant served a force-majeure notice dated 11 August 2025, invoking clause 14.2 of the SPA in respect of supplier disruption affecting the September delivery window.",
    },
    {
      id: "wf_c3",
      doc: "Directions",
      page: 2,
      excerpt:
        "Disclosure of all exhibits identified in the agreed schedule shall be completed no later than seven (7) clear days before the pre-trial review. Exhibits EX-08, EX-11 and EX-14 remain outstanding as at the date of this order.",
    },
    {
      id: "wf_c4",
      doc: "Order",
      page: 3,
      excerpt:
        "The matter is listed for pre-trial review on Friday and for trial in the Commercial Court on the following Wednesday before His Honour Judge Aldridge.",
    },
    {
      id: "wf_c5",
      doc: "Particulars of claim",
      page: 4,
      excerpt:
        "The Claimant seeks specific performance of the SPA dated 14 September 2025, and in the alternative damages to be assessed.",
    },
  ],
  rules: [
    {
      match: /force[- ]?majeure|fm notice|clause 14/i,
      text: "The defence relies on clause 14.2 of the SPA, which requires written notice within seven business days. A force-majeure notice dated 11 August 2025 was served accordingly, citing supplier disruption.",
      citationKeys: ["wf_c1", "wf_c2"],
    },
    {
      match: /deadline|exhibit|disclosure|hearing|trial|pre[- ]?trial/i,
      text: "Three exhibits (EX-08, EX-11, EX-14) remain outstanding under the disclosure order. Pre-trial review is listed for Friday with trial the following Wednesday in the Commercial Court.",
      citationKeys: ["wf_c3", "wf_c4"],
    },
    {
      match: /relief|claim|specific performance|damages/i,
      text: "The Claimant seeks specific performance of the SPA executed 14 September 2025 and, in the alternative, damages to be assessed.",
      citationKeys: ["wf_c5"],
    },
  ],
  suggested: [
    "What is the defendant's force-majeure case?",
    "What are the outstanding deadlines?",
    "What relief is the claimant seeking?",
  ],
};

const ARDEN: MatterChat = {
  chunks: [
    {
      id: "ar_c1",
      doc: "ET3",
      page: 4,
      excerpt:
        "The Respondent relied on the Q2 board paper approving a firm-wide restructuring of operational roles, which required the discontinuation of two regional supervisor positions including the Claimant's.",
    },
    {
      id: "ar_c2",
      doc: "Selection matrix",
      page: 2,
      excerpt:
        "Scoring criteria: performance (40%), skills (25%), attendance (15%), discipline (10%), length of service (10%). Claimant scored 62/100 — second lowest of the pool of four.",
    },
    {
      id: "ar_c3",
      doc: "Q2 board paper",
      page: 9,
      excerpt:
        "The board approved the restructuring on 14 May 2025 and directed HR to consult affected employees within 30 days.",
    },
  ],
  rules: [
    {
      match: /reason|restructur|dismiss|why/i,
      text: "Dismissal is pleaded as redundancy arising from a board-approved restructuring of regional supervisor roles. Selection used a weighted matrix on which the Claimant scored 62/100.",
      citationKeys: ["ar_c1", "ar_c2", "ar_c3"],
    },
    {
      match: /matrix|scor|selection|criteria/i,
      text: "The selection matrix weighted performance (40%), skills (25%), attendance (15%), discipline (10%) and length of service (10%). The Claimant scored 62/100.",
      citationKeys: ["ar_c2"],
    },
  ],
  suggested: [
    "Why was the claimant dismissed?",
    "What does the selection matrix say?",
    "Was there a settlement offer?",
  ],
};

const KINGSWAY: MatterChat = {
  chunks: [
    {
      id: "ks_c1",
      doc: "Counter-notice",
      page: 1,
      excerpt:
        "The Tenant disputes the rent review mechanism under clause 8 of the 2009 lease and serves counter-notice under section 26 of the Landlord and Tenant Act 1954.",
    },
    {
      id: "ks_c2",
      doc: "Lease — 2009 (counterpart)",
      page: 41,
      excerpt:
        "Clause 8 — Rent review. The reviewed rent shall be the higher of (a) the rent immediately before the review date and (b) the open market rent agreed between the parties or determined by an independent surveyor.",
    },
  ],
  rules: [
    {
      match: /rent review|clause 8|mechanism|surveyor/i,
      text: "Clause 8 of the lease provides an upwards-only review to the higher of the existing rent or open-market rent, with surveyor determination on disagreement. The tenant disputes the mechanism in the counter-notice.",
      citationKeys: ["ks_c1", "ks_c2"],
    },
  ],
  suggested: [
    "What is the rent review mechanism?",
    "When was the counter-notice served?",
    "Has the surveyor been instructed?",
  ],
};

const EMPTY: MatterChat = {
  chunks: [],
  rules: [],
  suggested: ["What is the current status?", "What are the next deadlines?"],
};

export const MOCK_CHAT: Record<string, MatterChat> = {
  hf_whitfield: WHITFIELD,
  hf_arden_employment: ARDEN,
  hf_kingsway: KINGSWAY,
};

export function answerForMatter(handoffId: string, question: string): ChatAnswer {
  const m = MOCK_CHAT[handoffId] ?? EMPTY;
  const rule = m.rules.find((r) => r.match.test(question));
  if (!rule) {
    return {
      text: "Insufficient evidence in the file to answer that confidently. Try asking about deadlines, the defence relied on, or the relief sought — or upload the missing source documents.",
      citations: [],
      insufficient: true,
    };
  }
  const chunks = rule.citationKeys
    .map((id) => m.chunks.find((c) => c.id === id))
    .filter((c): c is Chunk => Boolean(c));
  return {
    text: rule.text,
    citations: chunks.map((c) => ({ chunkId: c.id, doc: c.doc, page: c.page })),
    insufficient: false,
  };
}

export function chunksForMatter(handoffId: string): Chunk[] {
  return (MOCK_CHAT[handoffId] ?? EMPTY).chunks;
}

export function suggestedForMatter(handoffId: string): string[] {
  return (MOCK_CHAT[handoffId] ?? EMPTY).suggested;
}
