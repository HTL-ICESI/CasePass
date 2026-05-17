import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Calendar,
  FileMinus,
  Compass,
  Activity,
  Loader2,
  FileText,
  Gavel,
  Users,
} from "lucide-react";

import { api } from "@/lib/api";
import type { Citation, Handoff, MatterReview, ReviewNote } from "@/lib/api";
import { CitationChip } from "@/components/app/citation-chip";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useOpenCitation } from "@/lib/handoff-citation-context";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/handoffs/$id/")({
  head: () => ({ meta: [{ title: "Overview — CasePass" }] }),
  component: OverviewPage,
});

function OverviewPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const openCitation = useOpenCitation();
  const queryClient = useQueryClient();
  const review = useQuery({
    queryKey: ["matter-review", id],
    queryFn: () => api.getMatterReview(id),
  });
  const handoff = useQuery({
    queryKey: ["handoff", id],
    queryFn: () => api.getHandoff(id),
  });

  const approveClearance = useMutation({
    mutationFn: () => api.approveClearance(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["handoff", id] }),
        queryClient.invalidateQueries({ queryKey: ["handoffs"] }),
      ]);
      toast.success("Clearance approved.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not approve clearance."),
  });

  const acceptHandoff = useMutation({
    mutationFn: () => api.acceptHandoff(id, "limited"),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["handoff", id] });
      toast.success("Handoff accepted.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not accept the handoff."),
  });

  const refreshBrief = useMutation({
    mutationFn: () => api.createHandoverNote(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["handoff", id] }),
        queryClient.invalidateQueries({ queryKey: ["matter-review", id] }),
      ]);
      toast.success("AI brief refreshed.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not refresh the AI brief."),
  });

  if (handoff.isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-48 md:col-span-2" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  const h = handoff.data;
  const r = h ? (review.data ?? buildFallbackReview(h)) : null;
  const isReceiver = Boolean(user && h && h.receivingId === user.id);
  const isSender = Boolean(user && h && h.ownerId === user.id);

  if (!h) {
    return <p className="text-sm text-muted-foreground">Matter details are not available yet.</p>;
  }
  const overview = buildOverviewModel(h, r);
  const canRefreshBrief = isSender && ["pack_building", "pack_review"].includes(h.backendStatus);

  return (
    <div className="grid gap-5 md:grid-cols-3">
      <div className="space-y-5 md:col-span-2">
        <Section icon={<Activity className="h-4 w-4" />} title="Where we stand">
          <div className="space-y-4">
            <p className="text-lg font-semibold leading-snug text-foreground">
              {overview.headline}
            </p>
            <div className="grid gap-2 text-sm md:grid-cols-2">
              <MetaItem icon={<Users className="h-3.5 w-3.5" />} label="Parties">
                {h.parties.plaintiff} v. {h.parties.defendant}
              </MetaItem>
              <MetaItem icon={<Gavel className="h-3.5 w-3.5" />} label="Forum">
                {h.court}
              </MetaItem>
              <MetaItem icon={<FileText className="h-3.5 w-3.5" />} label="File">
                {h.documentsCount} docs · {h.pagesIndexed} pages indexed
              </MetaItem>
              <MetaItem icon={<Calendar className="h-3.5 w-3.5" />} label="Next hearing">
                {h.nextHearingAt ? formatDate(h.nextHearingAt) : "Not recorded"}
              </MetaItem>
            </div>
            <div className="space-y-2">
              {overview.coreFacts.map((fact) => (
                <FactLine key={fact.key} note={fact} onOpenCitation={openCitation} />
              ))}
            </div>
            {overview.summary && (
              <div className="border-t border-border/60 pt-3">
                <FactLine note={overview.summary} onOpenCitation={openCitation} />
              </div>
            )}
            {canRefreshBrief && (
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refreshBrief.mutate()}
                  disabled={refreshBrief.isPending}
                >
                  {refreshBrief.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  {h.noteId ? "Refresh AI brief" : "Generate AI brief"}
                </Button>
              </div>
            )}
          </div>
        </Section>

        {overview.fileFacts.length > 0 && (
          <Section icon={<FileText className="h-4 w-4" />} title="Key file facts">
            <ul className="space-y-3">
              {overview.fileFacts.map((fact) => (
                <li
                  key={fact.key}
                  className="rounded-md border border-border/60 bg-canvas/30 px-3 py-2"
                >
                  <FactLine note={fact} onOpenCitation={openCitation} />
                </li>
              ))}
            </ul>
          </Section>
        )}

        <Section icon={<Compass className="h-4 w-4" />} title="Most recent event">
          <FactLine note={overview.recentEvent} onOpenCitation={openCitation} />
        </Section>

        {overview.urgentIssues.length > 0 && (
          <Section
            icon={<AlertTriangle className="h-4 w-4 text-warning" />}
            title="Urgent issues"
            accent="warning"
          >
            <ul className="space-y-2">
              {overview.urgentIssues.map((u) => (
                <li
                  key={u.key}
                  className="rounded-md border-l-2 border-warning/70 bg-warning/5 px-3 py-2"
                >
                  <FactLine note={u} onOpenCitation={openCitation} />
                </li>
              ))}
            </ul>
          </Section>
        )}

        <Section icon={<Compass className="h-4 w-4 text-indigo" />} title="Next step">
          <FactLine note={overview.nextStep} onOpenCitation={openCitation} />
          <div className="mt-4 flex flex-wrap gap-2">
            {isReceiver && h.backendStatus === "clearance_pending" && (
              <Button
                size="sm"
                onClick={() => approveClearance.mutate()}
                disabled={approveClearance.isPending}
              >
                {approveClearance.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : null}
                Approve clearance
              </Button>
            )}
            {isReceiver && h.backendStatus === "pack_released" && (
              <Button
                size="sm"
                onClick={() => acceptHandoff.mutate()}
                disabled={acceptHandoff.isPending}
              >
                {acceptHandoff.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Accept handoff
              </Button>
            )}
          </div>
        </Section>
      </div>

      <aside className="space-y-5">
        <Section icon={<FileText className="h-4 w-4" />} title="Evidence consulted">
          <div className="space-y-2">
            {overview.evidence.length === 0 ? (
              <p className="text-sm text-muted-foreground">No cited chunks available yet.</p>
            ) : (
              overview.evidence.map((evidence) => (
                <EvidenceRow
                  key={`${evidence.doc}:${evidence.page}`}
                  citation={evidence}
                  onOpenCitation={openCitation}
                />
              ))
            )}
          </div>
        </Section>

        <Section icon={<Calendar className="h-4 w-4" />} title="Deadlines">
          {h.deadlines.length === 0 && overview.liveDeadlines.length === 0 ? (
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
                      <CitationChip
                        citation={d.citation}
                        anchorText={d.label}
                        onOpenDocument={openCitation}
                      />
                    </div>
                  )}
                </li>
              ))}
              {overview.liveDeadlines.map((d) => (
                <li
                  key={d.key}
                  className="border-b border-border/60 pb-3 last:border-b-0 last:pb-0"
                >
                  <FactLine note={d} onOpenCitation={openCitation} />
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
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-muted">{icon}</span>
        <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </h2>
      </header>
      {children}
    </section>
  );
}

function MetaItem({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-border/60 bg-canvas/30 px-3 py-2">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 text-sm leading-snug text-foreground">{children}</p>
      </div>
    </div>
  );
}

function FactLine({
  note,
  onOpenCitation,
}: {
  note: DisplayNote;
  onOpenCitation: (citation: Citation) => void;
}) {
  return (
    <p className="text-sm leading-7 text-foreground">
      {note.text}{" "}
      {note.citation && (
        <CitationChip
          citation={note.citation}
          anchorText={note.text}
          onOpenDocument={onOpenCitation}
        />
      )}
    </p>
  );
}

function EvidenceRow({
  citation,
  onOpenCitation,
}: {
  citation: Citation;
  onOpenCitation: (citation: Citation) => void;
}) {
  const preview = formatDisplayText(citation.preview || "");
  return (
    <button
      type="button"
      onClick={() => onOpenCitation(citation)}
      className="w-full rounded-md border border-border/70 bg-canvas/30 px-3 py-2 text-left transition hover:border-mint/60 hover:bg-mint-soft/10"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-medium text-foreground">{compactDoc(citation.doc)}</p>
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          p.{citation.page}
        </span>
      </div>
      {preview && (
        <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-muted-foreground">{preview}</p>
      )}
    </button>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function buildFallbackReview(handoff: Handoff): MatterReview {
  const summary =
    handoff.summary && handoff.summary !== "No summary available yet."
      ? handoff.summary
      : "The indexed file is available, but no structured AI brief has been generated yet.";
  const nextStep = handoff.nextHearingAt
    ? `Prepare for the next hearing on ${formatDate(handoff.nextHearingAt)}.`
    : "Review the indexed documents and confirm the next procedural step.";

  return {
    stage: handoff.backendStatus.replace(/_/g, " "),
    stageCitation: undefined,
    lastEvent: { text: summary },
    urgentIssues: handoff.deadlines.some((deadline) => deadline.urgent)
      ? [{ text: "At least one urgent deadline is recorded for this matter." }]
      : [],
    missingDocs: [],
    nextStep: { text: nextStep },
    liveDeadlines: [],
    fileBasedFacts: [],
  };
}

type DisplayNote = ReviewNote & { key: string };

function buildOverviewModel(handoff: Handoff, review: MatterReview) {
  const stage = makeDisplayNote("stage", review.stage, review.stageCitation);
  const summary = makeDisplayNote(
    "summary",
    review.executiveSummary?.text || handoff.latestNote?.executiveSummary || handoff.summary,
    review.executiveSummary?.citation || handoff.latestNote?.executiveSummaryCitation,
  );
  const rawRecentEvent = makeDisplayNote(
    "recent",
    review.lastEvent.text,
    review.lastEvent.citation,
  );
  const recentEvent = areSimilarNotes(rawRecentEvent, stage)
    ? makeDisplayNote(
        "recent-fallback",
        buildRecentEventFallback(handoff, rawRecentEvent.citation || stage.citation),
        rawRecentEvent.citation || stage.citation,
      )
    : rawRecentEvent;
  const rawNextStep = makeDisplayNote("next", review.nextStep.text, review.nextStep.citation);
  const nextStep =
    areSimilarNotes(rawNextStep, stage) || areSimilarNotes(rawNextStep, recentEvent)
      ? makeDisplayNote("next-fallback", buildNextStepFallback(handoff), rawNextStep.citation)
      : rawNextStep;
  const urgentIssues = uniqueNotes(
    review.urgentIssues.map((note, index) =>
      makeDisplayNote(`urgent-${index}`, note.text, note.citation),
    ),
  ).filter(
    (note) =>
      isActionableIssue(note.text) &&
      !areSimilarNotes(note, stage) &&
      !areSimilarNotes(note, recentEvent) &&
      !areSimilarNotes(note, nextStep),
  );
  const liveDeadlines = uniqueNotes(
    [...(review.liveDeadlines || []), ...(handoff.latestNote?.liveDeadlines || [])].map(
      (note, index) => makeDisplayNote(`deadline-${index}`, note.text, note.citation),
    ),
  ).filter(
    (note) =>
      !areSimilarNotes(note, stage) &&
      !areSimilarNotes(note, recentEvent) &&
      !areSimilarNotes(note, nextStep),
  );
  const fileFacts = uniqueNotes(
    [...(review.fileBasedFacts || []), ...(handoff.latestNote?.fileBasedFacts || [])].map(
      (note, index) => makeDisplayNote(`fact-${index}`, note.text, note.citation),
    ),
  )
    .filter(
      (note) =>
        !areSimilarNotes(note, summary) &&
        !areSimilarNotes(note, stage) &&
        !areSimilarNotes(note, recentEvent) &&
        !areSimilarNotes(note, nextStep) &&
        !urgentIssues.some((issue) => areSimilarNotes(note, issue)),
    )
    .slice(0, 5);
  const coreFacts = uniqueNotes([stage]).slice(0, 1);
  const headline = makeHeadline(handoff, stage.text || recentEvent.text);
  const evidence = uniqueCitations([
    summary.citation,
    stage.citation,
    recentEvent.citation,
    nextStep.citation,
    ...fileFacts.map((note) => note.citation),
    ...urgentIssues.map((note) => note.citation),
    ...liveDeadlines.map((note) => note.citation),
  ]);

  return {
    headline,
    summary: isUsefulSummary(summary, stage, recentEvent) ? summary : null,
    coreFacts,
    fileFacts,
    recentEvent,
    nextStep,
    urgentIssues,
    liveDeadlines,
    evidence,
  };
}

function makeDisplayNote(key: string, text?: string, citation?: Citation): DisplayNote {
  return {
    key,
    text: formatDisplayText(text || "Not found in file."),
    citation,
  };
}

function uniqueNotes(notes: DisplayNote[]) {
  const seen = new Set<string>();
  return notes.filter((note) => {
    const key = note.text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .slice(0, 180);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function uniqueCitations(citations: Array<Citation | undefined>) {
  const seen = new Set<string>();
  return citations.filter((citation): citation is Citation => {
    if (!citation) return false;
    const key = `${citation.doc}:${citation.page}:${citation.chunkIndex ?? citation.preview ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function noteFingerprint(text: string) {
  return text
    .toLowerCase()
    .replace(/\[doc:[^\]]+\]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function areSimilarNotes(a?: Pick<DisplayNote, "text">, b?: Pick<DisplayNote, "text">) {
  const left = noteFingerprint(a?.text || "");
  const right = noteFingerprint(b?.text || "");

  if (!left || !right) return false;
  if (left === right) return true;

  const shorter = left.length < right.length ? left : right;
  const longer = left.length < right.length ? right : left;
  return shorter.length > 70 && longer.includes(shorter.slice(0, 70));
}

function isActionableIssue(text: string) {
  if (/^not found in file\.?$/i.test(text)) return false;
  if (/directions questionnaire completed|claim form issued|latest reviewed filing/i.test(text)) {
    return false;
  }

  return /\b(urgent|risk|deadline|due|overdue|missing|hearing|defence|defense|disclosure|serve|file|order|permission|costs|breach)\b/i.test(
    text,
  );
}

function isUsefulSummary(summary: DisplayNote, stage: DisplayNote, recentEvent: DisplayNote) {
  if (!summary.text || summary.text === "No summary available yet.") return false;
  if (/^not found in file\.?$/i.test(summary.text)) return false;
  return !areSimilarNotes(summary, stage) && !areSimilarNotes(summary, recentEvent);
}

function makeHeadline(handoff: Handoff, stageText: string) {
  if (/claim form|brief details of claim|claimant claims damages/i.test(stageText)) {
    return `${handoff.matterType} claim issued in ${handoff.court}`;
  }
  if (/directions questionnaire|proposed directions/i.test(stageText)) {
    return "Directions questionnaire and proposed timetable are on file";
  }
  if (/notice of change|change of solicitor/i.test(stageText)) {
    return "Notice of change of solicitor is on file";
  }
  return titleCase(stageText.slice(0, 140));
}

function buildRecentEventFallback(handoff: Handoff, citation?: Citation) {
  if (citation) {
    return `Latest reviewed filing: ${compactDoc(citation.doc)}, page ${citation.page}.`;
  }

  return formatDisplayText(
    handoff.summary || "Latest event is not separated from the current status yet.",
  );
}

function buildNextStepFallback(handoff: Handoff) {
  if (handoff.nextHearingAt) {
    return `Prepare for the next hearing on ${formatDate(handoff.nextHearingAt)} and confirm the required filing or service step from the source documents.`;
  }

  return "Review the indexed pack and confirm the required procedural action from the source documents.";
}

function formatDisplayText(value: string) {
  const text = value.replace(/\s+/g, " ").trim();
  if (!text || text === "Not found in file.") return text;

  const claim = extractAfter(text, /Brief details of claim\s+/i);
  if (claim) return trimToSentence(claim, 2);

  const directions = extractAfter(text, /Proposed directions:\s*/i);
  if (directions) return trimToSentence(`Proposed directions: ${directions}`, 2);

  const disclosure = extractAfter(text, /specific disclosure\s+of\s+/i);
  if (disclosure) return trimToSentence(`Specific disclosure is anticipated for ${disclosure}`, 1);

  const notice = extractAfter(text, /I \(We\) give notice that:\s*/i);
  if (notice) return trimToSentence(notice.replace(/^n\s+/i, ""), 2);

  const questionnaire = text.match(
    /N181 Directions Questionnaire[\s\S]*?Completed on behalf of:\s*([^.]+?)(?:\s+A\.|\.)/i,
  );
  if (questionnaire) {
    return `Directions questionnaire completed on behalf of ${questionnaire[1].trim()}.`;
  }

  const claimForm = text.match(
    /Claim No\.?:\s*([A-Z0-9]+).*?Issue date:\s*([^F]+).*?Claimant\(s\).*?([A-Z][^]+?)\s+Brief details/i,
  );
  if (claimForm) {
    return `Claim form issued on ${claimForm[2].trim()} under claim ${claimForm[1].trim()}.`;
  }

  return trimToSentence(text, 2);
}

function extractAfter(text: string, pattern: RegExp) {
  const match = pattern.exec(text);
  if (!match || match.index < 0) return "";
  return text.slice(match.index + match[0].length).trim();
}

function trimToSentence(text: string, maxSentences: number) {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const result = (sentences.length ? sentences.slice(0, maxSentences).join(" ") : text).trim();
  return result.length > 260 ? `${result.slice(0, 257).trim()}...` : result;
}

function titleCase(text: string) {
  if (!text) return "Matter review";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function compactDoc(doc: string) {
  return doc
    .replace(/^\d{10,}-/, "")
    .replace(/\.(pdf|docx?|txt)$/i, "")
    .replace(/[_-]+/g, " ")
    .trim();
}
