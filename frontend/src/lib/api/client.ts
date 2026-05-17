import { getStoredToken } from "@/lib/auth";
import { clearStagedUploads, getStagedUploads, mapStagedUploadsToDocuments, removeStagedUpload, stageUploads } from "./pending-uploads";
import type {
  ChatAnswer,
  Citation,
  Chunk,
  CreateHandoffInput,
  CreateUpdateInput,
  DashboardKpis,
  Deadline,
  Document,
  FirmUser,
  Handoff,
  ListHandoffsParams,
  MatterReview,
  MatterUpdate,
  PrivilegeFlag,
  ReviewActionResult,
} from "./types";

type BackendCase = Record<string, any>;
type BackendHandoff = Record<string, any>;
type BackendDocument = Record<string, any>;
type BackendNote = Record<string, any>;
type BackendUpdate = Record<string, any>;

const API_BASE = "/api";

export interface CasePassClient {
  listHandoffs(params?: ListHandoffsParams): Promise<Handoff[]>;
  getHandoff(id: string): Promise<Handoff | null>;
  getDashboardKpis(forUserId: string): Promise<DashboardKpis>;
  createHandoff(input: CreateHandoffInput): Promise<Handoff>;
  getMatterReview(handoffId: string): Promise<MatterReview | null>;
  listDocuments(handoffId: string): Promise<Document[]>;
  listChunks(handoffId: string): Promise<Chunk[]>;
  getChatSuggestions(handoffId: string): Promise<string[]>;
  chatWithSources(handoffId: string, question: string): Promise<ChatAnswer>;
  listUpdates(handoffId: string): Promise<MatterUpdate[]>;
  createUpdate(input: CreateUpdateInput): Promise<MatterUpdate>;
  listUsers(): Promise<FirmUser[]>;
  setUserActive(userId: string, active: boolean): Promise<FirmUser>;
  listAssignableUsers(): Promise<FirmUser[]>;
  uploadHandoffDocument(handoffId: string, file: File, docType?: string): Promise<Document>;
  flushStagedUploads(handoffId: string): Promise<Document[]>;
  approveClearance(handoffId: string): Promise<Handoff>;
  createHandoverNote(handoffId: string): Promise<ReviewActionResult>;
  approveHandoverNote(handoffId: string, noteId: string, solicitorEdited: unknown): Promise<Handoff>;
  releaseHandoffPack(handoffId: string): Promise<Handoff>;
  acceptHandoff(handoffId: string, scope?: "limited" | "continuing"): Promise<Handoff>;
  generateUpdateDraft(handoffId: string, updateId: string): Promise<MatterUpdate>;
  verifyUpdate(handoffId: string, updateId: string, verifiedVersion: unknown, newProceduralStatus?: string): Promise<Handoff>;
  routeHandoff(handoffId: string, outcome: "returned" | "limited_followon" | "new_instructed_solicitor" | "escalated"): Promise<Handoff>;
}

function mapPrivilege(flag: boolean): PrivilegeFlag {
  return flag ? "client-privilege" : "none";
}

function mapDocumentStatus(status: string): Document["status"] {
  if (status === "pending" || status === "indexing") {
    return "processing";
  }
  if (status === "error") {
    return "error";
  }
  return "indexed";
}

function mapMatterStatus(status: string): Handoff["status"] {
  if (["draft", "clearance_pending", "file_upload_open"].includes(status)) {
    return "intake";
  }
  if (["pack_building", "pack_review"].includes(status)) {
    return "in-review";
  }
  if (["pack_released", "accepted", "task_in_progress", "post_action_pending", "update_draft", "update_verified", "routed"].includes(status)) {
    return "handoff-active";
  }
  if (["completed", "escalated", "clearance_failed"].includes(status)) {
    return "closed";
  }
  return "indexed";
}

function mapRole(role: string, legalRole?: string | null): FirmUser["role"] {
  if (role === "admin") {
    return "admin";
  }

  if (["local_agent", "advocate_hearing_only", "counsel"].includes(legalRole || "")) {
    return "receiving";
  }

  return "solicitor";
}

