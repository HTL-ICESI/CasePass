import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Send, AlertTriangle, FileText, Sparkle, User } from "lucide-react";

import { api } from "@/lib/api";
import type { ChatCitation, ChatMessage, Chunk } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/handoffs/$id/chat")({
  head: () => ({ meta: [{ title: "Chat — CasePass" }] }),
  component: ChatPage,
});

function ChatPage() {
  const { id } = Route.useParams();

  const chunks = useQuery({
    queryKey: ["chunks", id],
    queryFn: () => api.listChunks(id),
  });
  const suggestions = useQuery({
    queryKey: ["chat-suggestions", id],
    queryFn: () => api.getChatSuggestions(id),
  });

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [activeChunk, setActiveChunk] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const ask = useMutation({
    mutationFn: (question: string) => api.chatWithSources(id, question),
    onSuccess: (answer, question) => {
      const userMsg: ChatMessage = {
        id: `m_${Date.now()}_u`,
        role: "user",
        text: question,
      };
      const assistant: ChatMessage = {
        id: `m_${Date.now()}_a`,
        role: "assistant",
        text: answer.text,
        citations: answer.citations,
        insufficient: answer.insufficient,
      };
      setMessages((prev) => [...prev, userMsg, assistant]);
      if (answer.citations.length > 0) {
        setActiveChunk(answer.citations[0].chunkId);
      }
    },
    onError: (error, question) => {
      const message = error instanceof Error ? error.message : "Chat request failed.";
      toast.error(message);
      setMessages((prev) => [
        ...prev,
        { id: `m_${Date.now()}_u`, role: "user", text: question },
        { id: `m_${Date.now()}_e`, role: "assistant", text: message, insufficient: true, citations: [] },
      ]);
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
    textareaRef.current?.focus();
  }, [messages.length, ask.isPending]);

  function submit(question: string) {
    const q = question.trim();
    if (!q || ask.isPending) return;
    setInput("");
    ask.mutate(q);
  }

  const sourcedChunks: Array<Chunk & { score?: number }> = messages
    .filter((message) => message.role === "assistant")
    .flatMap((message) => (message.citations || []).map((citation) => ({
      id: citation.chunkId,
      doc: citation.doc,
      page: citation.page,
      excerpt: citation.preview || `${citation.doc} · page ${citation.page}`,
      score: citation.score,
    })))
    .filter((chunk, index, array) => array.findIndex((entry) => entry.id === chunk.id) === index);

  const visibleChunks = sourcedChunks.length > 0 ? sourcedChunks : (chunks.data ?? []);

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      {/* Chat column */}
      <section className="flex h-[calc(100vh-22rem)] min-h-[480px] flex-col rounded-2xl border border-border bg-surface shadow-[var(--shadow-1)]">
        <header className="flex items-center justify-between border-b border-border/70 px-5 py-3">
          <div>
            <h2 className="font-display text-base font-semibold">Ask the file</h2>
            <p className="text-xs text-muted-foreground">
              Every answer cites the chunk it came from. No file, no answer.
            </p>
          </div>
          <span className="hidden font-mono text-[10px] uppercase tracking-wider text-muted-foreground sm:inline">
            {chunks.data?.length ?? 0} chunks indexed
          </span>
        </header>

        <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto px-5 py-6">
          {messages.length === 0 && !ask.isPending && (
            <EmptyState
              suggestions={suggestions.data ?? []}
              onPick={submit}
            />
          )}
          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              onCite={(c) => setActiveChunk(c.chunkId)}
              activeChunk={activeChunk}
            />
          ))}
          {ask.isPending && <TypingIndicator />}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(input);
          }}
          className="border-t border-border/70 p-3"
        >
          <div className="flex items-end gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit(input);
                }
              }}
              placeholder="Ask about deadlines, defence, relief sought…"
              rows={2}
              className="min-h-[44px] resize-none"
              disabled={ask.isPending}
            />
            <Button
              type="submit"
              size="icon"
              className="h-11 w-11 shrink-0"
              disabled={!input.trim() || ask.isPending}
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </section>

      {/* Sources panel */}
      <aside className="flex h-[calc(100vh-22rem)] min-h-[480px] flex-col rounded-2xl border border-border bg-canvas/60 shadow-[var(--shadow-1)]">
        <header className="border-b border-border/70 px-4 py-3">
          <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Sources consulted
          </h3>
          <p className="mt-1 text-xs text-foreground">
            {activeChunk
              ? "Click another citation to switch."
              : "Citations from your last question will appear here."}
          </p>
        </header>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {chunks.isLoading ? (
            <>
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </>
          ) : (
            visibleChunks.map((c) => (
              <ChunkCard
                key={c.id}
                chunk={c}
                active={activeChunk === c.id}
                onClick={() => setActiveChunk(c.id)}
              />
            ))
          )}
          {chunks.data && chunks.data.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No chunks indexed for this matter yet.
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}

