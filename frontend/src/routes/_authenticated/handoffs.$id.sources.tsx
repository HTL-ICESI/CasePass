import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CircleAlert,
  Clock,
  Download,
  Eye,
  FileText,
  Loader2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import type { Document, DocumentStatus, PrivilegeFlag } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/handoffs/$id/sources")({
  head: () => ({ meta: [{ title: "Source register — CasePass" }] }),
  component: SourcesPage,
  validateSearch: (search: Record<string, unknown>) => ({
    open: typeof search.open === "string" ? search.open : undefined,
  }),
});

function SourcesPage() {
  const { id } = Route.useParams();
  const { open: openDocId } = Route.useSearch();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(null);
  const [autoOpenedId, setAutoOpenedId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Document | null>(null);

  useEffect(() => {
    return () => {
      if (preview?.url) {
        URL.revokeObjectURL(preview.url);
      }
    };
  }, [preview?.url]);

  const handoff = useQuery({
    queryKey: ["handoff", id],
    queryFn: () => api.getHandoff(id),
  });
  const { data, isLoading } = useQuery({
    queryKey: ["documents", id],
    queryFn: () => api.listDocuments(id),
  });

  const openPreview = async (doc: Document) => {
    if (doc.status !== "indexed" && doc.status !== "processing") {
      toast.error("File isn't available on the server yet.");
      return;
    }
    try {
      const url = await api.fetchDocumentBlobUrl(id, doc.id);
      if (preview?.url) {
        URL.revokeObjectURL(preview.url);
      }
      setPreview({ url, name: doc.filename });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't load preview.");
    }
  };

  const downloadDocument = async (doc: Document) => {
    if (doc.status !== "indexed" && doc.status !== "processing") {
      toast.error("File isn't available on the server yet.");
      return;
    }
    try {
      const url = await api.fetchDocumentBlobUrl(id, doc.id);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = doc.filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't download file.");
    }
  };

  const uploadMutation = useMutation({
    mutationFn: (file: File) => api.uploadHandoffDocument(id, file),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["documents", id] }),
        queryClient.invalidateQueries({ queryKey: ["handoff", id] }),
      ]);
      toast.success("Document uploaded.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not upload document."),
  });

  const deleteMutation = useMutation({
    mutationFn: (docId: string) => api.deleteHandoffDocument(id, docId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["documents", id] }),
        queryClient.invalidateQueries({ queryKey: ["handoff", id] }),
        queryClient.invalidateQueries({ queryKey: ["matter-review", id] }),
      ]);
      toast.success("Document deleted.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Couldn't delete document."),
  });

  const senderEditStatuses = new Set([
    "clearance_pending",
    "file_upload_open",
    "pack_building",
    "pack_review",
  ]);
  const isSender = Boolean(user && handoff.data && handoff.data.ownerId === user.id);
  const isEditable = Boolean(
    isSender && handoff.data && senderEditStatuses.has(handoff.data.backendStatus),
  );
  const canUpload = isEditable;
  const stagedCount = (data || []).filter((document) => document.status === "staged").length;
  const showStagedRetryBanner = isSender && stagedCount > 0 && canUpload;

  useEffect(() => {
    if (!openDocId || !data || autoOpenedId === openDocId) return;
    const match = data.find((document) => document.id === openDocId);
    if (match) {
      setAutoOpenedId(openDocId);
      openPreview(match);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openDocId, data, autoOpenedId]);

  useEffect(() => {
    if (
      !canUpload ||
      uploadMutation.isPending ||
      !data?.some((document) => document.status === "staged")
    ) {
      return;
    }

    api
      .flushStagedUploads(id)
      .then(async (uploaded) => {
        if (uploaded.length > 0) {
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ["documents", id] }),
            queryClient.invalidateQueries({ queryKey: ["handoff", id] }),
          ]);
          toast.success(
            `Uploaded ${uploaded.length} staged document${uploaded.length > 1 ? "s" : ""}.`,
          );
        }
      })
      .catch(() => {
        // Keep staged files visible until a later retry.
      });
  }, [canUpload, data, id, queryClient, uploadMutation.isPending]);

  return (
    <div className="space-y-5">
      {showStagedRetryBanner && (
        <section className="rounded-2xl border border-warning/40 bg-warning/5 p-5 shadow-[var(--shadow-1)]">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-warning/15 text-warning">
              <AlertTriangle className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-sm font-semibold text-foreground">
                {stagedCount} file{stagedCount > 1 ? "s" : ""} couldn't upload during creation
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                CasePass is retrying automatically. If they stay staged, re-upload them from the
                button above.
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-border bg-surface shadow-[var(--shadow-1)]">
        <header className="border-b border-border/70 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold">Source register</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Every document indexed for this matter. Citations reference these files.
              </p>
            </div>
            {canUpload && (
              <>
                <input
                  ref={inputRef}
                  type="file"
                  hidden
                  accept="application/pdf,.pdf"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      uploadMutation.mutate(file);
                    }
                    event.target.value = "";
                  }}
                />
                <Button
                  size="sm"
                  onClick={() => inputRef.current?.click()}
                  disabled={uploadMutation.isPending}
                >
                  {uploadMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <UploadCloud className="h-3.5 w-3.5" />
                  )}
                  Upload PDF
                </Button>
              </>
            )}
          </div>
        </header>

        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-muted-foreground">
            No documents indexed yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/70 text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Document</th>
                  <th className="px-3 py-3 font-medium">Pages</th>
                  <th className="px-3 py-3 font-medium">Chunks</th>
                  <th className="px-3 py-3 font-medium">Privilege</th>
                  <th className="px-3 py-3 text-right font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((document) => (
                  <DocRow
                    key={document.id}
                    doc={document}
                    canDelete={isEditable}
                    onPreview={() => openPreview(document)}
                    onDownload={() => downloadDocument(document)}
                    onDelete={() => setPendingDelete(document)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Dialog open={Boolean(preview)} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-3">
              <span className="truncate">{preview?.name}</span>
              {preview && (
                <a
                  href={preview.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-indigo hover:underline"
                >
                  Open in new tab
                </a>
              )}
            </DialogTitle>
          </DialogHeader>
          {preview && (
            <iframe
              title={preview.name}
              src={preview.url}
              className="h-[75vh] w-full rounded-lg border border-border bg-canvas"
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && !deleteMutation.isPending && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this document?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">{pendingDelete?.filename}</span> will be
              removed from this matter, including its indexed chunks. Any citation that pointed to
              it will become stale. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Keep file</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!pendingDelete) return;
                const target = pendingDelete;
                deleteMutation.mutate(target.id, {
                  onSettled: () => setPendingDelete(null),
                });
              }}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : null}
              Delete document
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DocRow({
  doc,
  canDelete,
  onPreview,
  onDownload,
  onDelete,
}: {
  doc: Document;
  canDelete: boolean;
  onPreview: () => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  const fileAvailable = doc.status === "indexed" || doc.status === "processing";
  return (
    <tr className="border-b border-border/50 transition-colors last:border-b-0 hover:bg-muted/40">
      <td className="px-5 py-3.5">
        <div className="flex items-start gap-2.5">
          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">{doc.filename}</span>
        </div>
      </td>
      <td className="px-3 py-3.5 font-mono text-xs text-muted-foreground">{doc.pages}</td>
      <td className="px-3 py-3.5 font-mono text-xs text-muted-foreground">{doc.chunks}</td>
      <td className="px-3 py-3.5">
        <PrivilegeBadge flag={doc.privilege} />
      </td>
      <td className="px-3 py-3.5 text-right">
        <StatusBadge status={doc.status} />
      </td>
      <td className="px-5 py-3.5 text-right">
        <div className="inline-flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={!fileAvailable}
            onClick={onPreview}
            aria-label="Preview PDF"
            title={fileAvailable ? "Preview" : "Not yet available"}
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={!fileAvailable}
            onClick={onDownload}
            aria-label="Download PDF"
            title={fileAvailable ? "Download" : "Not yet available"}
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
          {canDelete && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={onDelete}
              aria-label="Delete document"
              title="Delete document"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

function PrivilegeBadge({ flag }: { flag: PrivilegeFlag }) {
  const map: Record<PrivilegeFlag, { label: string; icon: React.ReactNode; cls: string }> = {
    none: {
      label: "None",
      icon: <Shield className="h-3 w-3" />,
      cls: "bg-muted text-muted-foreground",
    },
    "client-privilege": {
      label: "Client",
      icon: <ShieldCheck className="h-3 w-3" />,
      cls: "bg-indigo-soft text-onyx",
    },
    "work-product": {
      label: "Work product",
      icon: <ShieldAlert className="h-3 w-3" />,
      cls: "bg-warning/15 text-warning",
    },
  };
  const item = map[flag];
  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider " +
        item.cls
      }
    >
      {item.icon} {item.label}
    </span>
  );
}

function StatusBadge({ status }: { status: DocumentStatus }) {
  const map: Record<
    DocumentStatus,
    { label: string; icon: React.ReactNode; cls: string; title?: string }
  > = {
    indexed: {
      label: "Indexed",
      icon: <ShieldCheck className="h-3 w-3" />,
      cls: "bg-mint-soft text-onyx",
    },
    processing: {
      label: "Indexing",
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
      cls: "bg-indigo-soft text-onyx",
      title: "File is uploading and being chunked plus embedded.",
    },
    staged: {
      label: "Staged",
      icon: <Clock className="h-3 w-3" />,
      cls: "bg-muted text-foreground/80",
      title: "Waiting for a retry after upload failed during creation.",
    },
    error: {
      label: "Error",
      icon: <CircleAlert className="h-3 w-3" />,
      cls: "bg-destructive/15 text-destructive",
    },
  };
  const item = map[status];
  return (
    <span
      title={item.title}
      className={
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider " +
        item.cls
      }
    >
      {item.icon} {item.label}
    </span>
  );
}
