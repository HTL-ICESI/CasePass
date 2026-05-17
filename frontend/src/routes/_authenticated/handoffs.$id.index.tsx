import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Calendar, FileMinus, Compass, Activity, Package, ArrowRight } from "lucide-react";

import { api } from "@/lib/api";
import { CitationChip } from "@/components/app/citation-chip";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/handoffs/$id/")({
  head: () => ({ meta: [{ title: "Overview — CasePass" }] }),
  component: OverviewPage,
});

function OverviewPage() {
  const { id } = Route.useParams();
  const review = useQuery({
    queryKey: ["matter-review", id],
    queryFn: () => api.getMatterReview(id),
  });
  const handoff = useQuery({
    queryKey: ["handoff", id],
    queryFn: () => api.getHandoff(id),
  });

  if (review.isLoading || handoff.isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-48 md:col-span-2" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  const r = review.data;
  const h = handoff.data;

  if (!r || !h) {
    return (
      <p className="text-sm text-muted-foreground">
        No structured brief is available for this matter yet.
      </p>
    );
  }

  return (
    <div className="grid gap-5 md:grid-cols-3">
      <div className="space-y-5 md:col-span-2">
        <Section icon={<Activity className="h-4 w-4" />} title="Where we stand">
          <p className="font-display text-lg font-medium text-foreground">{r.stage}</p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {h.summary}
          </p>
        </Section>

        <Section icon={<Compass className="h-4 w-4" />} title="Most recent event">
          <p className="text-sm leading-relaxed text-foreground">
            {r.lastEvent.text}{" "}
            {r.lastEvent.citation && <CitationChip citation={r.lastEvent.citation} />}
          </p>
        </Section>

        <Section
          icon={<AlertTriangle className="h-4 w-4 text-warning" />}
          title="Urgent issues"
          accent="warning"
        >
          {r.urgentIssues.length === 0 ? (
            <p className="text-sm text-muted-foreground">No urgent issues flagged.</p>
          ) : (
            <ul className="space-y-3">
              {r.urgentIssues.map((u, i) => (
                <li
                  key={i}
                  className="rounded-md border-l-2 border-warning/70 bg-warning/5 px-3 py-2 text-sm leading-relaxed text-foreground"
                >
                  {u.text} {u.citation && <CitationChip citation={u.citation} />}
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section icon={<Compass className="h-4 w-4 text-indigo" />} title="Next step">
          <p className="text-sm leading-relaxed text-foreground">
            {r.nextStep.text}{" "}
            {r.nextStep.citation && <CitationChip citation={r.nextStep.citation} />}
          </p>
        </Section>
      </div>

      <aside className="space-y-5">
        <Section icon={<Calendar className="h-4 w-4" />} title="Deadlines">
          {h.deadlines.length === 0 ? (
            <p className="text-sm text-muted-foreground">No scheduled deadlines.</p>
          ) : (
            <ul className="space-y-3">
              {h.deadlines.map((d) => (
                <li key={d.id} className="border-b border-border/60 pb-3 last:border-b-0 last:pb-0">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {formatDate(d.dueAt)}
                    {d.urgent && (
                      <span className="ml-2 rounded-sm bg-warning/15 px-1 py-0.5 text-[9px] font-semibold text-warning">
                        URGENT
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-sm text-foreground">{d.label}</p>
                  {d.citation && (
                    <div className="mt-1.5">
                      <CitationChip citation={d.citation} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section icon={<FileMinus className="h-4 w-4" />} title="Missing documents">
          {r.missingDocs.length === 0 ? (
            <p className="text-sm text-muted-foreground">File complete.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {r.missingDocs.map((m, i) => (
                <li key={i} className="flex items-start gap-2 text-foreground">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive/70" />
                  {m}
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Link
          to="/handoffs/$id/export"
          params={{ id }}
          className="group flex items-center gap-3 rounded-2xl border border-indigo/30 bg-indigo-soft/40 p-4 transition-colors hover:bg-indigo-soft/70"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-indigo text-white">
            <Package className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">Export handoff package</p>
            <p className="text-xs text-muted-foreground">Brief + sources + updates as PDF</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </Link>
      </aside>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  accent?: "warning";
}) {
  return (
    <section
      className={
        "rounded-2xl border bg-surface p-5 shadow-[var(--shadow-1)] " +
        (accent === "warning" ? "border-warning/30" : "border-border")
      }
    >
      <header className="mb-3 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-muted">
          {icon}
        </span>
        <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </h2>
      </header>
      {children}
    </section>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