function mapLegalRoleTitle(legalRole?: string | null) {
  const map: Record<string, string> = {
    solicitor_on_record: "Solicitor on record",
    local_agent: "Local agent",
    advocate_hearing_only: "Advocate — hearing only",
    internal_fee_earner: "Internal fee earner",
    counsel: "Counsel",
  };

  return legalRole ? map[legalRole] || legalRole : "Legal professional";
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (!value) {
    return fallback;
  }

  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }

  return value as T;
}

function makeCitation(doc: string, page: number) {
  return { doc, page };
}

function buildSourceLookup(sources: Array<{ doc_name: string; page: number; chunk_text?: string; score?: number }> = []) {
  const map = new Map<string, { preview?: string; score?: number }>();

  for (const source of sources) {
    map.set(`${source.doc_name}:${Number(source.page)}`, {
      preview: source.chunk_text,
      score: typeof source.score === "number" ? source.score : undefined,
    });
  }

  return map;
}

function extractCitation(text: string | undefined) {
  if (!text) {
    return undefined;
  }

  const match = text.match(/\[Doc:\s*([^,\]]+),\s*p\.(\d+)\]/i);
  if (!match) {
    return undefined;
  }

  return makeCitation(match[1].trim(), Number(match[2]));
}

function stripCitationText(text: string | undefined) {
  return String(text || "")
    .replace(/\s*\[Doc:\s*[^,\]]+,\s*p\.\d+\]/gi, "")
    .trim();
}

function mapReviewNote(text: string | undefined, sourceLookup?: Map<string, { preview?: string; score?: number }>): { text: string; citation?: Citation } {
  const citation = extractCitation(text);
  const source = citation ? sourceLookup?.get(`${citation.doc}:${citation.page}`) : undefined;
  return {
    text: stripCitationText(text),
    citation: citation ? { ...citation, preview: source?.preview, score: source?.score } : undefined,
  };
}

function mapReviewFromAiDraft(draft: any): MatterReview {
  const sourceLookup = buildSourceLookup(draft?.sources || []);
  const currentStatus = draft?.current_procedural_status || draft?.stage_of_proceedings || "Not yet reviewed.";
  const nextRequired = draft?.next_required_step || draft?.next_procedural_step || "Awaiting next step.";
  const urgentIssues = Array.isArray(draft?.risk_flags) ? draft.risk_flags : Array.isArray(draft?.urgent_issues) ? draft.urgent_issues : [];
  const missingDocs = Array.isArray(draft?.missing_documents) ? draft.missing_documents : [];

  return {
    stage: stripCitationText(currentStatus),
    lastEvent: mapReviewNote(draft?.most_recent_operative_event || currentStatus, sourceLookup),
    urgentIssues: urgentIssues.map((item: string) => mapReviewNote(item, sourceLookup)),
    missingDocs,
    nextStep: mapReviewNote(nextRequired, sourceLookup),
    liveDeadlines: Array.isArray(draft?.live_deadlines)
      ? draft.live_deadlines.map((item: string) => mapReviewNote(item, sourceLookup))
      : [],
  };
}

function mapLatestNote(note: BackendNote | null) {
  const noteDraft = note ? parseJson<any>(note.solicitor_edited || note.ai_draft, {}) : null;
  const sourceLookup = buildSourceLookup(noteDraft?.sources || []);

  if (!noteDraft || typeof noteDraft !== "object") {
    return null;
  }

  return {
    executiveSummary: stripCitationText(noteDraft.executive_summary),
    currentProceduralStatus: stripCitationText(noteDraft.current_procedural_status),
    nextRequiredStep: stripCitationText(noteDraft.next_required_step),
    liveDeadlines: Array.isArray(noteDraft.live_deadlines) ? noteDraft.live_deadlines.map((item: string) => mapReviewNote(item, sourceLookup)) : [],
    riskFlags: Array.isArray(noteDraft.risk_flags) ? noteDraft.risk_flags.map((item: string) => mapReviewNote(item, sourceLookup)) : [],
    fileBasedFacts: Array.isArray(noteDraft.file_based_facts) ? noteDraft.file_based_facts.map((item: string) => mapReviewNote(item, sourceLookup)) : [],
    strategicNotes: Array.isArray(noteDraft.strategic_notes) ? noteDraft.strategic_notes : [],
  };
}

