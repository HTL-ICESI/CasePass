import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Inbox,
  Search,
  ArrowUpRight,
  Clock,
  FileText,
  AlertCircle,
  Trash2,
  Loader2,
} from "lucide-react";

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
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import type { Handoff } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/inbox")({
  head: () => ({ meta: [{ title: "Inbox — CasePass" }] }),
  component: InboxPage,
});

function InboxPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const list = useQuery({
    queryKey: ["inbox", user?.id, search],
    queryFn: () =>
      api.listHandoffs({ scope: "inbox", forUserId: user!.id, search: search || undefined }),
    enabled: !!user,
    staleTime: 15_000,
  });

  const deleteCase = useMutation({
    mutationFn: (caseId: string) => api.deleteCase(caseId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["inbox"] }),
        queryClient.invalidateQueries({ queryKey: ["handoffs"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-kpis"] }),
      ]);
      toast.success("Case deleted.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not delete case."),
  });

  if (!user) return null;
  const items = list.data ?? [];

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-mint">
            Receiving counsel
          </p>
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
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            Could not load inbox:{" "}
            {list.error instanceof Error ? list.error.message : String(list.error)}
          </div>
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {items.map((h) => (
              <InboxCard
                key={h.id}
                handoff={h}
                deleting={deleteCase.variables === h.caseId}
                onDelete={() => deleteCase.mutate(h.caseId)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function InboxCard({
  handoff: h,
  deleting,
  onDelete,
}: {
  handoff: Handoff;
  deleting: boolean;
  onDelete: () => void;
}) {
  const urgent = h.deadlines.find((d) => d.urgent);
  const next = h.nextHearingAt
    ? new Date(h.nextHearingAt).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
      })
    : null;

  return (
    <article className="group relative rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow-1)] transition-all hover:-translate-y-0.5 hover:border-foreground/30 hover:shadow-[var(--shadow-2)]">
      <div className="flex items-start justify-between gap-3">
        <Link to="/handoffs/$id" params={{ id: h.id }} className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {h.matterType} · {h.court}
          </p>
          <h2 className="mt-1.5 font-display text-base font-semibold leading-snug text-foreground group-hover:text-indigo">
            {h.caseName}
          </h2>
        </Link>
        <div className="flex items-center gap-1">
          <DeleteCaseButton handoff={h} deleting={deleting} onDelete={onDelete} />
          <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-indigo" />
        </div>
      </div>

      <Link to="/handoffs/$id" params={{ id: h.id }} className="block">
        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{h.summary}</p>
      </Link>

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
    </article>
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

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface px-6 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-mint-soft text-onyx">
        <Inbox className="h-5 w-5" />
      </span>
      <h2 className="mt-4 font-display text-lg font-semibold">Nothing routed your way</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        When a solicitor sends a matter your way, it will land here with the brief, deadlines and
        cited sources ready to open.
      </p>
    </div>
  );
}
