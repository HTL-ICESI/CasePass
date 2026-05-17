import type {
  ActivityEvent,
  ActivityKind,
  ChatAnswer,
  Chunk,
  CreateHandoffInput,
  CreateUpdateInput,
  DashboardKpis,
  Document,
  Handoff,
  ListHandoffsParams,
  MatterReview,
  MatterUpdate,
} from "./types";

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
  listActivity(handoffId: string): Promise<ActivityEvent[]>;
  logActivity(input: {
    matterId: string;
    kind: ActivityKind;
    actorName: string;
    actorRole?: ActivityEvent["actorRole"];
    summary: string;
    meta?: Record<string, string | number>;
  }): Promise<ActivityEvent>;
}