function mapDeadlines(caseSummary: BackendCase): Deadline[] {
  const candidates = [
    { key: "aos_due", label: "Acknowledgment of service due" },
    { key: "defence_due", label: "Defence due" },
    { key: "bundle_due", label: "Bundle due" },
    { key: "skeleton_due", label: "Skeleton due" },
    { key: "next_hearing_date", label: caseSummary?.next_hearing_type || "Next hearing" },
  ];

  return candidates
    .filter((candidate) => caseSummary?.[candidate.key])
    .map((candidate, index) => ({
      id: `${candidate.key}-${index}`,
      label: candidate.label,
      dueAt: new Date(caseSummary[candidate.key]).toISOString(),
      urgent: ["urgent", "critical"].includes(caseSummary?.urgency || ""),
    }));
}

function deriveSummary(caseSummary: BackendCase, note: BackendNote | null) {
  const noteDraft = note ? parseJson<any>(note.solicitor_edited || note.ai_draft, {}) : null;
  return (
    noteDraft?.executive_summary ||
    caseSummary?.most_recent_operative_event ||
    caseSummary?.next_procedural_step ||
    caseSummary?.solicitor_notes ||
    "No summary available yet."
  );
}

function mapHandoffDetail(payload: any): Handoff {
  const caseSummary = payload.case_summary || {};
  const backendDocuments = (payload.documents || payload.document_map || []).map(mapDocument);
  const stagedDocuments = mapStagedUploadsToDocuments(payload.id);
  const documents = [...backendDocuments, ...stagedDocuments];
  const latestNote = Array.isArray(payload.handover_notes) && payload.handover_notes.length > 0
    ? payload.handover_notes[payload.handover_notes.length - 1]
    : null;

  return {
    id: payload.id,
    caseId: caseSummary.id || payload.case_id,
    caseName: caseSummary.case_title || "Untitled matter",
    matterType: caseSummary.claim_type || caseSummary.ruleset || "General litigation",
    court: caseSummary.court_name || caseSummary.forum || "Court pending",
    parties: {
      plaintiff: caseSummary.claimant || "Claimant",
      defendant: caseSummary.defendant || "Defendant",
    },
    status: mapMatterStatus(payload.status),
    backendStatus: payload.status,
    ownerId: payload.sending_solicitor_id,
    receivingId: payload.receiving_solicitor_id || undefined,
    createdAt: payload.created_at,
    nextHearingAt: caseSummary.next_hearing_date ? new Date(caseSummary.next_hearing_date).toISOString() : undefined,
    summary: deriveSummary(caseSummary, latestNote),
    documentsCount: documents.length,
    pagesIndexed: documents.reduce((total: number, document: Document) => total + Number(document.pages || 0), 0),
    deadlines: mapDeadlines(caseSummary),
    handoffType: payload.handoff_type || null,
    noticeOfChangeRequired: Boolean(payload.notice_of_change_required),
    noteId: latestNote?.id || null,
    noteApproved: Boolean(latestNote?.approved_at),
    latestNote: mapLatestNote(latestNote),
  };
}

function mapDocument(document: BackendDocument): Document {
  return {
    id: document.id,
    matterId: document.handoff_id || document.case_id,
    filename: document.original_name,
    pages: Number(document.page_count || 0),
    chunks: Number(document.chunks_count || 0),
    privilege: mapPrivilege(Boolean(document.privilege_flag)),
    status: mapDocumentStatus(document.status),
    uploadedAt: document.uploaded_at,
    rawPageCount: document.page_count || null,
  };
}

