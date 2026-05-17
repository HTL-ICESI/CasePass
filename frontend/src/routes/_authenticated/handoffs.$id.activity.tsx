import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Activity as ActivityIcon,
  FileText,
  Inbox,
  MessageSquare,
  Sparkles,
  Upload,
  CheckCircle2,
  Download,
  StickyNote,
  Quote,
} from "lucide-react";

import { api } from "@/lib/api";
import type { ActivityEvent, ActivityKind } from "@/lib/api/types";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/handoffs/$id/activity")({
  head: () => ({ meta: [{ title: "Activity — CasePass" }] }),
  component: ActivityPage,
});

function ActivityPage() {
  const { id } = Route.useParams();
  const q = useQuery({
    queryKey: ["activity", id],
    queryFn: () => api.listActivity(id),
  });

  if (q.isLoading) return <Skeleton className="h-96 w-full" />;
  const events = q.data ?? [];

  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-8 text-center">
        <ActivityIcon className="mx-auto h-6 w-6 text-muted-foreground" />
        <p className="mt-3 font-display text-base font-medium">No activity yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Uploads, handoff acceptance, updates and exports will appear here.
        </p>
      </div>
    );
  }

  const grouped = groupByDay(events);

  return (
    <div className="grid gap-5 md:grid-cols-[2fr_1fr]">
      <section className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow-1)]">
        <header className="mb-5 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-muted">
            <ActivityIcon className="h-4 w-4" />
          </span>
          <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Audit trail · {events.length} events
          </h2>
        </header>

        <ol className="relative space-y-6 border-l border-border pl-6">
          {grouped.map(([day, items]) => (
            <li key={day} className="space-y-3">
              <p className="-ml-6 inline-block rounded-full border border-border bg-canvas px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {day}
              </p>
              <ul className="space-y-3">
                {items.map((e) => (
                  <li key={e.id} className="relative">
                    <span
                      className="absolute -left-[30px] top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground"
                      aria-hidden
                    >
                      <KindIcon kind={e.kind} />
                    </span>
                    <div className="rounded-md border border-border/70 bg-canvas px-3 py-2">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="text-sm leading-snug text-foreground">
                          <span className="font-medium">{e.actorName}</span>
                          {e.actorRole && (
                            <span className="ml-1.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                              {e.actorRole}
                            </span>
                          )}
                        </p>
                        <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                          {formatTime(e.at)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {e.summary}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>

      <aside className="space-y-4">
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow-1)]">
          <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Activity by kind
          </h3>
          <ul className="mt-3 space-y-2 text-sm">
            {summariseKinds(events).map(([kind, count]) => (
              <li key={kind} className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-foreground">
                  <KindIcon kind={kind} />
                  {KIND_LABEL[kind]}
                </span>
                <span className="font-mono text-xs text-muted-foreground">{count}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-border bg-indigo-soft/40 p-5 text-xs leading-relaxed text-foreground">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Why this matters
          </p>
          <p className="mt-2">
            The audit trail keeps the handoff defensible: every upload, acceptance,
            and post-action update is timestamped, attributed, and never deleted.
          </p>
        </div>
      </aside>
    </div>
  );
}

const KIND_LABEL: Record<ActivityKind, string> = {
  "matter.created": "Matter created",
  "matter.indexed": "Indexing finished",
  "document.uploaded": "Document uploaded",
  "handoff.accepted": "Handoff accepted",
  "update.posted": "Update posted",
  "chat.asked": "Chat question",
  "citation.copied": "Citation copied",
  "export.generated": "Export generated",
  "note.saved": "Handover note saved",
};

function KindIcon({ kind }: { kind: ActivityKind }) {
  const cls = "h-3.5 w-3.5";
  switch (kind) {
    case "matter.created":
      return <Sparkles className={cls} />;
    case "matter.indexed":
      return <FileText className={cls} />;
    case "document.uploaded":
      return <Upload className={cls} />;
    case "handoff.accepted":
      return <CheckCircle2 className={cls} />;
    case "update.posted":
      return <Inbox className={cls} />;
    case "chat.asked":
      return <MessageSquare className={cls} />;
    case "citation.copied":
      return <Quote className={cls} />;
    case "export.generated":
      return <Download className={cls} />;
    case "note.saved":
      return <StickyNote className={cls} />;
  }
}

function groupByDay(events: ActivityEvent[]): Array<[string, ActivityEvent[]]> {
  const map = new Map<string, ActivityEvent[]>();
  for (const e of events) {
    const d = new Date(e.at);
    const key = d.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  }
  return Array.from(map.entries());
}

function summariseKinds(events: ActivityEvent[]) {
  const counts: Partial<Record<ActivityKind, number>> = {};
  for (const e of events) counts[e.kind] = (counts[e.kind] ?? 0) + 1;
  return Object.entries(counts).sort((a, b) => b[1]! - a[1]!) as Array<[ActivityKind, number]>;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}
