import { createFileRoute, Link, Outlet, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Calendar, Gavel, Users } from "lucide-react";

import { api } from "@/lib/api";
import type { MatterStatus } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

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
    <div className="mx-auto max-w-7xl px-6 py-8">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All matters
      </Link>

      <header className="mt-4 rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow-1)]">
        {isLoading || !data ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : isError ? (
          <p className="text-sm text-destructive">Matter not found.</p>
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

      <nav className="mt-6 flex flex-wrap items-center gap-1 border-b border-border">
        {TABS.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            params={{ id }}
            activeOptions={{ exact: t.exact ?? false }}
            className="-mb-px border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground data-[status=active]:border-indigo data-[status=active]:text-foreground data-[status=active]:font-medium"
          >
            {t.label}
          </Link>
        ))}
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