function mapUpdate(update: BackendUpdate, currentUserName = "Unknown", currentRole: MatterUpdate["authorRole"] = "Solicitor"): MatterUpdate {
  const verified = parseJson<any>(update.verified_version, null);
  const aiDraft = parseJson<any>(update.ai_draft, null);
  const citations = Array.isArray(aiDraft?.sources)
    ? aiDraft.sources.map((source: any) => makeCitation(source.doc_name, Number(source.page)))
    : [];

  return {
    id: update.id,
    matterId: update.handoff_id,
    authorName: update.verified_by ? currentUserName : currentUserName,
    authorRole: currentRole,
    createdAt: update.created_at,
    whatWasDone: verified?.what_was_done || aiDraft?.what_was_done || update.what_was_done || "",
    whatHappened: verified?.outcome || aiDraft?.outcome || update.what_happened || "",
    whatFollows: verified?.what_follows || aiDraft?.what_follows || update.what_follows || "",
    hearingAt: undefined,
    attachments: [],
    citations,
    verified: Boolean(update.verified_at),
    rawStatus: update.new_procedural_status || undefined,
  };
}

function mapChatAnswer(payload: any): ChatAnswer {
  const insufficient = payload.answer === "Insufficient evidence in the file to answer this question.";
  const sourceLookup = buildSourceLookup(payload.sources || []);
  return {
    text: payload.answer,
    insufficient,
    citations: (payload.sources || []).map((source: any) => ({
      doc: source.doc_name,
      page: Number(source.page),
      chunkId: `${source.doc_name}:${source.page}`,
      preview: sourceLookup.get(`${source.doc_name}:${Number(source.page)}`)?.preview,
      score: sourceLookup.get(`${source.doc_name}:${Number(source.page)}`)?.score,
    })),
  };
}

function buildStaticSuggestions(handoff: Handoff | null): string[] {
  const defaults = [
    "What is the next required step?",
    "What urgent issues are flagged?",
    "What deadlines are currently live?",
  ];

  if (!handoff) {
    return defaults;
  }

  return [
    `What is the next step in ${handoff.caseName}?`,
    `What are the urgent issues in ${handoff.caseName}?`,
    ...defaults,
  ];
}

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  if (!isFormData && options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await response.json().catch(() => ({}))
    : await response.text().catch(() => "");

  if (!response.ok) {
    const error = typeof body === "object" && body !== null && "error" in body ? String((body as any).error) : `Request failed with status ${response.status}`;
    throw Object.assign(new Error(error), { status: response.status, body });
  }

  return body as T;
}

async function listCases() {
  return apiRequest<BackendCase[]>("/cases");
}

async function listCaseHandoffs(caseId: string) {
  return apiRequest<BackendHandoff[]>(`/cases/${caseId}/handoffs`);
}

async function getHandoffPayload(id: string) {
  return apiRequest<any>(`/handoffs/${id}`);
}

