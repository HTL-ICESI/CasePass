import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Inbox, Search, ArrowUpRight, Clock, FileText, AlertCircle } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/app/empty-state";
import { ErrorState } from "@/components/app/error-state";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import type { Handoff } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/inbox")({
  head: () => ({ meta: [{ title: "Inbox — CasePass" }] }),
  component: InboxPage,
});

function InboxPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");

  // Demo: any matter that's been routed (has receivingId) OR is in an active/review stage
  // counts as "in the receiving inbox". Filters apply firm-wide so demo users see content.
  const list = useQuery({
    queryKey: ["inbox", search],
    queryFn: async () => {
      const all = await api.listHandoffs({ search: search || undefined });
      return all.filter(
        (h) => !!h.receivingId || h.status === "handoff-active" || h.status === "in-review",
      );
    },
    enabled: !!user,
    staleTime: 15_000,
  });

  if (!user) return null;
  const items = list.data ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-mint">Receiving counsel</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Inbox
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Matters routed to you, each with a brief, deadlines and cited sources ready to open.
          </p>
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search inbox…"
            className="pl-9"
            aria-label="Search inbox"
          />
        </div>
      </header>

      <section className="mt-8">
        {list.isLoading ? (
          <div className="grid gap-3 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-40 w-full rounded-2xl" />
            ))}
          </div>
        ) : list.isError ? (
          <ErrorState
            title="We couldn't load your inbox"
            description="Refresh to retry — your search term is kept."
            onRetry={() => list.refetch()}
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Inbox className="h-5 w-5" />}
            tone="mint"
            title={search ? "No matters match that search" : "Nothing routed your way"}
            description={
              search
                ? "Try a different case name, party, or court."
                : "When a solicitor sends a matter your way, it will land here with the brief, deadlines and cited sources ready to open."
            }
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {items.map((h) => (
              <InboxCard key={h.id} handoff={h} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function InboxCard({ handoff: h }: { handoff: Handoff }) {
  const urgent = h.deadlines.find((d) => d.urgent);
  const next = h.nextHearingAt
    ? new Date(h.nextHearingAt).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
      })
    : null;

  return (
    <Link
      to="/handoffs/$id"
      params={{ id: h.id }}
      className="group flex flex-col rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow-1)] transition-all hover:-translate-y-0.5 hover:border-foreground/30 hover:shadow-[var(--shadow-2)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {h.matterType} · {h.court}
          </p>
          <h2 className="mt-1.5 font-display text-base font-semibold leading-snug text-foreground group-hover:text-indigo">
            {h.caseName}
          </h2>
        </div>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-indigo" />
      </div>

      <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{h.summary}</p>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border/60 pt-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <FileText className="h-3 w-3" />
          {h.documentsCount} docs · {h.pagesIndexed} p
        </span>
        {next && (
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3 w-3" /> Hearing {next}
          </span>
        )}
        {urgent && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2 py-0.5 text-destructive">
            <AlertCircle className="h-3 w-3" /> Urgent
          </span>
        )}
      </div>
    </Link>
  );
}

