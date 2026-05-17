import { mockClient } from "./mock-client";
import type { CasePassClient } from "./client";

// Swap this for a real REST client (fetch wrapper) when wiring the backend.
// The UI never imports the mock directly — it imports `api` from here.
export const api: CasePassClient = mockClient;

export type * from "./types";
