import { createFileRoute } from "@tanstack/react-router";
import { Inbox } from "lucide-react";

export const Route = createFileRoute("/_authenticated/inbox")({
  head: () => ({ meta: [{ title: "Inbox — CasePass" }] }),
  component: InboxPage,
});

function InboxPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-mint">Receiving counsel</p>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">Inbox</h1>
      <p className="mt-3 max-w-xl text-sm text-muted-foreground">
        Handoffs the firm has routed to you. Each card opens the executive brief and
        source register. Live data lands with the mock API layer in step 3.
      </p>

      <div className="mt-10 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface px-6 py-16 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-mint-soft text-onyx">
          <Inbox className="h-5 w-5" />
        </span>
        <h2 className="mt-4 font-display text-lg font-semibold">No incoming handoffs yet</h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          When a solicitor sends a matter your way, it will land here with the brief,
          deadlines and cited sources ready to open.
        </p>
      </div>
    </div>
  );
}
