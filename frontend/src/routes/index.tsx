import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, FileText, MessagesSquare, Sparkles, ShieldCheck, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CasePassLogo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/app/theme-toggle";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CasePass — Clean handoffs for complex matters" },
      {
        name: "description",
        content:
          "CasePass turns the case file into a structured handoff: indexed PDFs, cited chat, an executive brief, and post-action updates a receiving counsel can actually use.",
      },
      { property: "og:title", content: "CasePass — Clean handoffs for complex matters" },
      {
        property: "og:description",
        content: "Indexed case files. Cited chat. Executive briefs. Post-action updates.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-canvas text-foreground">
      <SiteHeader />
      <Hero />
      <ValueProps />
      <ProcessStrip />
      <SiteFooter />
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-canvas/80 backdrop-blur supports-[backdrop-filter]:bg-canvas/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/"><CasePassLogo /></Link>
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="#product" className="hover:text-foreground">Product</a>
          <a href="#how" className="hover:text-foreground">How it works</a>
          <a href="#trust" className="hover:text-foreground">Evidence-first</a>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm">
            <Link to="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm" className="shadow-[var(--shadow-glow)]">
            <Link to="/login">Open CasePass <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-onyx text-white">
      <div className="cp-grid-bg absolute inset-0 opacity-60" aria-hidden />
      <div
        className="pointer-events-none absolute -top-40 right-[-10%] h-[520px] w-[520px] rounded-full opacity-50 blur-3xl"
        style={{ background: "radial-gradient(closest-side, var(--indigo), transparent 70%)" }}
        aria-hidden
      />
      <div className="relative mx-auto grid max-w-7xl gap-16 px-6 py-24 lg:grid-cols-[1.1fr_0.9fr] lg:py-32">
        <div className="cp-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-white/70">
            <span className="h-1.5 w-1.5 rounded-full bg-mint cp-pulse" />
            Handoff intelligence for solicitors
          </span>
          <h1 className="mt-6 max-w-2xl font-display text-5xl font-semibold leading-[1.05] tracking-tight text-white md:text-6xl">
            Clean handoffs for{" "}
            <span style={{ color: "var(--indigo-soft)" }}>complex matters.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/70">
            Drop in the case file. CasePass indexes every PDF, builds a cited executive
            brief, and lets you ask the matter questions — with sources you can open on
            the exact page.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="h-12 px-6 text-base shadow-[var(--shadow-glow)]">
              <Link to="/login">Open the demo <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="h-12 px-5 text-white hover:bg-white/10 hover:text-white">
              <a href="#how">See how it works</a>
            </Button>
          </div>
          <dl className="mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-white/10 pt-8">
            {[
              { k: "5 min", v: "Brief from a fresh file" },
              { k: "100%", v: "Cited to source pages" },
              { k: "0", v: "Lost context on handoff" },
            ].map((s) => (
              <div key={s.k}>
                <dt className="font-display text-2xl font-semibold text-white">{s.k}</dt>
                <dd className="mt-1 text-xs leading-snug text-white/60">{s.v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <HeroBriefCard />
      </div>
    </section>
  );
}

function HeroBriefCard() {
  return (
    <div className="cp-fade-up relative" style={{ animationDelay: "120ms" }}>
      <div
        className="absolute -inset-4 rounded-[28px] opacity-60 blur-2xl"
        style={{ background: "radial-gradient(closest-side, var(--indigo), transparent 70%)" }}
        aria-hidden
      />
      <article className="relative overflow-hidden rounded-2xl border border-white/10 bg-white text-onyx shadow-[var(--shadow-3)]">
        <header className="flex items-center justify-between border-b border-black/10 px-6 py-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-onyx-300">Executive brief</p>
            <h3 className="mt-1 font-display text-base font-semibold text-onyx">Whitfield v. Marrow Holdings</h3>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-mint-soft px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-wider text-onyx">
            <span className="h-1.5 w-1.5 rounded-full bg-mint cp-pulse" /> Handoff active
          </span>
        </header>
        <div className="space-y-4 px-6 py-5 text-sm leading-relaxed text-onyx">
          <p>
            Plaintiff seeks specific performance on the September SPA; trial is set for
            <strong> 14 Apr 2026</strong> in the Commercial Court{" "}
            <CiteChip doc="Order" page={3} />.
          </p>
          <p>
            Defence relies on a force-majeure clause invoked 11 Aug 2025{" "}
            <CiteChip doc="SPA" page={17} />. Three exhibits remain to be disclosed
            before the next CMC <CiteChip doc="Directions" page={2} />.
          </p>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Mini label="Next hearing" value="14 Apr · 10:00" />
            <Mini label="Open deadlines" value="3 this week" />
          </div>
        </div>
        <footer className="flex items-center justify-between border-t border-black/10 bg-black/[0.03] px-6 py-3 text-xs text-onyx-300">
          <span className="font-mono">12 sources · 184 pages indexed</span>
          <span className="inline-flex items-center gap-1 text-onyx"><Sparkles className="h-3 w-3 text-indigo" /> Generated by CasePass</span>
        </footer>
      </article>
    </div>
  );
}

function CiteChip({ doc, page }: { doc: string; page: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded border border-mint/60 bg-mint-soft/60 px-1.5 py-px align-middle font-mono text-[10px] font-medium text-onyx">
      {doc}, p.{page}
    </span>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-black/10 bg-black/[0.02] px-3 py-2">
      <p className="font-mono text-[10px] uppercase tracking-wider text-onyx-300">{label}</p>
      <p className="mt-1 font-display text-sm font-semibold text-onyx">{value}</p>
    </div>
  );
}

function ValueProps() {
  const items = [
    {
      icon: FileText,
      title: "Indexed case file",
      copy: "Drop PDFs and CasePass parses, chunks, and pins every page. No more grep through bundles.",
    },
    {
      icon: MessagesSquare,
      title: "Cited chat",
      copy: "Ask the matter anything. Every answer cites the exact document and page — or says it can't.",
    },
    {
      icon: ShieldCheck,
      title: "Evidence-first handover",
      copy: "Executive briefs and post-action updates a receiving counsel can rely on the same morning.",
    },
  ];
  return (
    <section id="product" className="border-b border-border bg-canvas">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-indigo">What CasePass does</p>
        <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-tight md:text-4xl">
          Built for the moment the matter changes hands.
        </h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {items.map((it) => (
            <div
              key={it.title}
              className="group rounded-2xl border border-border bg-surface p-7 shadow-[var(--shadow-1)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-2)]"
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-soft text-onyx">
                <it.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-5 font-display text-xl font-semibold tracking-tight">{it.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{it.copy}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProcessStrip() {
  const steps = [
    { n: "01", t: "Upload the file", d: "Pleadings, exhibits, correspondence. Multi-PDF, marked for privilege." },
    { n: "02", t: "Index & review", d: "Stage, deadlines, urgent issues, missing docs — surfaced automatically." },
    { n: "03", t: "Chat the matter", d: "Every answer cites Doc + page. If the file doesn't say, we say so." },
    { n: "04", t: "Hand it over", d: "Executive brief PDF + post-action updates from the receiving counsel." },
  ];
  return (
    <section id="how" className="bg-onyx text-white">
      <div className="cp-grid-bg absolute inset-0 opacity-30" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-6 py-24">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-mint">The flow</p>
            <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-tight text-white md:text-4xl">
              From a fresh bundle to a defensible handoff.
            </h2>
          </div>
          <Quote className="hidden h-12 w-12 text-white/15 md:block" />
        </div>
        <ol className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 md:grid-cols-4">
          {steps.map((s) => (
            <li key={s.n} className="bg-onyx p-7">
              <p className="font-mono text-xs text-mint">{s.n}</p>
              <h3 className="mt-3 font-display text-lg font-semibold text-white">{s.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/70">{s.d}</p>
            </li>
          ))}
        </ol>
        <div id="trust" className="mt-16 flex flex-wrap items-center justify-between gap-6 rounded-2xl border border-white/10 bg-white/[0.03] px-8 py-7">
          <p className="max-w-xl text-sm leading-relaxed text-white/70">
            <strong className="text-white">Evidence-first by design.</strong> CasePass never paraphrases
            without a citation. When the file is silent, the brief says so — explicitly.
          </p>
          <Button asChild size="lg" className="shadow-[var(--shadow-glow)]">
            <Link to="/login">Try the demo</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-border bg-canvas">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-6 py-10 md:flex-row md:items-center">
        <div>
          <CasePassLogo />
          <p className="mt-3 max-w-md text-xs leading-relaxed text-muted-foreground">
            CasePass — handoff intelligence for solicitors. A HTL · ICESI project.
          </p>
        </div>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          v0.1 · evidence-first build
        </p>
      </div>
    </footer>
  );
}
