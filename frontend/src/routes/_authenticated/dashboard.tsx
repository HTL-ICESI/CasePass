import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Search, Filter, FileText, Calendar, Inbox, Layers, Trash2, Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth, ROLE_LABEL } from "@/lib/auth";
import { api } from "@/lib/api";
import type { Handoff, ListHandoffsParams, MatterStatus, MatterType } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — CasePass" }] }),
  component: DashboardPage,
});

const STATUS_OPTIONS: Array<{ value: MatterStatus | "all"; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "intake", label: "Intake" },
  { value: "indexed", label: "Indexed" },
  { value: "handoff-active", label: "Handoff active" },
  { value: "in-review", label: "In review" },
  { value: "closed", label: "Closed" },
];

const TYPE_OPTIONS: Array<{ value: MatterType | "all"; label: string }> = [
  { value: "all", label: "All matter types" },
  { value: "Commercial litigation", label: "Commercial litigation" },
  { value: "Employment", label: "Employment" },
  { value: "Real estate", label: "Real estate" },
  { value: "Insolvency", label: "Insolvency" },
  { value: "Regulatory", label: "Regulatory" },
  { value: "Family", label: "Family" },
];

function DashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<MatterStatus | "all">("all");
  const [type, setType] = useState<MatterType | "all">("all");

  const scope: ListHandoffsParams["scope"] =
    user?.role === "admin" ? "firm" : user?.role === "receiving" ? "inbox" : "mine";

  const kpis = useQuery({
    queryKey: ["dashboard-kpis", user?.id],
    queryFn: () => api.getDashboardKpis(user!.id),
    enabled: !!user,
    staleTime: 30_000,
  });

  const list = useQuery({
    queryKey: ["handoffs", scope, user?.id, search, status, type],
    queryFn: () =>
      api.listHandoffs({
        scope,
        forUserId: user!.id,
        search: search || undefined,
        status,
        matterType: type,
      }),
    enabled: !!user,
    staleTime: 15_000,
  });

  const deleteCase = useMutation({
    mutationFn: (caseId: string) => api.deleteCase(caseId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["handoffs"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-kpis"] }),
        queryClient.invalidateQueries({ queryKey: ["inbox"] }),
      ]);
      toast.success("Case deleted.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not delete case."),
  });

  if (!user) return null;

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-indigo">
            {ROLE_LABEL[user.role]} workspace
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">
            {user.role === "receiving" ? "Your inbox" : `Hello, ${user.name.split(" ")[0]}.`}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {user.role === "admin"
              ? "Every matter across the firm."
              : user.role === "receiving"
                ? "Matters handed to you, ready to brief."
                : "Your matters, ordered by next hearing."}
          </p>
        </div>
      </header>

      <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<Layers className="h-4 w-4" />}
          label="Active matters"
          value={kpis.data?.activeMatters}
          loading={kpis.isLoading}
        />
        <KpiCard
          icon={<Calendar className="h-4 w-4" />}
          label="Deadlines this week"
          value={kpis.data?.deadlinesThisWeek}
          loading={kpis.isLoading}
          accent="mint"
        />
        <KpiCard
          icon={<Inbox className="h-4 w-4" />}
          label="Pending handoffs"
          value={kpis.data?.pendingHandoffs}
          loading={kpis.isLoading}
        />
        <KpiCard
          icon={<FileText className="h-4 w-4" />}
          label="Pages indexed"
          value={kpis.data?.pagesIndexed}
          loading={kpis.isLoading}
        />
      </section>

      <section className="mt-10 rounded-2xl border border-border bg-surface shadow-[var(--shadow-1)]">
        <div className="flex flex-wrap items-center gap-3 border-b border-border/70 p-4">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by case, party, court…"
              className="pl-9"
              aria-label="Search matters"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="hidden h-4 w-4 text-muted-foreground sm:block" aria-hidden />
            <Select value={status} onValueChange={(v) => setStatus(v as MatterStatus | "all")}>
              <SelectTrigger className="w-[160px]" aria-label="Filter by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={type} onValueChange={(v) => setType(v as MatterType | "all")}>
              <SelectTrigger className="w-[180px]" aria-label="Filter by matter type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <MattersTable
          loading={list.isLoading}
          handoffs={list.data ?? []}
          empty={!list.isLoading && (list.data?.length ?? 0) === 0}
          deletingCaseId={deleteCase.variables}
          onDelete={(caseId) => deleteCase.mutate(caseId)}
        />
      </section>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  loading,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value?: number;
  loading?: boolean;
  accent?: "mint";
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow-1)]">
      <div className="flex items-center gap-2">
        <span
          className={
            "flex h-8 w-8 items-center justify-center rounded-lg " +
            (accent === "mint" ? "bg-mint-soft text-onyx" : "bg-indigo-soft text-onyx")
          }
        >
          {icon}
        </span>
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
      </div>
      <div className="mt-3">
        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <p className="font-display text-3xl font-semibold tracking-tight text-foreground">
            {value ?? "—"}
          </p>
        )}
      </div>
    </div>
  );
}

