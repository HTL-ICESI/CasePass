import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Printer, FileText, Package } from "lucide-react";

import { api } from "@/lib/api";
import { useAuth, ROLE_LABEL } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CasePassLogo } from "@/components/brand/logo";

export const Route = createFileRoute("/_authenticated/handoffs/$id/export")({
  head: () => ({ meta: [{ title: "Export handoff — CasePass" }] }),
  component: ExportPage,
});

function ExportPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();

  const handoff = useQuery({ queryKey: ["handoff", id], queryFn: () => api.getHandoff(id) });
  const review = useQuery({ queryKey: ["matter-review", id], queryFn: () => api.getMatterReview(id) });
  const docs = useQuery({ queryKey: ["docs", id], queryFn: () => api.listDocuments(id) });
  const updates = useQuery({ queryKey: ["updates", id], queryFn: () => api.listUpdates(id) });

  const loading =
    handoff.isLoading || review.isLoading || docs.isLoading || updates.isLoading;

  if (loading) return <Skeleton className="h-[600px] w-full" />;

  const h = handoff.data;
  const r = review.data;
  const d = docs.data ?? [];
  const u = updates.data ?? [];

  if (!h) return <p className="text-sm text-muted-foreground">Matter not found.</p>;

  const logExport = async (kind: "json" | "pdf") => {
    if (!user) return;
    await api.logActivity({
      matterId: id,
      kind: "export.generated",
      actorName: user.name,
      actorRole: ROLE_LABEL[user.role] as never,
      summary:
        kind === "json"
          ? "Downloaded the .json handoff bundle."
          : "Generated the printable executive brief.",
    });
    qc.invalidateQueries({ queryKey: ["activity", id] });
  };

  const downloadBundle = async () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      matter: h,
      review: r,
      documents: d,
      updates: u,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `casepass-${h.id}-bundle.json`;
    a.click();
    URL.revokeObjectURL(url);
    void logExport("json");
  };

  return (
    <div className="space-y-6">
      <div className="cp-no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow-1)]">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-indigo-soft text-onyx">
            <Package className="h-4 w-4" />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold">Handoff package</h2>
            <p className="text-xs text-muted-foreground">
              Executive brief, sources index, and post-action updates — ready for the
              receiving counsel.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={downloadBundle}>
            <Download className="mr-1.5 h-4 w-4" /> Download .json bundle
          </Button>
          <Button size="sm" onClick={() => { void logExport("pdf"); window.print(); }}>
            <Printer className="mr-1.5 h-4 w-4" /> Print / Save as PDF
          </Button>
        </div>
      </div>

      <article className="cp-print-sheet mx-auto max-w-[820px] space-y-8 rounded-2xl border border-border bg-white p-10 text-[#0A0A12] shadow-[var(--shadow-1)] print:border-0 print:shadow-none">
        <header className="flex items-start justify-between gap-6 border-b border-black/10 pb-6">
          <div>
            <CasePassLogo size={28} variant="dark" />
            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-[#4A4A57]">
              Executive handoff brief
            </p>
            <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight">
              {h.caseName}
            </h1>
            <p className="mt-1 text-sm text-[#4A4A57]">
              {h.matterType} · {h.court}
            </p>
          </div>
          <div className="text-right font-mono text-[10px] uppercase tracking-wider text-[#4A4A57]">
            <p>Ref · {h.id}</p>
            <p className="mt-1">Generated {fmt(new Date().toISOString())}</p>
            <p className="mt-1">{h.documentsCount} docs · {h.pagesIndexed} pages</p>
          </div>
        </header>

        <Section title="Where we stand">
          <p className="font-display text-base font-medium">{r?.stage ?? "—"}</p>
          <p className="mt-2 text-sm leading-relaxed">{h.summary}</p>
        </Section>

        {r && (
          <>
            <Section title="Most recent event">
              <p className="text-sm leading-relaxed">
                {r.lastEvent.text}
                {r.lastEvent.citation && <Cite c={r.lastEvent.citation} />}
              </p>
            </Section>

            <Section title="Urgent issues">
              {r.urgentIssues.length === 0 ? (
                <p className="text-sm text-[#4A4A57]">None flagged.</p>
              ) : (
                <ul className="space-y-2">
                  {r.urgentIssues.map((i, idx) => (
                    <li
                      key={idx}
                      className="rounded-md border-l-2 border-[#C77700] bg-[#FFF8EC] px-3 py-2 text-sm leading-relaxed"
                    >
                      {i.text}
                      {i.citation && <Cite c={i.citation} />}
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Next step">
              <p className="text-sm leading-relaxed">
                {r.nextStep.text}
                {r.nextStep.citation && <Cite c={r.nextStep.citation} />}
              </p>
            </Section>

            {r.missingDocs.length > 0 && (
              <Section title="Missing documents">
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {r.missingDocs.map((m, idx) => (
                    <li key={idx}>{m}</li>
                  ))}
                </ul>
              </Section>
            )}
          </>
        )}

        {h.deadlines.length > 0 && (
          <Section title="Deadlines">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-black/10 text-[10px] uppercase tracking-wider text-[#4A4A57]">
                  <th className="py-2 font-mono font-medium">Due</th>
                  <th className="py-2 font-mono font-medium">Item</th>
                  <th className="py-2 font-mono font-medium">Source</th>
                </tr>
              </thead>
              <tbody>
                {h.deadlines.map((d) => (
                  <tr key={d.id} className="border-b border-black/5 last:border-0">
                    <td className="py-2 font-mono text-xs">{fmt(d.dueAt)}</td>
                    <td className="py-2">
                      {d.label}
                      {d.urgent && (
                        <span className="ml-2 rounded-sm bg-[#FFE9B8] px-1 py-0.5 font-mono text-[9px] font-semibold text-[#7A4F00]">
                          URGENT
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-xs text-[#4A4A57]">
                      {d.citation ? `${d.citation.doc}, p.${d.citation.page}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        <Section title={`Sources (${d.length})`}>
          <ul className="grid gap-2 text-sm sm:grid-cols-2">
            {d.map((doc) => (
              <li
                key={doc.id}
                className="flex items-start gap-2 rounded-md border border-black/10 bg-[#FAFAFB] px-3 py-2"
              >
                <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#4A4A57]" />
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium">{doc.filename}</p>
                  <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-[#4A4A57]">
                    {doc.pages} pages · {doc.status}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Section>

        {u.length > 0 && (
          <Section title="Post-action updates">
            <ol className="space-y-4">
              {u.map((up) => (
                <li
                  key={up.id}
                  className="rounded-md border border-black/10 bg-[#FAFAFB] p-4"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm font-semibold">
                      {up.authorName}{" "}
                      <span className="font-normal text-[#4A4A57]">· {up.authorRole}</span>
                    </p>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-[#4A4A57]">
                      {fmt(up.createdAt)}
                    </p>
                  </div>
                  <dl className="mt-3 space-y-2 text-sm">
                    <Item term="What was done">{up.whatWasDone}</Item>
                    <Item term="What happened">{up.whatHappened}</Item>
                    <Item term="What follows">{up.whatFollows}</Item>
                  </dl>
                  {up.citations.length > 0 && (
                    <p className="mt-3 font-mono text-[10px] text-[#4A4A57]">
                      Cites: {up.citations.map((c) => `${c.doc}, p.${c.page}`).join(" · ")}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </Section>
        )}

        <footer className="border-t border-black/10 pt-4 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-[#4A4A57]">
          Evidence-first · Generated by CasePass · {h.id}
        </footer>
      </article>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="break-inside-avoid">
      <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#4A4A57]">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Item({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-wider text-[#4A4A57]">{term}</dt>
      <dd className="mt-0.5 leading-relaxed">{children}</dd>
    </div>
  );
}

function Cite({ c }: { c: { doc: string; page: number } }) {
  return (
    <span className="ml-1 inline-flex items-center rounded border border-[#7FCFAE] bg-[#E6F7EF] px-1.5 py-px align-middle font-mono text-[10px] font-medium text-[#0A0A12]">
      {c.doc}, p.{c.page}
    </span>
  );
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
