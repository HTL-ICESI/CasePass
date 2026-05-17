import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, Layers, Calendar, FileText, ArrowUpRight } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import type { Handoff, MatterStatus } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Firm overview — CasePass" }] }),
  component: AdminHome,
});

function AdminHome() {
  const { user } = useAuth();

  const kpis = useQuery({
    queryKey: ["admin-kpis"],
    queryFn: () => api.getDashboardKpis(user!.id),
    enabled: !!user,
  });

  const list = useQuery({
    queryKey: ["admin-handoffs"],
    queryFn: () => api.listHandoffs(),
    enabled: !!user,
  });
  const usersQuery = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => api.listUsers(),
    enabled: !!user,
  });

  const matters = list.data ?? [];
  const firmUsers = usersQuery.data ?? [];
  const solicitors = firmUsers.filter((u) => u.role === "solicitor").length;
  const receivers = firmUsers.filter((u) => u.role === "receiving").length;
  const admins = firmUsers.filter((u) => u.role === "admin").length;
  const disabled = firmUsers.filter((u) => u.status === "disabled").length;

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-indigo">Admin</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">
          Firm overview
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Every matter across teams, with indexing volume and handoff health.
        </p>
      </header>

      <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={<Layers className="h-4 w-4" />} label="Active matters" value={kpis.data?.activeMatters} loading={kpis.isLoading} />
        <Stat icon={<Calendar className="h-4 w-4" />} label="Deadlines this week" value={kpis.data?.deadlinesThisWeek} loading={kpis.isLoading} accent />
        <Stat icon={<FileText className="h-4 w-4" />} label="Pages indexed" value={kpis.data?.pagesIndexed} loading={kpis.isLoading} />
        <Stat icon={<Building2 className="h-4 w-4" />} label="Team members" value={solicitors + receivers + 1} loading={false} />
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-2xl border border-border bg-surface shadow-[var(--shadow-1)]">
          <div className="flex items-center justify-between border-b border-border/70 px-5 py-3">
            <h2 className="font-display text-sm font-semibold">Recent matters</h2>
            <Link to="/dashboard" className="font-mono text-[10px] uppercase tracking-wider text-indigo hover:underline">
              View all
            </Link>
          </div>
          {list.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {matters.slice(0, 6).map((h) => (
                <MatterRow key={h.id} h={h} />
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow-1)]">
          <h2 className="font-display text-sm font-semibold">Team composition</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <Row label="Solicitors" value={solicitors} />
            <Row label="Receiving counsel" value={receivers} />
            <Row label="Admins" value={admins} />
            <Row label="Disabled users" value={disabled} muted />
          </dl>
          <Link
            to="/admin/users"
            className="mt-5 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-indigo hover:underline"
          >
            Manage users <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </section>
    </div>
  );
}

function Stat({ icon, label, value, loading, accent }: { icon: React.ReactNode; label: string; value?: number; loading: boolean; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow-1)]">
      <div className="flex items-center gap-2">
        <span className={"flex h-8 w-8 items-center justify-center rounded-lg " + (accent ? "bg-mint-soft text-onyx" : "bg-indigo-soft text-onyx")}>{icon}</span>
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
      <div className="mt-3">
        {loading ? <Skeleton className="h-8 w-20" /> : <p className="font-display text-3xl font-semibold tracking-tight">{value ?? "—"}</p>}
      </div>
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className={"text-xs " + (muted ? "text-muted-foreground" : "text-foreground")}>{label}</dt>
      <dd className="font-mono text-sm font-semibold">{value}</dd>
    </div>
  );
}

function MatterRow({ h }: { h: Handoff }) {
  return (
    <li>
      <Link to="/handoffs/$id" params={{ id: h.id }} className="flex items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-muted/40">
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-semibold">{h.caseName}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{h.matterType} · {h.court}</p>
        </div>
        <StatusChip status={h.status} />
      </Link>
    </li>
  );
}

function StatusChip({ status }: { status: MatterStatus }) {
  const map: Record<MatterStatus, { label: string; cls: string }> = {
    intake: { label: "Intake", cls: "bg-muted text-foreground" },
    indexed: { label: "Indexed", cls: "bg-indigo-soft text-onyx" },
    "handoff-active": { label: "Handoff", cls: "bg-mint-soft text-onyx" },
    "in-review": { label: "In review", cls: "bg-indigo-soft text-onyx" },
    closed: { label: "Closed", cls: "bg-muted text-muted-foreground" },
  };
  const m = map[status];
  return <span className={"inline-flex shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider " + m.cls}>{m.label}</span>;
}
