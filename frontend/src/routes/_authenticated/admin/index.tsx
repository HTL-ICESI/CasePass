import { createFileRoute } from "@tanstack/react-router";
import { Building2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Firm overview — CasePass" }] }),
  component: AdminHome,
});

function AdminHome() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-indigo">Admin</p>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">
        Firm overview
      </h1>
      <p className="mt-3 max-w-xl text-sm text-muted-foreground">
        Firm-wide matters, handoff volume and indexing health. Live data wires up
        alongside the mock API in step 3.
      </p>

      <div className="mt-10 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface px-6 py-16 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-soft text-onyx">
          <Building2 className="h-5 w-5" />
        </span>
        <h2 className="mt-4 font-display text-lg font-semibold">Firm panel coming soon</h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          You'll see every active matter across teams, plus indexing status and
          handoff acceptance rates.
        </p>
      </div>
    </div>
  );
}
