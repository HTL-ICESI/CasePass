import type { Document } from "./types";

export type StagedUpload = {
  id: string;
  handoffId: string;
  file: File;
  pages: number;
  docType: string;
  createdAt: string;
};

const stagedUploads = new Map<string, StagedUpload[]>();

export function stageUploads(
  handoffId: string,
  uploads: Array<{ file: File; pages: number; docType?: string }>,
) {
  const existing = stagedUploads.get(handoffId) || [];
  const next = uploads.map(
    (upload) =>
      ({
        id: `${handoffId}:${upload.file.name}:${upload.file.size}:${Math.random().toString(36).slice(2, 7)}`,
        handoffId,
        file: upload.file,
        pages: upload.pages,
        docType: upload.docType || "pleading",
        createdAt: new Date().toISOString(),
      }) satisfies StagedUpload,
  );

  stagedUploads.set(handoffId, [...existing, ...next]);
}

export function getStagedUploads(handoffId: string) {
  return stagedUploads.get(handoffId) || [];
}

export function clearStagedUploads(handoffId: string) {
  stagedUploads.delete(handoffId);
}

export function removeStagedUpload(handoffId: string, uploadId: string) {
  const existing = stagedUploads.get(handoffId) || [];
  const next = existing.filter((upload) => upload.id !== uploadId);
  if (next.length === 0) {
    stagedUploads.delete(handoffId);
  } else {
    stagedUploads.set(handoffId, next);
  }
}

export function mapStagedUploadsToDocuments(handoffId: string): Document[] {
  return getStagedUploads(handoffId).map((upload) => ({
    id: upload.id,
    matterId: upload.handoffId,
    filename: upload.file.name,
    pages: upload.pages,
    chunks: 0,
    privilege: "none",
    status: "staged",
    uploadedAt: upload.createdAt,
    rawPageCount: upload.pages,
  }));
}
