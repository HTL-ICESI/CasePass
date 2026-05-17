import { createFileRoute, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download, FileText, Printer } from "lucide-react";
import { api } from "@/lib/api";
import type { Citation, Handoff, MatterReview } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CitationChip } from "@/components/app/citation-chip";

export const Route = createFileRoute("/_authenticated/handoffs/$id/note")({
  head: () => ({ meta: [{ title: "Handover note — CasePass" }] }),
  component: NotePage,
});

function NotePage() {
  const { id } = Route.useParams();

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

  if (handoff.isLoading || review.isLoading) {
    return <Skeleton className="h-[600px] w-full" />;
  }

  const h = handoff.data;
  const r = review.data;
  if (!h || !r) {
    return (
      <p className="text-sm text-muted-foreground">No handover note available for this matter.</p>
    );
  }

  const onDownload = async () => {
    const { default: jsPDF } = await import("jspdf");
    downloadNotePdf(jsPDF, h, r);
  };
  const onPrint = () => window.print();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <FileText className="h-3.5 w-3.5" />
          Auto-generated brief · grounded in indexed documents
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={onPrint}>
            <Printer className="h-3.5 w-3.5" /> Print
          </Button>
          <Button size="sm" onClick={onDownload}>
            <Download className="h-3.5 w-3.5" /> Download PDF
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
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">
            {h.caseName}
          </h1>
          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
            <Row label="Matter type" value={h.matterType} />
            <Row label="Court" value={h.court} />
            <Row label="Parties" value={`${h.parties.plaintiff} v. ${h.parties.defendant}`} />
            <Row
              label="Next hearing"
              value={h.nextHearingAt ? formatDate(h.nextHearingAt) : "—"}
            />
            <Row label="File volume" value={`${h.documentsCount} docs · ${h.pagesIndexed} pages`} />
            <Row label="Prepared" value={formatDate(new Date().toISOString())} />
          </dl>
        </header>

        <Block title="Executive summary">
          <p className="text-sm leading-relaxed text-foreground">{h.summary}</p>
        </Block>

        <Block title="Where we stand">
          <p className="font-display text-base font-medium text-foreground">{r.stage}</p>
          <p className="mt-3 text-sm leading-relaxed text-foreground">
            {r.lastEvent.text}{" "}
            {r.lastEvent.citation && <CitationChip citation={r.lastEvent.citation} />}
          </p>
        </Block>

        <Block title="Urgent issues">
          {r.urgentIssues.length === 0 ? (
            <p className="text-sm text-muted-foreground">None flagged.</p>
          ) : (
            <ol className="space-y-3 text-sm leading-relaxed text-foreground">
              {r.urgentIssues.map((u, i) => (
                <li key={i} className="flex gap-3">
                  <span className="font-mono text-[10px] text-muted-foreground pt-0.5">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>
                    {u.text} {u.citation && <CitationChip citation={u.citation} />}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Block>

        <Block title="Deadlines">
          {h.deadlines.length === 0 ? (
            <p className="text-sm text-muted-foreground">None scheduled.</p>
          ) : (
            <ul className="space-y-2 text-sm text-foreground">
              {h.deadlines.map((d) => (
                <li key={d.id} className="flex items-baseline justify-between gap-4">
                  <span>
                    {d.label}{" "}
                    {d.citation && <CitationChip citation={d.citation} />}
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
            {r.nextStep.text}{" "}
            {r.nextStep.citation && <CitationChip citation={r.nextStep.citation} />}
          </p>
        </Block>

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

type JsPDFCtor = typeof import("jspdf").default;

function downloadNotePdf(JsPDF: JsPDFCtor, h: Handoff, r: MatterReview) {
  const doc = new JsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 56;
  const maxW = pageW - margin * 2;
  let y = margin;

  const ensure = (need: number) => {
    if (y + need > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const writeWrapped = (text: string, size: number, opts: { bold?: boolean; color?: [number, number, number]; gap?: number } = {}) => {
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(size);
    const [r1, g1, b1] = opts.color ?? [20, 20, 20];
    doc.setTextColor(r1, g1, b1);
    const lines = doc.splitTextToSize(text, maxW);
    const lineH = size * 1.35;
    ensure(lines.length * lineH);
    doc.text(lines, margin, y);
    y += lines.length * lineH + (opts.gap ?? 0);
  };

  const heading = (label: string) => {
    ensure(28);
    y += 14;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(label.toUpperCase(), margin, y);
    y += 6;
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y, pageW - margin, y);
    y += 14;
  };

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text("CASEPASS · HANDOVER NOTE", margin, y);
  y += 22;
  writeWrapped(h.caseName, 20, { bold: true, gap: 10 });

  // Metadata block
  const meta: Array<[string, string]> = [
    ["Matter type", h.matterType],
    ["Court", h.court],
    ["Parties", `${h.parties.plaintiff} v. ${h.parties.defendant}`],
    ["Next hearing", h.nextHearingAt ? formatDate(h.nextHearingAt) : "—"],
    ["File volume", `${h.documentsCount} docs · ${h.pagesIndexed} pages`],
    ["Prepared", formatDate(new Date().toISOString())],
  ];
  doc.setFontSize(10);
  meta.forEach(([k, v]) => {
    ensure(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(120, 120, 120);
    doc.text(k, margin, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(20, 20, 20);
    doc.text(v, margin + 110, y);
    y += 14;
  });

  heading("Executive summary");
  writeWrapped(h.summary, 11);

  heading("Where we stand");
  writeWrapped(r.stage, 12, { bold: true, gap: 4 });
  writeWrapped(r.lastEvent.text + citeStr(r.lastEvent.citation), 11);

  heading("Urgent issues");
  if (r.urgentIssues.length === 0) {
    writeWrapped("None flagged.", 11, { color: [120, 120, 120] });
  } else {
    r.urgentIssues.forEach((u, i) => {
      writeWrapped(`${i + 1}. ${u.text}${citeStr(u.citation)}`, 11, { gap: 4 });
    });
  }

  heading("Deadlines");
  if (h.deadlines.length === 0) {
    writeWrapped("None scheduled.", 11, { color: [120, 120, 120] });
  } else {
    h.deadlines.forEach((d) => {
      writeWrapped(`• ${formatDate(d.dueAt)} — ${d.label}${citeStr(d.citation)}`, 11, { gap: 2 });
    });
  }

  heading("Missing documents");
  if (r.missingDocs.length === 0) {
    writeWrapped("File complete.", 11, { color: [120, 120, 120] });
  } else {
    r.missingDocs.forEach((m) => writeWrapped(`• ${m}`, 11, { gap: 2 }));
  }

  heading("Recommended next step");
  writeWrapped(r.nextStep.text + citeStr(r.nextStep.citation), 11);

  // Footer on every page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      "Generated by CasePass · All assertions grounded in cited documents.",
      margin,
      pageH - 28,
    );
    doc.text(`${i} / ${pageCount}`, pageW - margin, pageH - 28, { align: "right" });
  }

  const safe = h.caseName.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  doc.save(`casepass-handover-${safe}.pdf`);
}
