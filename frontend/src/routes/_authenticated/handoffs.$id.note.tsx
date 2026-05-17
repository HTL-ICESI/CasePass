import { createFileRoute, notFound } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileText, Loader2, Printer } from "lucide-react";
import { api } from "@/lib/api";
import type { Citation, Handoff, MatterReview } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CitationChip } from "@/components/app/citation-chip";
import { ProseWithCitations } from "@/components/app/prose-with-citations";
import { useAuth } from "@/lib/auth";
import { useOpenCitation } from "@/lib/handoff-citation-context";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/handoffs/$id/note")({
  head: () => ({ meta: [{ title: "Handover note — CasePass" }] }),
  component: NotePage,
});

function NotePage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const openCitation = useOpenCitation();
  const queryClient = useQueryClient();

  const handoff = useQuery({
    queryKey: ["handoff", id],
    queryFn: async () => {
      const h = await api.getHandoff(id);
      if (!h) throw notFound();
      return h;
    },
  });
  const review = useQuery({
    queryKey: ["matter-review", id],
    queryFn: () => api.getMatterReview(id),
  });

  const generateNote = useMutation({
    mutationFn: () => api.createHandoverNote(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["handoff", id] }),
        queryClient.invalidateQueries({ queryKey: ["matter-review", id] }),
      ]);
      toast.success("Handover note generated.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not generate the handover note."),
  });

  const approveNote = useMutation({
    mutationFn: () =>
      api.approveHandoverNote(id, h?.noteId || "", {
        approved: true,
        text: "Approved from frontend workflow.",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["handoff", id] });
      toast.success("Handover note approved.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not approve the note."),
  });

  const releasePack = useMutation({
    mutationFn: () => api.releaseHandoffPack(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["handoff", id] });
      toast.success("Handover pack released.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not release the handoff pack."),
  });

  if (handoff.isLoading || review.isLoading) {
    return <Skeleton className="h-[600px] w-full" />;
  }

  const h = handoff.data;
  const r = review.data;
  const isSender = Boolean(user && h && h.ownerId === user.id);
  const note = h?.latestNote;
  if (!h || !r) {
    return (
      <p className="text-sm text-muted-foreground">No handover note available for this matter.</p>
    );
  }

  const onDownload = () => downloadNoteText(h, r);
  const onPrint = () => window.print();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <FileText className="h-3.5 w-3.5" />
          Auto-generated brief · grounded in indexed documents
        </div>
        <div className="flex items-center gap-2 print:hidden">
          {isSender && h?.backendStatus === "pack_building" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateNote.mutate()}
              disabled={generateNote.isPending}
            >
              {generateNote.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Generate note
            </Button>
          )}
          {isSender && h?.backendStatus === "pack_review" && h?.noteId && !h.noteApproved && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => approveNote.mutate()}
              disabled={approveNote.isPending}
            >
              {approveNote.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Approve note
            </Button>
          )}
          {isSender && h?.backendStatus === "pack_review" && h?.noteApproved && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => releasePack.mutate()}
              disabled={releasePack.isPending}
            >
              {releasePack.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Release pack
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onPrint}>
            <Printer className="h-3.5 w-3.5" /> Print
          </Button>
          <Button size="sm" onClick={onDownload}>
            <Download className="h-3.5 w-3.5" /> Download note
          </Button>
        </div>
      </div>

      <article
        id="handover-note"
        className="mx-auto max-w-3xl rounded-2xl border border-border bg-surface px-10 py-12 shadow-[var(--shadow-1)] print:border-0 print:shadow-none print:p-0"
      >
        <header className="border-b border-border pb-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            CasePass · Handover note
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">{h.caseName}</h1>
          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
            <Row label="Matter type" value={h.matterType} />
            <Row label="Court" value={h.court} />
            <Row label="Parties" value={`${h.parties.plaintiff} v. ${h.parties.defendant}`} />
            <Row label="Next hearing" value={h.nextHearingAt ? formatDate(h.nextHearingAt) : "—"} />
            <Row label="File volume" value={`${h.documentsCount} docs · ${h.pagesIndexed} pages`} />
            <Row label="Prepared" value={formatDate(new Date().toISOString())} />
          </dl>
        </header>

        <Block title="Executive summary">
          <ProseWithCitations
            text={note?.executiveSummary || h.summary}
            onOpenCitation={openCitation}
          />
        </Block>

        <Block title="Where we stand">
          <p className="font-display text-base font-medium text-foreground">
            {note?.currentProceduralStatus || r.stage}{" "}
            {(note?.currentProceduralStatusCitation || r.stageCitation) && (
              <CitationChip
                citation={(note?.currentProceduralStatusCitation || r.stageCitation)!}
                anchorText={note?.currentProceduralStatus || r.stage}
                onOpenDocument={openCitation}
              />
            )}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-foreground">
            {r.lastEvent.text}{" "}
            {r.lastEvent.citation && (
              <CitationChip
                citation={r.lastEvent.citation}
                anchorText={r.lastEvent.text}
                onOpenDocument={openCitation}
              />
            )}
          </p>
        </Block>

        <Block title="Urgent issues">
          {(note?.riskFlags?.length || r.urgentIssues.length) === 0 ? (
            <p className="text-sm text-muted-foreground">None flagged.</p>
          ) : (
            <ol className="space-y-3 text-sm leading-relaxed text-foreground">
              {(note?.riskFlags || r.urgentIssues).map((u, i) => (
                <li key={i} className="flex gap-3">
                  <span className="font-mono text-[10px] text-muted-foreground pt-0.5">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>
                    {u.text}{" "}
                    {u.citation && (
                      <CitationChip
                        citation={u.citation}
                        anchorText={u.text}
                        onOpenDocument={openCitation}
                      />
                    )}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Block>

        <Block title="Deadlines">
          {(note?.liveDeadlines?.length || h.deadlines.length) === 0 ? (
            <p className="text-sm text-muted-foreground">None scheduled.</p>
          ) : (
            <ul className="space-y-2 text-sm text-foreground">
              {note?.liveDeadlines?.length
                ? note.liveDeadlines.map((d, index) => (
                    <li key={`note-${index}`} className="flex items-baseline justify-between gap-4">
                      <span>
                        {d.text}{" "}
                        {d.citation && (
                          <CitationChip
                            citation={d.citation}
                            anchorText={d.text}
                            onOpenDocument={openCitation}
                          />
                        )}
                      </span>
                    </li>
                  ))
                : h.deadlines.map((d) => (
                    <li key={d.id} className="flex items-baseline justify-between gap-4">
                      <span>
                        {d.label}{" "}
                        {d.citation && (
                          <CitationChip
                            citation={d.citation}
                            anchorText={d.label}
                            onOpenDocument={openCitation}
                          />
                        )}
                      </span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {formatDate(d.dueAt)}
                      </span>
                    </li>
                  ))}
            </ul>
          )}
        </Block>

        <Block title="Missing documents">
          {r.missingDocs.length === 0 ? (
            <p className="text-sm text-muted-foreground">File complete.</p>
          ) : (
            <ul className="space-y-1.5 text-sm text-foreground">
              {r.missingDocs.map((m, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive/70" />
                  {m}
                </li>
              ))}
            </ul>
          )}
        </Block>

        <Block title="Recommended next step">
          <p className="text-sm leading-relaxed text-foreground">
            {note?.nextRequiredStep || r.nextStep.text}{" "}
            {!note?.nextRequiredStep && r.nextStep.citation && (
              <CitationChip
                citation={r.nextStep.citation}
                anchorText={r.nextStep.text}
                onOpenDocument={openCitation}
              />
            )}
          </p>
        </Block>

        {note?.fileBasedFacts && note.fileBasedFacts.length > 0 && (
          <Block title="File-based facts">
            <ul className="space-y-3 text-sm leading-relaxed text-foreground">
              {note.fileBasedFacts.map((fact, index) => (
                <li key={index}>
                  {fact.text}{" "}
                  {fact.citation && (
                    <CitationChip
                      citation={fact.citation}
                      anchorText={fact.text}
                      onOpenDocument={openCitation}
                    />
                  )}
                </li>
              ))}
            </ul>
          </Block>
        )}

        {note?.strategicNotes && note.strategicNotes.length > 0 && (
          <Block title="Strategic notes">
            <ul className="space-y-3 text-sm leading-relaxed text-foreground">
              {note.strategicNotes.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </Block>
        )}

        <footer className="mt-10 border-t border-border pt-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Generated by CasePass · All assertions are grounded in cited documents.
        </footer>
      </article>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="text-foreground">{value}</dd>
    </>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
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

function citeStr(c?: Citation) {
  return c ? ` [Doc: ${c.doc}, p.${c.page}]` : "";
}

function downloadNoteText(h: Handoff, r: MatterReview) {
  const meta: Array<[string, string]> = [
    ["Matter type", h.matterType],
    ["Court", h.court],
    ["Parties", `${h.parties.plaintiff} v. ${h.parties.defendant}`],
    ["Next hearing", h.nextHearingAt ? formatDate(h.nextHearingAt) : "—"],
    ["File volume", `${h.documentsCount} docs · ${h.pagesIndexed} pages`],
    ["Prepared", formatDate(new Date().toISOString())],
  ];

  const sections = [
    "CASEPASS - HANDOVER NOTE",
    "",
    h.caseName,
    "",
    ...meta.map(([label, value]) => `${label}: ${value}`),
    "",
    "Executive summary",
    h.summary,
    "",
    "Where we stand",
    r.stage,
    `${r.lastEvent.text}${citeStr(r.lastEvent.citation)}`,
    "",
    "Urgent issues",
    ...(r.urgentIssues.length
      ? r.urgentIssues.map((item, index) => `${index + 1}. ${item.text}${citeStr(item.citation)}`)
      : ["None flagged."]),
    "",
    "Deadlines",
    ...(h.deadlines.length
      ? h.deadlines.map(
          (deadline) =>
            `${formatDate(deadline.dueAt)} - ${deadline.label}${citeStr(deadline.citation)}`,
        )
      : ["None scheduled."]),
    "",
    "Missing documents",
    ...(r.missingDocs.length ? r.missingDocs : ["File complete."]),
    "",
    "Recommended next step",
    `${r.nextStep.text}${citeStr(r.nextStep.citation)}`,
    "",
    "Generated by CasePass. All assertions grounded in cited documents.",
  ];
  const safe = h.caseName.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const blob = new Blob([sections.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `casepass-handover-${safe}.txt`;
  link.click();
  URL.revokeObjectURL(url);
}
