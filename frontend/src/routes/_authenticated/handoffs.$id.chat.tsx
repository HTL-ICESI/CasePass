import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  Send,
  AlertTriangle,
  ChevronDown,
  ExternalLink,
  FileText,
  Loader2,
  Sparkle,
  Square,
  User,
} from "lucide-react";

import { api } from "@/lib/api";
import type { ChatCitation, ChatMessage, Chunk } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { CitationChip } from "@/components/app/citation-chip";
import { useOpenCitation } from "@/lib/handoff-citation-context";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/handoffs/$id/chat")({
  head: () => ({ meta: [{ title: "Chat — CasePass" }] }),
  component: ChatPage,
});

function ChatPage() {
  const { id } = Route.useParams();
  const openCitation = useOpenCitation();

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
  const [isAsking, setIsAsking] = useState(false);
  const [streamStatus, setStreamStatus] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
    textareaRef.current?.focus();
  }, [messages, isAsking]);

  async function submit(question: string) {
    const q = question.trim();
    if (!q || isAsking) return;

    const history = messages;
    const timestamp = Date.now();
    const userMsg: ChatMessage = {
      id: `m_${timestamp}_u`,
      role: "user",
      text: q,
    };
    const assistantId = `m_${timestamp}_a`;
    const assistant: ChatMessage = {
      id: assistantId,
      role: "assistant",
      text: "",
      citations: [],
      streaming: true,
    };

    setInput("");
    setIsAsking(true);
    setStreamStatus("Finding the right file passages...");
    setMessages((prev) => [...prev, userMsg, assistant]);

    const controller = new AbortController();
    abortRef.current = controller;
    let streamErrorHandled = false;

    try {
      const answer = await api.streamChatWithSources(
        id,
        q,
        history,
        (event) => {
          if (event.type === "status") {
            setStreamStatus(event.message || "Reading the indexed file...");
          }

          if (event.type === "delta") {
            setMessages((prev) =>
              prev.map((message) =>
                message.id === assistantId
                  ? { ...message, text: `${message.text}${event.text}`, streaming: true }
                  : message,
              ),
            );
          }

          if (event.type === "final") {
            setMessages((prev) =>
              prev.map((message) =>
                message.id === assistantId
                  ? {
                      ...message,
                      text: event.answer.text,
                      citations: event.answer.citations,
                      insufficient: event.answer.insufficient,
                      streaming: false,
                    }
                  : message,
              ),
            );
          }

          if (event.type === "error") {
            streamErrorHandled = true;
            setMessages((prev) =>
              prev.map((message) =>
                message.id === assistantId
                  ? {
                      ...message,
                      text: event.error,
                      insufficient: true,
                      citations: [],
                      streaming: false,
                    }
                  : message,
              ),
            );
          }
        },
        controller.signal,
      );

      if (answer.citations.length > 0) {
        setActiveChunk(answer.citations[0].chunkId);
      }
    } catch (error) {
      const aborted = error instanceof DOMException && error.name === "AbortError";
      const message = aborted
        ? "Response stopped."
        : error instanceof Error
          ? error.message
          : "Chat request failed.";
      if (!streamErrorHandled) {
        if (!aborted) {
          toast.error(message);
        }
        setMessages((prev) =>
          prev.map((entry) =>
            entry.id === assistantId
              ? { ...entry, text: message, insufficient: true, citations: [], streaming: false }
              : entry,
          ),
        );
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      setIsAsking(false);
      setStreamStatus(null);
    }
  }

  const sourcedChunks: Array<Chunk & { score?: number }> = messages
    .filter((message) => message.role === "assistant")
    .flatMap((message) =>
      (message.citations || []).map((citation) => ({
        id: citation.chunkId,
        doc: citation.doc,
        page: citation.page,
        excerpt: citation.preview || `${citation.doc} · page ${citation.page}`,
        score: citation.score,
      })),
    )
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
          {messages.length === 0 && !isAsking && (
            <EmptyState suggestions={suggestions.data ?? []} onPick={submit} />
          )}
          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              onCite={(c) => setActiveChunk(c.chunkId)}
              activeChunk={activeChunk}
              streamStatus={streamStatus}
              onOpenCitation={openCitation}
            />
          ))}
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
              disabled={isAsking}
            />
            <Button
              type={isAsking ? "button" : "submit"}
              size="icon"
              className="h-11 w-11 shrink-0"
              disabled={!isAsking && !input.trim()}
              aria-label={isAsking ? "Stop response" : "Send"}
              onClick={isAsking ? () => abortRef.current?.abort() : undefined}
            >
              {isAsking ? (
                <Square className="h-4 w-4 fill-current" />
              ) : (
                <Send className="h-4 w-4" />
              )}
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
            visibleChunks.map((c, index) => (
              <ChunkCard
                key={c.id}
                chunk={c}
                index={index + 1}
                active={activeChunk === c.id}
                onClick={() => setActiveChunk(c.id)}
                onOpen={(chunk) =>
                  openCitation?.({
                    doc: chunk.doc,
                    page: chunk.page,
                    preview: chunk.excerpt,
                    score: chunk.score,
                  })
                }
              />
            ))
          )}
          {chunks.data && chunks.data.length === 0 && (
            <p className="text-xs text-muted-foreground">No chunks indexed for this matter yet.</p>
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
        Anything I say is grounded in the indexed file. If the evidence isn't there, I'll say so.
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
  streamStatus,
  onOpenCitation,
}: {
  message: ChatMessage;
  onCite: (c: ChatCitation) => void;
  activeChunk: string | null;
  streamStatus?: string | null;
  onOpenCitation?: (citation: {
    doc: string;
    page: number;
    preview?: string;
    score?: number;
  }) => void;
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
        {message.streaming && !message.text ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>{streamStatus || "Reading the indexed file..."}</span>
          </div>
        ) : (
          <AnswerWithInlineCitations
            text={message.text}
            citations={message.citations || []}
            onCite={onCite}
            activeChunk={activeChunk}
            onOpenCitation={onOpenCitation}
          />
        )}
        {message.streaming && message.text && (
          <span className="mt-2 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Streaming
          </span>
        )}
        {message.citations && message.citations.length > 0 && (
          <SourcesFooter citations={message.citations} onOpenCitation={onOpenCitation} />
        )}
      </div>
    </div>
  );
}

