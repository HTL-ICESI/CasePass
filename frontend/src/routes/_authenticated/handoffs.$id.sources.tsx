import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, ShieldAlert, Shield, FileText, Loader2, CircleAlert } from "lucide-react";

import { api } from "@/lib/api";
import type { Document, DocumentStatus, PrivilegeFlag } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/app/empty-state";
import { ErrorState } from "@/components/app/error-state";

export const Route = createFileRoute("/_authenticated/handoffs/$id/sources")({
  head: () => ({ meta: [{ title: "Source register — CasePass" }] }),
  component: SourcesPage,
});

function SourcesPage() {
  const { id } = Route.useParams();
  const q = useQuery({
    queryKey: ["documents", id],
    queryFn: () => api.listDocuments(id),
  });
  const { data, isLoading, isError } = q;

  return (
    <section className="rounded-2xl border border-border bg-surface shadow-[var(--shadow-1)]">
      <header className="border-b border-border/70 px-5 py-4">
        <h2 className="font-display text-lg font-semibold">Source register</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Every document indexed for this matter. Citations on the Overview tab reference these
          files.
        </p>
      </header>

      {isLoading ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : isError ? (
        <div className="p-4">
          <ErrorState
            title="We couldn't load the source register"
            onRetry={() => q.refetch()}
          />
        </div>
      ) : !data || data.length === 0 ? (
        <div className="p-4">
          <EmptyState
            icon={<FileText className="h-5 w-5" />}
            tone="indigo"
            title="No documents indexed yet"
            description="When PDFs are uploaded to this matter they will appear here with their privilege and indexing status."
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/70 text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3 font-medium">Document</th>
                <th className="px-3 py-3 font-medium">Pages</th>
                <th className="px-3 py-3 font-medium">Chunks</th>
                <th className="px-3 py-3 font-medium">Privilege</th>
                <th className="px-5 py-3 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <DocRow key={d.id} doc={d} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function DocRow({ doc }: { doc: Document }) {
  return (
    <tr className="border-b border-border/50 last:border-b-0 transition-colors hover:bg-muted/40">
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
      <td className="px-5 py-3.5 text-right">
        <StatusBadge status={doc.status} />
      </td>
    </tr>
  );
}

function PrivilegeBadge({ flag }: { flag: PrivilegeFlag }) {
  const map: Record<PrivilegeFlag, { label: string; icon: React.ReactNode; cls: string }> = {
    "none": {
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
  const m = map[flag];
  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider " +
        m.cls
      }
    >
      {m.icon} {m.label}
    </span>
  );
}

function StatusBadge({ status }: { status: DocumentStatus }) {
  const map: Record<DocumentStatus, { label: string; icon: React.ReactNode; cls: string }> = {
    "indexed": {
      label: "Indexed",
      icon: <ShieldCheck className="h-3 w-3" />,
      cls: "bg-mint-soft text-onyx",
    },
    "processing": {
      label: "Processing",
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
      cls: "bg-indigo-soft text-onyx",
    },
    "error": {
      label: "Error",
      icon: <CircleAlert className="h-3 w-3" />,
      cls: "bg-destructive/15 text-destructive",
    },
  };
  const m = map[status];
  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider " +
        m.cls
      }
    >
      {m.icon} {m.label}
    </span>
  );
}
