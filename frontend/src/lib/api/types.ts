// Domain types for CasePass. Shared between mock and (future) REST client.

export type MatterStatus =
  | "intake"
  | "indexed"
  | "handoff-active"
  | "in-review"
  | "closed";

export type MatterType =
  | "Commercial litigation"
  | "Employment"
  | "Real estate"
  | "Insolvency"
  | "Regulatory"
  | "Family";

export type Court =
  | "Commercial Court"
  | "High Court (KBD)"
  | "Employment Tribunal"
  | "County Court"
  | "Court of Appeal";

export type PrivilegeFlag = "none" | "client-privilege" | "work-product";

export type DocumentStatus = "indexed" | "processing" | "error";

export type Document = {
  id: string;
  matterId: string;
  filename: string;
  pages: number;
  chunks: number;
  privilege: PrivilegeFlag;
  status: DocumentStatus;
  uploadedAt: string;
};

export type Citation = { doc: string; page: number };

export type Chunk = {
  id: string;
  doc: string;
  page: number;
  excerpt: string;
};

export type ChatCitation = Citation & { chunkId: string };

export type MatterUpdate = {
  id: string;
  matterId: string;
  authorName: string;
  authorRole: "Solicitor" | "Receiving counsel" | "Firm admin";
  createdAt: string;
  whatWasDone: string;
  whatHappened: string;
  whatFollows: string;
  hearingAt?: string;
  attachments: string[];
  citations: Citation[];
};

export type CreateUpdateInput = {
  matterId: string;
  authorName: string;
  authorRole: MatterUpdate["authorRole"];
  whatWasDone: string;
  whatHappened: string;
  whatFollows: string;
  hearingAt?: string;
  attachments: string[];
};

export type ChatAnswer = {
  text: string;
  citations: ChatCitation[];
  insufficient: boolean;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  citations?: ChatCitation[];
  insufficient?: boolean;
};

export type Deadline = {
  id: string;
  label: string;
  dueAt: string;
  citation?: Citation;
  urgent?: boolean;
};

export type ReviewNote = { text: string; citation?: Citation };

export type MatterReview = {
  stage: string;
  lastEvent: ReviewNote;
  urgentIssues: ReviewNote[];
  missingDocs: string[];
  nextStep: ReviewNote;
};

export type Handoff = {
  id: string;
  caseName: string;
  matterType: MatterType;
  court: Court;
  parties: { plaintiff: string; defendant: string };
  status: MatterStatus;
  ownerId: string;
  receivingId?: string;
  createdAt: string;
  nextHearingAt?: string;
  summary: string;
  documentsCount: number;
  pagesIndexed: number;
  deadlines: Deadline[];
};

export type ListHandoffsParams = {
  search?: string;
  status?: MatterStatus | "all";
  matterType?: MatterType | "all";
  forUserId?: string;
  scope?: "mine" | "inbox" | "firm";
};

export type CreateHandoffInput = {
  caseName: string;
  matterType: MatterType;
  court: Court;
  plaintiff: string;
  defendant: string;
  nextHearingAt?: string;
  summary: string;
  files: { name: string; size: number; pages: number }[];
  ownerId: string;
};

export type DashboardKpis = {
  activeMatters: number;
  deadlinesThisWeek: number;
  pendingHandoffs: number;
  pagesIndexed: number;
};