function MattersTable({
  loading,
  handoffs,
  empty,
  deletingCaseId,
  onDelete,
}: {
  loading: boolean;
  handoffs: Handoff[];
  empty: boolean;
  deletingCaseId?: string;
  onDelete: (caseId: string) => void;
}) {
  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (empty) {
    return (
      <div className="px-6 py-16 text-center">
        <h3 className="font-display text-lg font-semibold">No matters match those filters</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Clear the search or pick a broader status to see more.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/70 text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <th className="px-5 py-3 font-medium">Matter</th>
            <th className="px-3 py-3 font-medium">Type</th>
            <th className="px-3 py-3 font-medium">Court</th>
            <th className="px-3 py-3 font-medium">Status</th>
            <th className="px-3 py-3 font-medium">Next hearing</th>
            <th className="px-5 py-3 text-right font-medium">Indexed</th>
            <th className="px-5 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {handoffs.map((h) => (
            <tr
              key={h.id}
              className="group border-b border-border/50 last:border-b-0 transition-colors hover:bg-muted/40"
            >
              <td className="px-5 py-4">
                <Link to="/handoffs/$id" params={{ id: h.id }} className="block">
                  <p className="font-display text-sm font-semibold text-foreground group-hover:text-indigo">
                    {h.caseName}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {h.parties.plaintiff}
                    {h.parties.defendant !== "—" && ` v. ${h.parties.defendant}`}
                  </p>
                </Link>
              </td>
              <td className="px-3 py-4 text-xs text-muted-foreground">{h.matterType}</td>
              <td className="px-3 py-4 text-xs text-muted-foreground">{h.court}</td>
              <td className="px-3 py-4">
                <StatusChip status={h.status} />
              </td>
              <td className="px-3 py-4 text-xs text-foreground">
                {h.nextHearingAt ? formatDate(h.nextHearingAt) : "—"}
              </td>
              <td className="px-5 py-4 text-right font-mono text-[11px] text-muted-foreground">
                {h.documentsCount} docs · {h.pagesIndexed} p
              </td>
              <td className="px-5 py-4 text-right">
                <DeleteCaseButton
                  handoff={h}
                  deleting={deletingCaseId === h.caseId}
                  onDelete={() => onDelete(h.caseId)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DeleteCaseButton({
  handoff,
  deleting,
  onDelete,
}: {
  handoff: Handoff;
  deleting: boolean;
  onDelete: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          aria-label={`Delete ${handoff.caseName}`}
          disabled={deleting}
        >
          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this case?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes “{handoff.caseName}” from CasePass, including its handoffs, documents,
            notes, updates, and indexed sources.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete case
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function StatusChip({ status }: { status: MatterStatus }) {
  const map: Record<MatterStatus, { label: string; cls: string; pulse?: boolean }> = {
    intake: { label: "Intake", cls: "bg-muted text-foreground" },
    indexed: { label: "Indexed", cls: "bg-indigo-soft text-onyx" },
    "handoff-active": { label: "Handoff active", cls: "bg-mint-soft text-onyx", pulse: true },
    "in-review": { label: "In review", cls: "bg-indigo-soft text-onyx" },
    closed: { label: "Closed", cls: "bg-muted text-muted-foreground" },
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
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