function AnswerWithInlineCitations({
  text,
  citations,
  onCite,
  activeChunk,
  onOpenCitation,
}: {
  text: string;
  citations: ChatCitation[];
  onCite: (c: ChatCitation) => void;
  activeChunk: string | null;
  onOpenCitation?: (citation: {
    doc: string;
    page: number;
    preview?: string;
    score?: number;
  }) => void;
}) {
  const citationRegex = /\[Doc:\s*([^,\]]+),\s*p\.(\d+)\]/g;

  const renderLine = (line: string, lineKey: string) => {
    const nodes: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    const re = new RegExp(citationRegex.source, "g");
    let index = 0;

    while ((match = re.exec(line)) !== null) {
      if (match.index > lastIndex) {
        nodes.push(<span key={`${lineKey}-t-${index}`}>{line.slice(lastIndex, match.index)}</span>);
      }
      const docName = match[1].trim();
      const page = Number(match[2]);
      const matched = citations.find(
        (citation) => citation.doc === docName && citation.page === page,
      );
      if (matched) {
        nodes.push(
          <span
            key={`${lineKey}-c-${index}`}
            onClick={() => onCite(matched)}
            role="presentation"
            className={cn(
              "rounded-sm transition-shadow",
              activeChunk === matched.chunkId ? "ring-1 ring-mint" : "",
            )}
          >
            <CitationChip citation={matched} anchorText={line} onOpenDocument={onOpenCitation} />
          </span>,
        );
      } else {
        nodes.push(
          <span key={`${lineKey}-c-${index}`} className="text-muted-foreground">
            {`[${docName}, p.${page}]`}
          </span>,
        );
      }
      lastIndex = match.index + match[0].length;
      index += 1;
    }

    if (lastIndex < line.length) {
      nodes.push(<span key={`${lineKey}-t-end`}>{line.slice(lastIndex)}</span>);
    }
    return nodes;
  };

  type Block = { kind: "ul"; items: string[] } | { kind: "p"; lines: string[] };
  const blocks: Block[] = [];
  const lines = text.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      if (blocks.length && blocks[blocks.length - 1].kind === "p") {
        blocks.push({ kind: "p", lines: [] });
      }
      continue;
    }
    const bulletMatch = line.match(/^\s*(?:•|[-*])\s+(.*)$/);
    if (bulletMatch) {
      const last = blocks[blocks.length - 1];
      if (last && last.kind === "ul") {
        last.items.push(bulletMatch[1]);
      } else {
        blocks.push({ kind: "ul", items: [bulletMatch[1]] });
      }
    } else {
      const last = blocks[blocks.length - 1];
      if (last && last.kind === "p") {
        last.lines.push(line);
      } else {
        blocks.push({ kind: "p", lines: [line] });
      }
    }
  }

  if (blocks.length === 0) {
    return <p className="whitespace-pre-wrap">{text}</p>;
  }

  return (
    <div className="space-y-2 leading-relaxed">
      {blocks.map((block, blockIndex) => {
        if (block.kind === "ul") {
          return (
            <ul key={blockIndex} className="list-none space-y-1 pl-1">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex} className="flex gap-2">
                  <span aria-hidden className="mt-[2px] shrink-0 text-mint">
                    •
                  </span>
                  <span className="min-w-0 flex-1">
                    {renderLine(item, `b${blockIndex}-${itemIndex}`)}
                  </span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={blockIndex} className="whitespace-pre-wrap">
            {renderLine(block.lines.join(" "), `p${blockIndex}`)}
          </p>
        );
      })}
    </div>
  );
}

