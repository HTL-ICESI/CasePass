import type { CasePassClient } from "./client";
import { MOCK_HANDOFFS } from "./mock-data";
import { MOCK_DOCUMENTS, MOCK_REVIEWS } from "./mock-reviews";
import { answerForMatter, chunksForMatter, suggestedForMatter } from "./mock-chat";
import { MOCK_UPDATES } from "./mock-updates";
import type {
  ActivityEvent,
  CreateHandoffInput,
  CreateUpdateInput,
  DashboardKpis,
  Handoff,
  ListHandoffsParams,
  MatterUpdate,
} from "./types";

// Runtime activity log (in-memory). Seeded with derived events on first read.
const ACTIVITY: Record<string, ActivityEvent[]> = {};
const SEEDED = new Set<string>();

function seedActivity(matterId: string) {
  if (SEEDED.has(matterId)) return;
  SEEDED.add(matterId);
  const h = MOCK_HANDOFFS.find((m) => m.id === matterId);
  if (!h) return;
  const events: ActivityEvent[] = [];
  events.push({
    id: `a_${matterId}_created`,
    matterId,
    kind: "matter.created",
    at: h.createdAt,
    actorName: "System",
    actorRole: "System",
    summary: `Matter "${h.caseName}" created (${h.matterType}).`,
  });
  const docs = MOCK_DOCUMENTS[matterId] ?? [];
  docs.forEach((d) => {
    events.push({
      id: `a_${d.id}_uploaded`,
      matterId,
      kind: "document.uploaded",
      at: d.uploadedAt,
      actorName: "Eleanor Hayes",
      actorRole: "Solicitor",
      summary: `Uploaded ${d.filename} (${d.pages} pages, ${d.status}).`,
    });
  });
  if (docs.length > 0) {
    const lastUpload = docs.reduce((acc, d) => (d.uploadedAt > acc ? d.uploadedAt : acc), docs[0].uploadedAt);
    events.push({
      id: `a_${matterId}_indexed`,
      matterId,
      kind: "matter.indexed",
      at: lastUpload,
      actorName: "CasePass",
      actorRole: "System",
      summary: `Indexed ${h.documentsCount} documents (${h.pagesIndexed} pages).`,
    });
  }
  if (h.status === "handoff-active" && h.receivingId) {
    events.push({
      id: `a_${matterId}_accepted`,
      matterId,
      kind: "handoff.accepted",
      at: h.createdAt,
      actorName: "Marcus Whitman",
      actorRole: "Receiving counsel",
      summary: "Accepted the handoff and confirmed scope.",
    });
  }
  (MOCK_UPDATES[matterId] ?? []).forEach((u) => {
    events.push({
      id: `a_${u.id}`,
      matterId,
      kind: "update.posted",
      at: u.createdAt,
      actorName: u.authorName,
      actorRole: u.authorRole,
      summary: u.whatWasDone,
    });
  });
  ACTIVITY[matterId] = events;
}

const latency = (min = 220, max = 520) =>
  new Promise<void>((r) => setTimeout(r, Math.random() * (max - min) + min));

