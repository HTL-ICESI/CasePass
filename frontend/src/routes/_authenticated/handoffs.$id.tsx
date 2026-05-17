import { createFileRoute, Link, Outlet, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Calendar, Gavel, Users } from "lucide-react";

import { api } from "@/lib/api";
import type { MatterStatus } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/app/error-state";

export const Route = createFileRoute("/_authenticated/handoffs/$id")({
  head: ({ params }) => ({
    meta: [{ title: `Matter ${params.id} — CasePass` }],
  }),
  component: MatterLayout,
});

const TABS: Array<{ to: string; label: string; exact?: boolean }> = [
  { to: "/handoffs/$id", label: "Overview", exact: true },
  { to: "/handoffs/$id/chat", label: "Chat" },
  { to: "/handoffs/$id/note", label: "Handover note" },
  { to: "/handoffs/$id/updates", label: "Updates" },
  { to: "/handoffs/$id/sources", label: "Sources" },
  { to: "/handoffs/$id/activity", label: "Activity" },
  { to: "/handoffs/$id/export", label: "Export" },
];

function MatterLayout() {
  const { id } = Route.useParams();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["handoff", id],
    queryFn: async () => {
      const h = await api.getHandoff(id);
      if (!h) throw notFound();
      return h;
    },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <Link
        to="/dashboard"
        className="cp-no-print inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All matters
      </Link>

      <header className="cp-no-print mt-4 rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow-1)]">
        {isError ? (
          <ErrorState
            title="Matter not available"
            description="It may have been moved or you may not have access. Head back to the dashboard."
          />
        ) : isLoading || !data ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <StatusChip status={data.status} />
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {data.matterType}
              </span>
            </div>
            <h1 className="mt-3 font-display text-2xl font-semibold tracking-tight md:text-3xl">
              {data.caseName}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Gavel className="h-3.5 w-3.5" /> {data.court}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                {data.parties.plaintiff}
                {data.parties.defendant !== "—" && ` v. ${data.parties.defendant}`}
              </span>
              {data.nextHearingAt && (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Next hearing {formatDate(data.nextHearingAt)}
                </span>
              )}
              <span className="font-mono">
                {data.documentsCount} docs · {data.pagesIndexed} pages indexed
              </span>
            </div>
          </>
        )}
      </header>

      <nav className="cp-no-print mt-6 -mx-4 overflow-x-auto border-b border-border px-4 sm:mx-0 sm:px-0">
        <div className="flex min-w-max items-center gap-1">
          {TABS.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              params={{ id }}
              activeOptions={{ exact: t.exact ?? false }}
              className="-mb-px shrink-0 border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground data-[status=active]:border-indigo data-[status=active]:text-foreground data-[status=active]:font-medium"
            >
              {t.label}
            </Link>
          ))}
        </div>
      </nav>

      <div className="mt-6">
        <Outlet />
      </div>
    </div>
  );
}

function StatusChip({ status }: { status: MatterStatus }) {
  const map: Record<MatterStatus, { label: string; cls: string; pulse?: boolean }> = {
    "intake": { label: "Intake", cls: "bg-muted text-foreground" },
    "indexed": { label: "Indexed", cls: "bg-indigo-soft text-onyx" },
    "handoff-active": { label: "Handoff active", cls: "bg-mint-soft text-onyx", pulse: true },
    "in-review": { label: "In review", cls: "bg-indigo-soft text-onyx" },
    "closed": { label: "Closed", cls: "bg-muted text-muted-foreground" },
  };
  const m = map[status];
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider " +
        m.cls
      }
    >
      {m.pulse && <span className="h-1.5 w-1.5 rounded-full bg-mint cp-pulse" />}
      {m.label}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