function SourcesFooter({
  citations,
  onOpenCitation,
}: {
  citations: ChatCitation[];
  onOpenCitation?: (citation: {
    doc: string;
    page: number;
    preview?: string;
    score?: number;
  }) => void;
}) {
  const unique = new Map<string, ChatCitation>();
  for (const citation of citations) {
    const key = `${citation.doc}:${citation.page}`;
    if (!unique.has(key)) unique.set(key, citation);
  }
  const list = Array.from(unique.values());
  if (list.length === 0) return null;

  return (
    <div className="mt-3 border-t border-border/60 pt-2.5">
      <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        Sources used · {list.length}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {list.map((citation, index) => (
          <span key={`${citation.chunkId}-${index}`} className="inline-flex items-center gap-1">
            <span className="font-mono text-[10px] text-muted-foreground">{index + 1}.</span>
            <CitationChip citation={citation} onOpenDocument={onOpenCitation} />
          </span>
        ))}
      </div>
    </div>
  );
}

function formatChunkExcerpt(text: string) {
  if (!text) return "";
  return text
    .replace(/\s+/g, " ")
    .replace(/\s*(\d+\.\d+(?:\.\d+)?)\s+/g, "\n$1 ")
    .replace(/\s*\(([a-z])\)\s+/g, "\n  ($1) ")
    .replace(/\s*•\s+/g, "\n• ")
    .replace(
      /\s+(URGENT ISSUES|DEADLINES|MISSING DOCUMENTS|EXECUTIVE SUMMARY|WHERE WE STAND|RECOMMENDED NEXT STEP|PARTICULARS OF CLAIM|Section \d)\s+/g,
      "\n\n$1\n",
    )
    .trim();
}

function compactDocLabel(doc: string) {
  return doc
    .replace(/^\d{10,}-/, "")
    .replace(/\.(pdf|docx?|txt)$/i, "")
    .replace(/[_-]+/g, " ")
    .trim();
}

function ChunkCard({
  chunk,
  active,
  onClick,
  index,
  onOpen,
}: {
  chunk: Chunk & { score?: number };
  active: boolean;
  onClick: () => void;
  index?: number;
  onOpen?: (chunk: Chunk & { score?: number }) => void;
}) {
  const [expanded, setExpanded] = useState(active);

  useEffect(() => {
    if (active) setExpanded(true);
  }, [active]);

  const formatted = formatChunkExcerpt(chunk.excerpt);
  const docLabel = compactDocLabel(chunk.doc);
  const score = typeof chunk.score === "number" ? Math.round(chunk.score * 100) : null;

  return (
    <div
      className={cn(
        "rounded-xl border bg-surface transition-all",
        active
          ? "border-mint shadow-[0_0_0_3px_rgb(0_217_163_/_0.15)]"
          : "border-border hover:border-foreground/30",
      )}
    >
      <button
        type="button"
        onClick={() => {
          onClick();
          setExpanded((open) => !open);
        }}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
      >
        <div className="flex min-w-0 items-center gap-2">
          {typeof index === "number" && (
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-[10px] text-muted-foreground">
              {index}
            </span>
          )}
          <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <p className="min-w-0 truncate text-xs font-medium text-foreground">
            {docLabel}
            <span className="ml-1 font-mono text-[10px] text-muted-foreground">
              · p.{chunk.page}
            </span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {score !== null && (
            <span className="rounded-full bg-indigo-soft/60 px-1.5 py-[1px] font-mono text-[9.5px] uppercase tracking-wider text-onyx">
              {score}%
            </span>
          )}
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-muted-foreground transition-transform",
              expanded ? "rotate-180" : "rotate-0",
            )}
          />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border/60 px-3 py-2.5">
          <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground">{formatted}</p>
          {onOpen && (
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpen(chunk);
                }}
                className="inline-flex items-center gap-1 text-[10.5px] font-medium text-indigo hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                Open in document
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