function filterHandoffs(all: Handoff[], p: ListHandoffsParams = {}): Handoff[] {
  return all.filter((h) => {
    if (p.scope === "mine" && p.forUserId && h.ownerId !== p.forUserId) return false;
    if (p.scope === "inbox" && p.forUserId && h.receivingId !== p.forUserId) return false;
    if (p.status && p.status !== "all" && h.status !== p.status) return false;
    if (p.matterType && p.matterType !== "all" && h.matterType !== p.matterType) return false;
    if (p.search) {
      const q = p.search.toLowerCase();
      const hay = [
        h.caseName,
        h.parties.plaintiff,
        h.parties.defendant,
        h.summary,
        h.court,
        h.matterType,
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export const mockClient: CasePassClient = {
  async listHandoffs(params) {
    await latency();
    const filtered = filterHandoffs(MOCK_HANDOFFS, params);
    return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async getHandoff(id) {
    await latency(120, 280);
    return MOCK_HANDOFFS.find((h) => h.id === id) ?? null;
  },
  async getDashboardKpis(_forUserId) {
    await latency();
    const weekFromNow = Date.now() + 7 * 86_400_000;
    const deadlinesThisWeek = MOCK_HANDOFFS.flatMap((h) => h.deadlines).filter(
      (d) => new Date(d.dueAt).getTime() <= weekFromNow,
    ).length;
    return {
      activeMatters: MOCK_HANDOFFS.filter((h) => h.status !== "closed").length,
      deadlinesThisWeek,
      pendingHandoffs: MOCK_HANDOFFS.filter((h) =>
        ["intake", "indexed"].includes(h.status),
      ).length,
      pagesIndexed: MOCK_HANDOFFS.reduce((sum, h) => sum + h.pagesIndexed, 0),
    } satisfies DashboardKpis;
  },
  async createHandoff(input: CreateHandoffInput) {
    await latency(400, 800);
    const totalPages = input.files.reduce((s, f) => s + f.pages, 0);
    const handoff: Handoff = {
      id: `hf_${Date.now().toString(36)}`,
      caseName: input.caseName,
      matterType: input.matterType,
      court: input.court,
      parties: { plaintiff: input.plaintiff, defendant: input.defendant },
      status: "indexed",
      ownerId: input.ownerId,
      createdAt: new Date().toISOString(),
      nextHearingAt: input.nextHearingAt,
      summary: input.summary,
      documentsCount: input.files.length,
      pagesIndexed: totalPages,
      deadlines: input.nextHearingAt
        ? [{ id: "d1", label: "Next hearing", dueAt: input.nextHearingAt }]
        : [],
    };
    MOCK_HANDOFFS.unshift(handoff);
    return handoff;
  },
  async getMatterReview(handoffId) {
    await latency(120, 280);
    return MOCK_REVIEWS[handoffId] ?? null;
  },
  async listDocuments(handoffId) {
    await latency(120, 280);
    return MOCK_DOCUMENTS[handoffId] ?? [];
  },
  async listChunks(handoffId) {
    await latency(80, 160);
    return chunksForMatter(handoffId);
  },
  async getChatSuggestions(handoffId) {
    await latency(60, 120);
    return suggestedForMatter(handoffId);
  },
  async chatWithSources(handoffId, question) {
    await latency(700, 1400);
    return answerForMatter(handoffId, question);
  },
  async listUpdates(handoffId) {
    await latency(120, 240);
    const list = MOCK_UPDATES[handoffId] ?? [];
    return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async createUpdate(input: CreateUpdateInput) {
    await latency(400, 800);
    const update: MatterUpdate = {
      id: `u_${Date.now().toString(36)}`,
      matterId: input.matterId,
      authorName: input.authorName,
      authorRole: input.authorRole,
      createdAt: new Date().toISOString(),
      whatWasDone: input.whatWasDone,
      whatHappened: input.whatHappened,
      whatFollows: input.whatFollows,
      hearingAt: input.hearingAt,
      attachments: input.attachments,
      citations: [],
    };
    const list = MOCK_UPDATES[input.matterId] ?? (MOCK_UPDATES[input.matterId] = []);
    list.unshift(update);
    seedActivity(input.matterId);
    (ACTIVITY[input.matterId] ??= []).unshift({
      id: `a_${update.id}`,
      matterId: input.matterId,
      kind: "update.posted",
      at: update.createdAt,
      actorName: update.authorName,
      actorRole: update.authorRole,
      summary: update.whatWasDone,
    });
    return update;
  },
  async listActivity(handoffId) {
    await latency(120, 240);
    seedActivity(handoffId);
    const list = ACTIVITY[handoffId] ?? [];
    return [...list].sort((a, b) => b.at.localeCompare(a.at));
  },
  async logActivity(input) {
    await latency(40, 100);
    seedActivity(input.matterId);
    const event: ActivityEvent = {
      id: `a_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      matterId: input.matterId,
      kind: input.kind,
      at: new Date().toISOString(),
      actorName: input.actorName,
      actorRole: input.actorRole,
      summary: input.summary,
      meta: input.meta,
    };
    (ACTIVITY[input.matterId] ??= []).unshift(event);
    return event;
  },
};