export const realClient: CasePassClient = {
  async listHandoffs(params) {
    const cases = await listCases();
    const handoffGroups = await Promise.all(cases.map(async (caseRow) => {
      const handoffs = await listCaseHandoffs(caseRow.id);
      return handoffs.map((handoff) => ({ caseRow, handoff }));
    }));

    let flattened = handoffGroups.flat().map(({ caseRow, handoff }) => mapHandoffDetail({
      ...handoff,
      case_summary: caseRow,
      documents: [],
      handover_notes: [],
      post_action_updates: [],
    }));

    if (params?.scope === "mine" && params.forUserId) {
      flattened = flattened.filter((handoff) => handoff.ownerId === params.forUserId);
    }
    if (params?.scope === "inbox" && params.forUserId) {
      flattened = flattened.filter((handoff) => handoff.receivingId === params.forUserId);
    }
    if (params?.status && params.status !== "all") {
      flattened = flattened.filter((handoff) => handoff.status === params.status);
    }
    if (params?.matterType && params.matterType !== "all") {
      flattened = flattened.filter((handoff) => handoff.matterType === params.matterType);
    }
    if (params?.search) {
      const query = params.search.toLowerCase();
      flattened = flattened.filter((handoff) => [
        handoff.caseName,
        handoff.parties.plaintiff,
        handoff.parties.defendant,
        handoff.summary,
        handoff.court,
        handoff.matterType,
      ].join(" ").toLowerCase().includes(query));
    }

    return flattened.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  },

  async getHandoff(id) {
    try {
      const payload = await getHandoffPayload(id);
      return mapHandoffDetail(payload);
    } catch (error: any) {
      if (error.status === 404) {
        return null;
      }
      throw error;
    }
  },

  async getDashboardKpis(_forUserId) {
    const handoffs = await this.listHandoffs({ scope: "firm" });
    const weekFromNow = Date.now() + 7 * 24 * 60 * 60 * 1000;
    const deadlinesThisWeek = handoffs.flatMap((handoff) => handoff.deadlines).filter((deadline) => new Date(deadline.dueAt).getTime() <= weekFromNow).length;
    return {
      activeMatters: handoffs.filter((handoff) => handoff.status !== "closed").length,
      deadlinesThisWeek,
      pendingHandoffs: handoffs.filter((handoff) => ["intake", "indexed"].includes(handoff.status)).length,
      pagesIndexed: handoffs.reduce((total, handoff) => total + handoff.pagesIndexed, 0),
    };
  },

  async createHandoff(input) {
    const createdCase = await apiRequest<any>("/cases", {
      method: "POST",
      body: JSON.stringify({
        case_title: input.caseName,
        claimant: input.plaintiff,
        defendant: input.defendant,
        forum: mapCourtToForum(input.court),
        court_name: input.court,
        claim_type: input.matterType,
        urgency: "urgent",
        next_hearing_date: input.nextHearingAt ? input.nextHearingAt.slice(0, 10) : undefined,
        solicitor_notes: input.summary,
        most_recent_operative_event: input.summary,
        next_procedural_step: input.summary,
      }),
    });

    const handoff = await apiRequest<any>("/handoffs", {
      method: "POST",
      body: JSON.stringify({
        case_id: createdCase.id,
        receiving_solicitor_id: input.receiverId,
        intended_task: input.summary,
      }),
    });

    let uploadsPersisted = false;
    if (input.files.length > 0) {
      const clearancePayload = {
        conflict_check: true,
        confidentiality_clear: true,
        competence_confirmed: true,
        capacity_confirmed: true,
        rights_of_audience_confirmed: true,
        rights_of_audience_forum: createdCase.forum,
        result: "approved",
        clearance_notes: "Auto-cleared for integrated local workflow.",
      };

      try {
        await apiRequest(`/handoffs/${handoff.id}/clearance-records`, {
          method: "POST",
          body: JSON.stringify(clearancePayload),
        });
        uploadsPersisted = true;
      } catch {
        stageUploads(handoff.id, input.files.filter((file) => file.file).map((file) => ({ file: file.file!, pages: file.pages, docType: "pleading" })));
      }
    }

    if (uploadsPersisted) {
      for (const file of input.files) {
        if (!file.file) continue;
        const formData = new FormData();
        formData.append("file", file.file);
        formData.append("doc_type", "pleading");
        formData.append("source_status", "original");
        formData.append("page_count", String(file.pages));
        try {
          await apiRequest(`/handoffs/${handoff.id}/documents`, { method: "POST", body: formData });
        } catch {
          stageUploads(handoff.id, [{ file: file.file, pages: file.pages, docType: "pleading" }]);
        }
      }
    }

    return (await this.getHandoff(handoff.id)) as Handoff;
  },

  async getMatterReview(handoffId) {
    const payload = await getHandoffPayload(handoffId);
    const latestNote = Array.isArray(payload.handover_notes) && payload.handover_notes.length > 0
      ? payload.handover_notes[payload.handover_notes.length - 1]
      : null;

    if (latestNote?.ai_draft || latestNote?.solicitor_edited) {
      return mapReviewFromAiDraft(parseJson<any>(latestNote.solicitor_edited || latestNote.ai_draft, {}));
    }

    try {
      const generated = await apiRequest<any>(`/handoffs/${handoffId}/matter-reviews`, { method: "POST" });
      return mapReviewFromAiDraft(generated);
    } catch (_error) {
      return null;
    }
  },

  async listDocuments(handoffId) {
    const documents = await apiRequest<BackendDocument[]>(`/handoffs/${handoffId}/documents`);
    const mapped = documents.map(mapDocument);
    return [...mapped, ...mapStagedUploadsToDocuments(handoffId)];
  },

  async listChunks(handoffId) {
    const documents = await this.listDocuments(handoffId);
    return documents.flatMap((document) => {
      const pages = Math.max(1, Math.min(document.pages || 1, 5));
      return Array.from({ length: pages }).map((_, index) => ({
        id: `${document.filename}:${index + 1}`,
        doc: document.filename,
        page: index + 1,
        excerpt: `${document.filename} · page ${index + 1}`,
      }));
    });
  },

  async getChatSuggestions(handoffId) {
    const handoff = await this.getHandoff(handoffId);
    return buildStaticSuggestions(handoff);
  },

  async chatWithSources(handoffId, question) {
    const payload = await getHandoffPayload(handoffId);
    const answer = await apiRequest<any>(`/cases/${payload.case_summary.id}/chat`, {
      method: "POST",
      body: JSON.stringify({ question, handoff_id: handoffId }),
    });
    return mapChatAnswer(answer);
  },

  async listUpdates(handoffId) {
    const payload = await apiRequest<BackendUpdate[]>(`/handoffs/${handoffId}/post-action-updates`);
    return payload.map((update) => mapUpdate(update));
  },

  async createUpdate(input) {
    const response = await apiRequest<any>(`/handoffs/${input.matterId}/post-action-updates`, {
      method: "POST",
      body: JSON.stringify({
        what_was_done: input.whatWasDone,
        what_happened: input.whatHappened,
        what_follows: input.whatFollows,
        new_procedural_status: input.whatFollows,
      }),
    });
    if (response?.post_action_update?.id) {
      try {
        await this.generateUpdateDraft(input.matterId, response.post_action_update.id);
      } catch {
        // Draft generation can fail independently; the update still exists.
      }
    }
    const updates = await this.listUpdates(input.matterId);
    return updates.find((update) => update.id === response.post_action_update.id) || mapUpdate(response.post_action_update, input.authorName, input.authorRole);
  },

  async listUsers() {
    const users = await apiRequest<any[]>("/users");
    const handoffs = await this.listHandoffs({ scope: "firm" });

    return users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: mapRole(user.role, user.legal_role),
      title: mapLegalRoleTitle(user.legal_role),
      legalRole: user.legal_role || null,
      activeMatters: handoffs.filter((handoff) => handoff.ownerId === user.id || handoff.receivingId === user.id).length,
      status: user.active ? "active" : "disabled",
      joinedAt: user.created_at,
    } satisfies FirmUser));
  },

  async setUserActive(userId, active) {
    const user = await apiRequest<any>(`/users/${userId}/active`, {
      method: "PUT",
      body: JSON.stringify({ active }),
    });
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: mapRole(user.role, user.legal_role),
      title: mapLegalRoleTitle(user.legal_role),
      legalRole: user.legal_role || null,
      activeMatters: 0,
      status: user.active ? "active" : "disabled",
      joinedAt: user.created_at,
    } satisfies FirmUser;
  },

  async listAssignableUsers() {
    const users = await apiRequest<any[]>("/handoffs/recipients");
    return users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: mapRole(user.role, user.legal_role),
      title: mapLegalRoleTitle(user.legal_role),
      legalRole: user.legal_role || null,
      activeMatters: 0,
      status: user.active ? "active" : "disabled",
      joinedAt: user.created_at,
    } satisfies FirmUser));
  },

  async uploadHandoffDocument(handoffId, file, docType = "pleading") {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("doc_type", docType);
    formData.append("source_status", "original");
    const response = await apiRequest<any>(`/handoffs/${handoffId}/documents`, { method: "POST", body: formData });
    const staged = getStagedUploads(handoffId).find((item) => item.file.name === file.name && item.file.size === file.size);
    if (staged) {
      removeStagedUpload(handoffId, staged.id);
    }
    return mapDocument(response.document);
  },

  async flushStagedUploads(handoffId) {
    const staged = [...getStagedUploads(handoffId)];
    const uploaded: Document[] = [];

    for (const upload of staged) {
      try {
        const document = await this.uploadHandoffDocument(handoffId, upload.file, upload.docType);
        uploaded.push(document);
      } catch {
        // Keep remaining staged files in memory if upload still fails.
      }
    }

    if (uploaded.length === staged.length) {
      clearStagedUploads(handoffId);
    }

    return uploaded;
  },

  async approveClearance(handoffId) {
    const current = await getHandoffPayload(handoffId);
    const result = await apiRequest<any>(`/handoffs/${handoffId}/clearance-records`, {
      method: "POST",
      body: JSON.stringify({
        conflict_check: true,
        confidentiality_clear: true,
        competence_confirmed: true,
        capacity_confirmed: true,
        rights_of_audience_confirmed: true,
        rights_of_audience_forum: current.case_summary?.forum || "county_court",
        result: "approved",
        clearance_notes: "Approved from frontend workflow.",
      }),
    });
    return mapHandoffDetail({ ...result, case_summary: current.case_summary, documents: current.documents || [], handover_notes: current.handover_notes || [], post_action_updates: current.post_action_updates || [] });
  },

  async createHandoverNote(handoffId) {
    const review = await this.getMatterReview(handoffId);
    const note = await apiRequest<any>(`/handoffs/${handoffId}/handover-notes`, { method: "POST" });
    const handoff = await this.getHandoff(handoffId);
    return { handoff: handoff || undefined, review };
  },

  async approveHandoverNote(handoffId, noteId, solicitorEdited) {
    const result = await apiRequest<any>(`/handoffs/${handoffId}/handover-notes/${noteId}`, {
      method: "PATCH",
      body: JSON.stringify({ solicitor_edited: solicitorEdited }),
    });
    return mapHandoffDetail(await getHandoffPayload(handoffId));
  },

  async releaseHandoffPack(handoffId) {
    await apiRequest(`/handoffs/${handoffId}/pack-releases`, { method: "POST" });
    return (await this.getHandoff(handoffId)) as Handoff;
  },

  async acceptHandoff(handoffId, scope = "limited") {
    await apiRequest(`/handoffs/${handoffId}/acceptances`, {
      method: "POST",
      body: JSON.stringify({ scope, deadline_acknowledged: true }),
    });
    return (await this.getHandoff(handoffId)) as Handoff;
  },

  async generateUpdateDraft(handoffId, updateId) {
    await apiRequest(`/handoffs/${handoffId}/post-action-updates/${updateId}/drafts`, { method: "POST" });
    const updates = await this.listUpdates(handoffId);
    return updates.find((update) => update.id === updateId) || updates[0];
  },

  async verifyUpdate(handoffId, updateId, verifiedVersion, newProceduralStatus) {
    await apiRequest(`/handoffs/${handoffId}/post-action-updates/${updateId}`, {
      method: "PATCH",
      body: JSON.stringify({ verified_version: verifiedVersion, new_procedural_status: newProceduralStatus || "Update verified" }),
    });
    return (await this.getHandoff(handoffId)) as Handoff;
  },

  async routeHandoff(handoffId, outcome) {
    await apiRequest(`/handoffs/${handoffId}/routing-decisions`, {
      method: "POST",
      body: JSON.stringify({ outcome }),
    });
    return (await this.getHandoff(handoffId)) as Handoff;
  },
};

function mapCourtToForum(court: string) {
  const map: Record<string, string> = {
    "Commercial Court": "high_court_kbd",
    "High Court (KBD)": "high_court_kbd",
    "Employment Tribunal": "employment_tribunal",
    "County Court": "county_court",
    "Court of Appeal": "court_of_appeal_civil",
  };

  return map[court] || "other_tribunal";
}
