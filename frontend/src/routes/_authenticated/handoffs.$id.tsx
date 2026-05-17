import { createFileRoute, Link, Outlet, notFound, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Copy,
  Gavel,
  Loader2,
  Share2,
  UserCog,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { api } from "@/lib/api";
import type { Citation, Document, FirmUser, Handoff, MatterStatus } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { CitationProvider } from "@/lib/handoff-citation-context";
import { toast } from "sonner";

const TEST_CREDENTIALS: Record<string, { email: string; password: string }> = {
  "receiver@integrated.local": { email: "receiver@integrated.local", password: "receiverpass123" },
  "sender@integrated.local": { email: "sender@integrated.local", password: "senderpass123" },
  "admin@integrated.local": { email: "admin@integrated.local", password: "adminpass123" },
};

const RECIPIENT_CHANGEABLE_STATUSES = new Set([
  "draft",
  "clearance_pending",
  "file_upload_open",
  "pack_building",
  "pack_review",
]);

export const Route = createFileRoute("/_authenticated/handoffs/$id")({
  head: ({ params }) => ({
    meta: [{ title: `Matter ${params.id} — CasePass` }],
  }),
  component: MatterLayout,
});

const TABS: Array<{ to: string; label: string; exact?: boolean }> = [
  { to: "/handoffs/$id", label: "Overview", exact: true },
  { to: "/handoffs/$id/chat", label: "Chat" },
  { to: "/handoffs/$id/note", label: "Handover note" },
  { to: "/handoffs/$id/updates", label: "Updates" },
  { to: "/handoffs/$id/sources", label: "Sources" },
];

function MatterLayout() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["handoff", id],
    queryFn: async () => {
      const h = await api.getHandoff(id);
      if (!h) throw notFound();
      return h;
    },
  });
  const recipients = useQuery({
    queryKey: ["handoff-recipients"],
    queryFn: () => api.listAssignableUsers(),
    enabled: Boolean(user),
  });
  const documents = useQuery({
    queryKey: ["documents", id],
    queryFn: () => api.listDocuments(id),
    enabled: Boolean(data),
  });
  const recipient = data?.receivingId
    ? recipients.data?.find((entry) => entry.id === data.receivingId)
    : undefined;
  const recipientName = recipient?.name || data?.receivingId?.slice(0, 8);
  const isSender = Boolean(user && data && data.ownerId === user.id);
  const canChangeRecipient = Boolean(
    isSender && data && RECIPIENT_CHANGEABLE_STATUSES.has(data.backendStatus),
  );

  const changeRecipient = useMutation({
    mutationFn: (newRecipientId: string) => api.changeRecipient(id, newRecipientId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["handoff", id] }),
        queryClient.invalidateQueries({ queryKey: ["handoffs"] }),
        queryClient.invalidateQueries({ queryKey: ["inbox"] }),
      ]);
      toast.success("Recipient updated.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Couldn't change recipient."),
  });

  const [pendingCitation, setPendingCitation] = useState<Citation | null>(null);
  const openCitation = useMemo(() => (citation: Citation) => setPendingCitation(citation), []);
  const contextValue = useMemo(() => ({ openCitation }), [openCitation]);

  const matchedDocument: Document | undefined = pendingCitation
    ? documents.data?.find(
        (entry) =>
          entry.filename === pendingCitation.doc ||
          entry.filename.endsWith(pendingCitation.doc) ||
          pendingCitation.doc.endsWith(entry.filename),
      )
    : undefined;

  useEffect(() => {
    if (pendingCitation && documents.data && !matchedDocument) {
      toast.error(`Couldn't locate "${pendingCitation.doc}" in this matter's documents.`);
      setPendingCitation(null);
    }
  }, [pendingCitation, documents.data, matchedDocument]);

  const confirmOpenCitation = () => {
    if (!matchedDocument) return;
    setPendingCitation(null);
    navigate({
      to: "/handoffs/$id/sources",
      params: { id },
      search: { open: matchedDocument.id } as never,
    });
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All matters
      </Link>

      <header className="mt-4 rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow-1)]">
        {isLoading || !data ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : isError ? (
          <p className="text-sm text-destructive">Matter not found.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <StatusChip status={data.status} />
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {data.matterType}
              </span>
            </div>
            <h1 className="mt-3 font-display text-2xl font-semibold tracking-tight md:text-3xl">
              {data.caseName}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Gavel className="h-3.5 w-3.5" /> {data.court}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                {data.parties.plaintiff}
                {data.parties.defendant !== "—" && ` v. ${data.parties.defendant}`}
              </span>
              {data.nextHearingAt && (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Next hearing {formatDate(data.nextHearingAt)}
                </span>
              )}
              {recipientName && (
                <span className="inline-flex items-center gap-1.5">
                  <ArrowRight className="h-3.5 w-3.5" />
                  To <span className="font-medium text-foreground">{recipientName}</span>
                </span>
              )}
              <span className="font-mono">
                {data.documentsCount} docs · {data.pagesIndexed} pages indexed
              </span>
            </div>
          </>
        )}
      </header>

      {data && (
        <SharingCard
          handoff={data}
          recipient={recipient}
          recipientName={recipientName}
          isSender={isSender}
          canChangeRecipient={canChangeRecipient}
          availableRecipients={recipients.data || []}
          isChanging={changeRecipient.isPending}
          onChange={(newId) => changeRecipient.mutate(newId)}
        />
      )}

      <nav className="mt-6 flex flex-wrap items-center gap-1 border-b border-border">
        {TABS.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            params={{ id }}
            activeOptions={{ exact: t.exact ?? false }}
            className="-mb-px border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground data-[status=active]:border-indigo data-[status=active]:text-foreground data-[status=active]:font-medium"
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <div className="mt-6">
        <CitationProvider value={contextValue}>
          <Outlet />
        </CitationProvider>
      </div>

      <AlertDialog
        open={Boolean(pendingCitation && matchedDocument)}
        onOpenChange={(open) => !open && setPendingCitation(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Open the source document?</AlertDialogTitle>
            <AlertDialogDescription>
              You're about to open{" "}
              <span className="font-medium text-foreground">{pendingCitation?.doc}</span> at page{" "}
              {pendingCitation?.page}. We'll take you to the Sources tab and preview the file
              inline.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay here</AlertDialogCancel>
            <AlertDialogAction onClick={confirmOpenCitation}>Open document</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SharingCard({
  handoff,
  recipient,
  recipientName,
  isSender,
  canChangeRecipient,
  availableRecipients,
  isChanging,
  onChange,
}: {
  handoff: Handoff;
  recipient?: FirmUser;
  recipientName?: string;
  isSender: boolean;
  canChangeRecipient: boolean;
  availableRecipients: FirmUser[];
  isChanging: boolean;
  onChange: (newRecipientId: string) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(handoff.receivingId || "");
  const [credentialsOpen, setCredentialsOpen] = useState(false);

  useEffect(() => {
    setSelectedId(handoff.receivingId || "");
  }, [handoff.receivingId]);

  const recipientLabel =
    recipientName || (handoff.receivingId ? handoff.receivingId.slice(0, 8) : "Not assigned");
  const recipientEmail = recipient?.email || null;
  const credentials = recipientEmail ? TEST_CREDENTIALS[recipientEmail] : undefined;

  const copyCredentials = async () => {
    if (!credentials) return;
    try {
      await navigator.clipboard.writeText(
        `Email: ${credentials.email}\nPassword: ${credentials.password}`,
      );
      toast.success("Login info copied to clipboard.");
    } catch {
      toast.error("Couldn't copy to clipboard.");
    }
  };

  return (
    <section className="mt-4 rounded-2xl border border-border bg-canvas/40 p-4 shadow-[var(--shadow-1)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-indigo-soft text-indigo">
            <Share2 className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Sharing with
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {recipientLabel}
              {recipient?.title && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  — {recipient.title}
                </span>
              )}
            </p>
            {recipientEmail && (
              <p className="mt-0.5 text-xs text-muted-foreground">{recipientEmail}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {credentials && isSender && (
            <Button variant="outline" size="sm" onClick={() => setCredentialsOpen(true)}>
              <UserCog className="h-3.5 w-3.5" />
              Test as recipient
            </Button>
          )}
          {isSender && canChangeRecipient && (
            <Button variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
              Change recipient
            </Button>
          )}
        </div>
      </div>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change recipient</DialogTitle>
            <DialogDescription>
              Pick who this handoff should be shared with. You can change this until the pack is
              released.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger>
                <SelectValue placeholder="Pick a recipient..." />
              </SelectTrigger>
              <SelectContent>
                {availableRecipients.length === 0 && (
                  <SelectItem value="none" disabled>
                    No other active users available
                  </SelectItem>
                )}
                {availableRecipients.map((entry) => (
                  <SelectItem key={entry.id} value={entry.id}>
                    {entry.name} — {entry.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {availableRecipients.length === 0
                ? "No other active users in your firm. Ask the admin to add a recipient."
                : `${availableRecipients.length} other recipient${availableRecipients.length === 1 ? "" : "s"} available.`}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPickerOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!selectedId || selectedId === "none" || selectedId === handoff.receivingId) {
                  setPickerOpen(false);
                  return;
                }
                onChange(selectedId);
                setPickerOpen(false);
              }}
              disabled={isChanging || !selectedId}
            >
              {isChanging ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={credentialsOpen} onOpenChange={setCredentialsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Sign in as the recipient</DialogTitle>
            <DialogDescription>
              To verify the receiver's experience, log out and sign back in with these seeded local
              test credentials.
            </DialogDescription>
          </DialogHeader>
          {credentials && (
            <div className="space-y-2 rounded-xl border border-border bg-canvas/60 px-4 py-3 font-mono text-sm">
              <p>
                <span className="text-muted-foreground">email:</span> {credentials.email}
              </p>
              <p>
                <span className="text-muted-foreground">password:</span> {credentials.password}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCredentialsOpen(false)}>
              Close
            </Button>
            <Button onClick={copyCredentials}>
              <Copy className="h-3.5 w-3.5" />
              Copy login info
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
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
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
