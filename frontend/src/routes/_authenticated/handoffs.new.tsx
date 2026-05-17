import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  Loader2,
  UploadCloud,
  Wand2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import type { Court, MatterType } from "@/lib/api/types";

export const Route = createFileRoute("/_authenticated/handoffs/new")({
  head: () => ({ meta: [{ title: "New handoff — CasePass" }] }),
  component: NewHandoffPage,
});

const MATTER_TYPES: MatterType[] = [
  "Commercial litigation",
  "Employment",
  "Real estate",
  "Insolvency",
  "Regulatory",
  "Family",
];
const COURTS: Court[] = [
  "Commercial Court",
  "High Court (KBD)",
  "Employment Tribunal",
  "County Court",
  "Court of Appeal",
];

type MatterForm = {
  caseName: string;
  matterType: MatterType | "";
  court: Court | "";
  plaintiff: string;
  defendant: string;
  receiverId: string;
  nextHearingAt: string;
  summary: string;
};

type UploadItem = {
  id: string;
  name: string;
  size: number;
  pages: number;
  progress: number; // 0–100
  status: "indexing" | "indexed" | "error";
  file: File;
};

const STEPS = [
  { n: 1, label: "Matter" },
  { n: 2, label: "Documents" },
  { n: 3, label: "Review" },
];

function NewHandoffPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const recipients = useQuery({
    queryKey: ["handoff-recipients"],
    queryFn: () => api.listAssignableUsers(),
    enabled: !!user,
  });
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<MatterForm>({
    caseName: "",
    matterType: "",
    court: "",
    plaintiff: "",
    defendant: "",
    receiverId: "",
    nextHearingAt: "",
    summary: "",
  });
  const [uploads, setUploads] = useState<UploadItem[]>([]);

  const fillTestData = useCallback(() => {
    const hearing = new Date();
    hearing.setDate(hearing.getDate() + 30);
    const stamp = new Date().toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
    const otherRecipient = recipients.data?.[0];

    setForm({
      caseName: `Whitfield v. Marrow Holdings — ${stamp}`,
      matterType: "Commercial litigation",
      court: "Commercial Court",
      plaintiff: "Whitfield Industries Ltd",
      defendant: "Marrow Holdings plc",
      receiverId: otherRecipient?.id || "",
      nextHearingAt: hearing.toISOString(),
      summary:
        "Breach of supply agreement dated March 2024. Claim for ~£420k in damages plus interest. CMC fixed; defence due in 14 days. Pleadings, witness statements, and disclosure index attached.",
    });

    if (otherRecipient) {
      toast.success(`Test matter filled — receiver: ${otherRecipient.name}`);
    } else {
      toast.warning("Test matter filled. Select a receiving counsel before continuing.");
    }
  }, [recipients.data]);

  const matterValid =
    form.caseName.trim().length > 2 &&
    form.matterType &&
    form.court &&
    form.plaintiff.trim() &&
    form.defendant.trim() &&
    form.receiverId &&
    form.summary.trim().length > 10;

  const allIndexed = uploads.length > 0 && uploads.every((u) => u.status === "indexed");

  const createMut = useMutation({
    mutationFn: api.createHandoff,
    onSuccess: (h) => {
      queryClient.invalidateQueries({ queryKey: ["handoffs"] });
      queryClient.invalidateQueries({ queryKey: ["inbox"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-kpis"] });
      toast.success(`Handoff created — ${h.caseName}`);
      navigate({ to: "/handoffs/$id", params: { id: h.id } });
    },
    onError: (error) => {
      const body = error instanceof Error ? (error as Error & { body?: unknown }).body : null;
      const fieldErrors =
        body && typeof body === "object" && "field_errors" in body
          ? Object.values((body as { field_errors?: Record<string, string> }).field_errors || {})
          : [];
      const message =
        fieldErrors[0] ||
        (error instanceof Error ? error.message : "Could not create handoff. Try again.");
      toast.error(message);
    },
  });

  const submit = () => {
    if (!user || !matterValid || !allIndexed) return;
    createMut.mutate({
      caseName: form.caseName.trim(),
      matterType: form.matterType as MatterType,
      court: form.court as Court,
      plaintiff: form.plaintiff.trim(),
      defendant: form.defendant.trim(),
      receiverId: form.receiverId,
      nextHearingAt: form.nextHearingAt || undefined,
      summary: form.summary.trim(),
      ownerId: user.id,
      files: uploads.map((u) => ({ name: u.name, size: u.size, pages: u.pages, file: u.file })),
    });
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 md:py-14">
      <button
        type="button"
        onClick={() => navigate({ to: "/dashboard" })}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-onyx"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
      </button>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-indigo">
            Step {step} of 3 — {STEPS[step - 1].label}
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">
            New handoff
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Capture the matter, drop the pleadings and exhibits, then send the brief to receiving
            counsel.
          </p>
        </div>
        {step === 1 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fillTestData}
            disabled={recipients.isLoading}
            className="shrink-0"
          >
            <Wand2 className="mr-1.5 h-3.5 w-3.5" />
            Fill with test data
          </Button>
        )}
      </header>

      <Stepper step={step} />

      <div className="mt-8 cp-fade-up rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-2)] md:p-8">
        {step === 1 && (
          <MatterStep
            form={form}
            setForm={setForm}
            recipients={recipients.data ?? []}
            recipientsError={recipients.error}
          />
        )}
        {step === 2 && <UploadStep uploads={uploads} setUploads={setUploads} />}
        {step === 3 && (
          <ReviewStep
            form={form}
            uploads={uploads}
            recipientName={
              recipients.data?.find((recipient) => recipient.id === form.receiverId)?.name || "—"
            }
          />
        )}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1 || createMut.isPending}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
        </Button>

        {step < 3 ? (
          <Button
            onClick={() => setStep((s) => s + 1)}
            disabled={(step === 1 && !matterValid) || (step === 2 && !allIndexed)}
          >
            Continue <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={submit} disabled={createMut.isPending || !matterValid || !allIndexed}>
            {createMut.isPending ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Sending…
              </>
            ) : (
              <>
                Send to receiving counsel
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

/* ---------- Stepper ---------- */

function Stepper({ step }: { step: number }) {
  return (
    <ol className="mt-8 grid grid-cols-3 gap-2">
      {STEPS.map((s) => {
        const done = step > s.n;
        const active = step === s.n;
        return (
          <li key={s.n} className="flex items-center gap-2.5">
            <span
              className={
                "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold transition " +
                (done
                  ? "border-mint bg-mint-soft text-onyx"
                  : active
                    ? "border-indigo bg-indigo text-primary-foreground shadow-[var(--shadow-glow)]"
                    : "border-border bg-surface text-muted-foreground")
              }
            >
              {done ? <Check className="h-3.5 w-3.5" /> : s.n}
            </span>
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Step {s.n}
              </p>
              <p
                className={
                  "truncate text-sm font-medium " +
                  (active || done ? "text-onyx" : "text-muted-foreground")
                }
              >
                {s.label}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ---------- Step 1: matter info ---------- */

function MatterStep({
  form,
  setForm,
  recipients,
  recipientsError,
}: {
  form: MatterForm;
  setForm: React.Dispatch<React.SetStateAction<MatterForm>>;
  recipients: Awaited<ReturnType<typeof api.listAssignableUsers>>;
  recipientsError: Error | null;
}) {
  const set = <K extends keyof MatterForm>(k: K, v: MatterForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));
  const recipientOptions = recipients;

  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <Label htmlFor="caseName">Case name</Label>
        <Input
          id="caseName"
          placeholder="e.g. Whitfield v. Marrow Holdings"
          value={form.caseName}
          onChange={(e) => set("caseName", e.target.value)}
        />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="grid gap-2">
          <Label>Matter type</Label>
          <Select value={form.matterType} onValueChange={(v) => set("matterType", v as MatterType)}>
            <SelectTrigger>
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>
              {MATTER_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Court</Label>
          <Select value={form.court} onValueChange={(v) => set("court", v as Court)}>
            <SelectTrigger>
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>
              {COURTS.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="plaintiff">Plaintiff / claimant</Label>
          <Input
            id="plaintiff"
            value={form.plaintiff}
            onChange={(e) => set("plaintiff", e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="defendant">Defendant / respondent</Label>
          <Input
            id="defendant"
            value={form.defendant}
            onChange={(e) => set("defendant", e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label>Receiving counsel / recipient</Label>
        <Select value={form.receiverId} onValueChange={(value) => set("receiverId", value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select who will receive the handoff…" />
          </SelectTrigger>
          <SelectContent>
            {recipientOptions.length === 0 && (
              <SelectItem value="none" disabled>
                {recipientsError ? "Could not load recipients" : "No other active users available"}
              </SelectItem>
            )}
            {recipientOptions.map((recipient) => (
              <SelectItem key={recipient.id} value={recipient.id}>
                {recipient.name} — {recipient.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {recipientsError
            ? "Refresh the page or sign in again if this keeps happening."
            : "The selected recipient will see this matter in their inbox as soon as the handoff is created."}
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="nextHearing">Next hearing (optional)</Label>
        <Input
          id="nextHearing"
          type="date"
          value={form.nextHearingAt.slice(0, 10)}
          onChange={(e) =>
            set("nextHearingAt", e.target.value ? new Date(e.target.value).toISOString() : "")
          }
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="summary">Matter summary</Label>
        <Textarea
          id="summary"
          placeholder="Short factual summary — counsel will see this on the brief."
          rows={4}
          value={form.summary}
          onChange={(e) => set("summary", e.target.value)}
        />
      </div>
    </div>
  );
}

/* ---------- Step 2: upload + simulated indexing ---------- */

function UploadStep({
  uploads,
  setUploads,
}: {
  uploads: UploadItem[];
  setUploads: React.Dispatch<React.SetStateAction<UploadItem[]>>;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [drag, setDrag] = useState(false);

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const accepted = Array.from(files).filter(
        (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"),
      );
      if (accepted.length === 0) {
        toast.error("Only PDF files are supported.");
        return;
      }
      const items: UploadItem[] = accepted.map((f) => ({
        id: `${f.name}-${f.size}-${Math.random().toString(36).slice(2, 7)}`,
        name: f.name,
        size: f.size,
        // estimate ~50KB/page; clamp to reasonable range
        pages: Math.max(3, Math.min(420, Math.round(f.size / 50_000))),
        progress: 0,
        status: "indexing",
        file: f,
      }));
      setUploads((prev) => [...prev, ...items]);
    },
    [setUploads],
  );

  // Tick progress for any indexing items
  useEffect(() => {
    const indexing = uploads.filter((u) => u.status === "indexing");
    if (indexing.length === 0) return;
    const t = setInterval(() => {
      setUploads((prev) =>
        prev.map((u) => {
          if (u.status !== "indexing") return u;
          const next = Math.min(100, u.progress + 6 + Math.random() * 12);
          return next >= 100
            ? { ...u, progress: 100, status: "indexed" }
            : { ...u, progress: next };
        }),
      );
    }, 220);
    return () => clearInterval(t);
  }, [uploads, setUploads]);

  const remove = (id: string) => setUploads((prev) => prev.filter((u) => u.id !== id));

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  return (
    <div className="grid gap-5">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={
          "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-14 text-center transition " +
          (drag
            ? "border-indigo bg-indigo-soft/40"
            : "border-border bg-canvas hover:border-indigo/60 hover:bg-indigo-soft/20")
        }
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-soft text-onyx">
          <UploadCloud className="h-5 w-5" />
        </span>
        <p className="mt-4 font-display text-base font-semibold">
          Drop PDFs here, or click to browse
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Pleadings, exhibits, correspondence. CasePass indexes every page.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {uploads.length > 0 && (
        <ul className="grid w-full gap-2">
          {uploads.map((u) => (
            <li
              key={u.id}
              className="flex w-full min-w-0 items-center gap-3 overflow-hidden rounded-xl border border-border bg-surface px-4 py-3"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-soft text-onyx">
                <FileText className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <p className="min-w-0 flex-1 truncate text-sm font-medium">{u.name}</p>
                  <p className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {formatBytes(u.size)} · {u.pages} p.
                  </p>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <Progress value={u.progress} className="h-1.5 flex-1" />
                  <span
                    className={
                      "font-mono text-[10px] uppercase tracking-wider " +
                      (u.status === "indexed" ? "text-mint" : "text-muted-foreground")
                    }
                  >
                    {u.status === "indexed" ? "Indexed" : `Indexing ${Math.round(u.progress)}%`}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => remove(u.id)}
                className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-onyx"
                aria-label="Remove file"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {uploads.length === 0 && (
        <p className="text-xs text-muted-foreground">At least one PDF is required to continue.</p>
      )}
    </div>
  );
}

/* ---------- Step 3: review ---------- */

function ReviewStep({
  form,
  uploads,
  recipientName,
}: {
  form: MatterForm;
  uploads: UploadItem[];
  recipientName: string;
}) {
  const totalPages = uploads.reduce((s, u) => s + u.pages, 0);
  return (
    <div className="grid gap-6">
      <section>
        <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Matter
        </h3>
        <dl className="mt-3 grid gap-3 md:grid-cols-2">
          <Field label="Case" value={form.caseName} />
          <Field label="Type" value={form.matterType} />
          <Field label="Court" value={form.court} />
          <Field label="Receiver" value={recipientName} />
          <Field
            label="Next hearing"
            value={
              form.nextHearingAt
                ? new Date(form.nextHearingAt).toLocaleDateString(undefined, {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : "—"
            }
          />
          <Field label="Plaintiff" value={form.plaintiff} />
          <Field label="Defendant" value={form.defendant} />
        </dl>
        <div className="mt-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Summary
          </p>
          <p className="mt-1.5 text-sm text-onyx">{form.summary}</p>
        </div>
      </section>

      <section>
        <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Documents · {uploads.length} files · {totalPages} pages indexed
        </h3>
        <ul className="mt-3 grid gap-1.5">
          {uploads.map((u) => (
            <li
              key={u.id}
              className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            >
              <span className="flex items-center gap-2 truncate">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{u.name}</span>
              </span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-mint">
                {u.pages} p · indexed
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-onyx">{value || "—"}</dd>
    </div>
  );
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}
