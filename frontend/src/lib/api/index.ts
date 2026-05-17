import { realClient, type CasePassClient } from "./client";

export const api: CasePassClient = realClient;

export type * from "./types";