function EmptyState({
  suggestions,
  onPick,
}: {
  suggestions: string[];
  onPick: (q: string) => void;
}) {
  return (
    <div className="mx-auto max-w-md text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-soft text-indigo">
        <Sparkle className="h-5 w-5" />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold">Start a question</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Anything I say is grounded in the indexed file. If the evidence isn't there, I'll
        say so.
      </p>
      {suggestions.length > 0 && (
        <ul className="mt-5 space-y-2 text-left">
          {suggestions.map((s) => (
            <li key={s}>
              <button
                type="button"
                onClick={() => onPick(s)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground transition-colors hover:border-indigo/60 hover:bg-indigo-soft/40"
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MessageBubble({
  message,
  onCite,
  activeChunk,
}: {
  message: ChatMessage;
  onCite: (c: ChatCitation) => void;
  activeChunk: string | null;
}) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="flex max-w-[80%] items-start gap-2">
          <div className="rounded-2xl rounded-tr-md bg-onyx px-4 py-2.5 text-sm leading-relaxed text-white">
            {message.text}
          </div>
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
          </span>
        </div>
      </div>
    );
  }
  return (
    <div className="flex max-w-[88%] items-start gap-2">
      <span
        className={cn(
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          message.insufficient ? "bg-warning/15 text-warning" : "bg-indigo-soft text-indigo",
        )}
      >
        {message.insufficient ? (
          <AlertTriangle className="h-3.5 w-3.5" />
        ) : (
          <Sparkle className="h-3.5 w-3.5" />
        )}
      </span>
      <div
        className={cn(
          "rounded-2xl rounded-tl-md px-4 py-2.5 text-sm leading-relaxed",
          message.insufficient
            ? "border border-warning/40 bg-warning/5 text-foreground"
            : "bg-muted/60 text-foreground",
        )}
      >
        <p>{message.text}</p>
        {message.citations && message.citations.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {message.citations.map((c) => (
              <button
                key={c.chunkId}
                type="button"
                onClick={() => onCite(c)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 font-mono text-[10.5px] leading-none transition-colors",
                  activeChunk === c.chunkId
                    ? "border-mint bg-mint-soft text-onyx"
                    : "border-mint/50 bg-mint-soft/50 text-onyx hover:bg-mint-soft",
                )}
              >
                [Doc: {c.doc}, p.{c.page}]
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex max-w-[60%] items-center gap-2">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-soft text-indigo">
        <Sparkle className="h-3.5 w-3.5" />
      </span>
      <div className="flex items-center gap-1 rounded-2xl rounded-tl-md bg-muted/60 px-4 py-3">
        <Dot delay="0ms" />
        <Dot delay="120ms" />
        <Dot delay="240ms" />
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60"
      style={{ animationDelay: delay }}
    />
  );
}

function ChunkCard({
  chunk,
  active,
  onClick,
}: {
  chunk: Chunk & { score?: number };
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "block w-full rounded-xl border bg-surface p-3 text-left transition-all",
        active
          ? "border-mint shadow-[0_0_0_3px_rgb(0_217_163_/_0.15)]"
          : "border-border hover:border-foreground/30",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="truncate font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {chunk.doc} · p.{chunk.page}
        </p>
        </div>
        {typeof chunk.score === "number" && (
          <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-indigo">
            {Math.round(chunk.score * 100)}%
          </span>
        )}
      </div>
      <p
        className={cn(
          "mt-2 whitespace-pre-wrap text-xs leading-relaxed",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {chunk.excerpt}
      </p>
    </button>
  );
}
