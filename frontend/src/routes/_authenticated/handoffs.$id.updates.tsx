import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, CheckCircle2, FileText, Paperclip, Plus, Send, User2, X } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import type { MatterUpdate } from "@/lib/api/types";
import { ROLE_LABEL, useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { CitationChip } from "@/components/app/citation-chip";

export const Route = createFileRoute("/_authenticated/handoffs/$id/updates")({
  head: () => ({ meta: [{ title: "Updates — CasePass" }] }),
  component: UpdatesPage,
});

function UpdatesPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: updates, isLoading } = useQuery({
    queryKey: ["matter-updates", id],
    queryFn: () => api.listUpdates(id),
  });

  const [whatWasDone, setWhatWasDone] = useState("");
  const [whatHappened, setWhatHappened] = useState("");
  const [whatFollows, setWhatFollows] = useState("");
  const [hearingAt, setHearingAt] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [filename, setFilename] = useState("");

  const reset = () => {
    setWhatWasDone("");
    setWhatHappened("");
    setWhatFollows("");
    setHearingAt("");
    setAttachments([]);
    setFilename("");
  };

  const mutation = useMutation({
    mutationFn: () =>
      api.createUpdate({
        matterId: id,
        authorName: user?.name ?? "Unknown",
        authorRole: roleLabelFor(user?.role),
        whatWasDone: whatWasDone.trim(),
        whatHappened: whatHappened.trim(),
        whatFollows: whatFollows.trim(),
        hearingAt: hearingAt || undefined,
        attachments,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matter-updates", id] });
      toast.success("Update logged", { description: "Timeline refreshed." });
      reset();
    },
  });

  const addAttachment = () => {
    const name = filename.trim();
    if (!name) return;
    setAttachments((prev) => [...prev, name]);
    setFilename("");
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!whatWasDone.trim() || !whatHappened.trim() || !whatFollows.trim()) {
      toast.error("Complete the three narrative fields.");
      return;
    }
    mutation.mutate();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section className="space-y-4">
        <header className="flex items-center justify-between">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Timeline · {updates?.length ?? 0} updates
          </h2>
        </header>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : updates && updates.length > 0 ? (
          <ol className="relative space-y-5 before:absolute before:left-[15px] before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-border">
            {updates.map((u) => (
              <TimelineItem key={u.id} update={u} />
            ))}
          </ol>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-surface px-8 py-14 text-center">
            <CheckCircle2 className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium text-foreground">No updates yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Log the first post-action update using the form on the right.
            </p>
          </div>
        )}
      </section>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow-1)]"
        >
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-indigo">
              Log update
            </p>
            <h3 className="mt-1 font-display text-lg font-semibold tracking-tight">
              Record an action
            </h3>
          </div>

          <Field label="What was done">
            <Textarea
              required
              rows={2}
              value={whatWasDone}
              onChange={(e) => setWhatWasDone(e.target.value)}
              placeholder="e.g. Filed reply to amended defence."
            />
          </Field>

          <Field label="What happened">
            <Textarea
              required
              rows={2}
              value={whatHappened}
              onChange={(e) => setWhatHappened(e.target.value)}
              placeholder="Court / counterparty response."
            />
          </Field>

          <Field label="What follows">
            <Textarea
              required
              rows={2}
              value={whatFollows}
              onChange={(e) => setWhatFollows(e.target.value)}
              placeholder="Next concrete step and owner."
            />
          </Field>

          <Field label="Hearing date (optional)">
            <Input
              type="date"
              value={hearingAt ? hearingAt.slice(0, 10) : ""}
              onChange={(e) =>
                setHearingAt(e.target.value ? new Date(e.target.value).toISOString() : "")
              }
            />
          </Field>

          <Field label="Attach documents">
            <div className="flex gap-2">
              <Input
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addAttachment();
                  }
                }}
                placeholder="filename.pdf"
              />
              <Button type="button" variant="outline" size="icon" onClick={addAttachment}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {attachments.length > 0 && (
              <ul className="mt-2 space-y-1">
                {attachments.map((a, i) => (
                  <li
                    key={`${a}-${i}`}
                    className="flex items-center justify-between gap-2 rounded-md border border-border bg-background px-2 py-1 text-xs"
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <Paperclip className="h-3 w-3 text-muted-foreground" />
                      <span className="truncate">{a}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setAttachments((p) => p.filter((_, idx) => idx !== i))}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Field>

          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            <Send className="h-3.5 w-3.5" />
            {mutation.isPending ? "Logging…" : "Log update"}
          </Button>
        </form>
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function TimelineItem({ update }: { update: MatterUpdate }) {
  return (
    <li className="relative pl-10">
      <span className="absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface shadow-[var(--shadow-1)]">
        <User2 className="h-3.5 w-3.5 text-indigo" />
      </span>
      <article className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow-1)]">
        <header className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-foreground">{update.authorName}</p>
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {update.authorRole}
            </p>
          </div>
          <time className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {formatDateTime(update.createdAt)}
          </time>
        </header>

        <dl className="mt-4 space-y-3 text-sm">
          <Row label="What was done" text={update.whatWasDone} />
          <Row label="What happened" text={update.whatHappened} />
          <Row label="What follows" text={update.whatFollows} />
        </dl>

        {(update.hearingAt || update.attachments.length > 0 || update.citations.length > 0) && (
          <footer className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-3 text-xs">
            {update.hearingAt && (
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="h-3 w-3" />
                Hearing {formatDate(update.hearingAt)}
              </span>
            )}
            {update.attachments.map((a) => (
              <span
                key={a}
                className="inline-flex items-center gap-1.5 rounded-md bg-muted px-1.5 py-0.5 text-foreground"
              >
                <FileText className="h-3 w-3 text-muted-foreground" />
                {a}
              </span>
            ))}
            {update.citations.map((c, i) => (
              <CitationChip key={i} citation={c} />
            ))}
          </footer>
        )}
      </article>
    </li>
  );
}

function Row({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 leading-relaxed text-foreground">{text}</dd>
    </div>
  );
}

function roleLabelFor(role?: "solicitor" | "receiving" | "admin"): MatterUpdate["authorRole"] {
  if (!role) return "Solicitor";
  const map = {
    solicitor: "Solicitor",
    receiving: "Receiving counsel",
    admin: "Firm admin",
  } as const;
  // ROLE_LABEL kept imported for consistency with rest of app.
  void ROLE_LABEL;
  return map[role];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} · ${d.toLocaleTimeString(
    "en-GB",
    { hour: "2-digit", minute: "2-digit" },
  )}`;
}
