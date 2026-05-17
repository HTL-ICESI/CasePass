import { useState } from "react";
import { Copy, Check, Sparkles, FileSearch, Info } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Citation } from "@/lib/api/types";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

type Props = {
  citation: Citation;
  className?: string;
  onOpenDocument?: (citation: Citation) => void;
  anchorText?: string;
};

const PREVIEW_MAX_CHARS = 240;
const FALLBACK_SCORE = 0.5;

function shouldShowScore(score?: number) {
  if (typeof score !== "number") return false;
  return Math.abs(score - FALLBACK_SCORE) > 0.0001;
}

function formatMatch(score?: number) {
  if (typeof score !== "number") return null;
  return `${Math.round(score * 100)}% match`;
}

function scoreInterpretation(score?: number) {
  if (typeof score !== "number") return "";
  const pct = score * 100;
  if (pct >= 95) return "Almost a direct restatement of what was asked.";
  if (pct >= 80) return "Same topic; strong semantic match.";
  if (pct >= 60) return "Related topic; shares vocabulary or concept.";
  if (pct >= 40) return "Partially relevant; some shared terms.";
  return "Weak match; likely tangential.";
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function scoreSentence(sentence: string, anchorTerms: string[]): number {
  if (anchorTerms.length === 0) return 0;
  const lowered = sentence.toLowerCase();
  return anchorTerms.reduce((total, term) => (lowered.includes(term) ? total + 1 : total), 0);
}

function pickRelevantSentence(chunk: string, anchorText?: string): string | null {
  const sentences = splitSentences(chunk);
  if (sentences.length === 0) return null;

  if (!anchorText) return sentences[0];

  const anchorTerms = anchorText
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9£$€]+/)
    .filter((term) => term.length >= 3);

  let best: { sentence: string; score: number } | null = null;
  for (const sentence of sentences) {
    const score = scoreSentence(sentence, anchorTerms);
    if (!best || score > best.score) {
      best = { sentence, score };
    }
  }

  if (best && best.score > 0) return best.sentence;
  return sentences[0];
}

function buildSnippet(chunkText: string, anchorText?: string) {
  const cleanChunk = chunkText.replace(/\s+/g, " ").trim();
  const focusSentence = pickRelevantSentence(cleanChunk, anchorText);
  if (!focusSentence) return { snippet: "", leadingEllipsis: false, trailingEllipsis: false };

  const focusIndex = cleanChunk.indexOf(focusSentence);
  if (focusIndex < 0) {
    return {
      snippet: focusSentence.slice(0, PREVIEW_MAX_CHARS),
      leadingEllipsis: false,
      trailingEllipsis: focusSentence.length > PREVIEW_MAX_CHARS,
    };
  }

  const remaining = Math.max(0, PREVIEW_MAX_CHARS - focusSentence.length);
  const padBefore = Math.min(Math.floor(remaining / 2), focusIndex);
  let start = focusIndex - padBefore;
  let end = start + PREVIEW_MAX_CHARS;
  if (end > cleanChunk.length) {
    end = cleanChunk.length;
    start = Math.max(0, end - PREVIEW_MAX_CHARS);
  }

  if (start > 0) {
    const space = cleanChunk.indexOf(" ", start);
    if (space > 0 && space - start < 20) start = space + 1;
  }
  if (end < cleanChunk.length) {
    const space = cleanChunk.lastIndexOf(" ", end);
    if (space > start) end = space;
  }

  return {
    snippet: cleanChunk.slice(start, end),
    leadingEllipsis: start > 0,
    trailingEllipsis: end < cleanChunk.length,
  };
}

function compactDocLabel(doc: string) {
  const base = doc
    .replace(/^\d{10,}-/, "")
    .replace(/\.(pdf|docx?|txt)$/i, "")
    .replace(/[_-]+/g, " ")
    .trim();
  if (base.length > 24) {
    return `${base.slice(0, 22)}...`;
  }
  return base;
}

export function CitationChip({ citation, className, onOpenDocument, anchorText }: Props) {
  const [copied, setCopied] = useState(false);
  const compactLabel = `${compactDocLabel(citation.doc)} · p.${citation.page}`;
  const label = `[Doc: ${citation.doc}, p.${citation.page}]`;
  const match = shouldShowScore(citation.score) ? formatMatch(citation.score) : null;
  const isPlaceholderScore = !shouldShowScore(citation.score);
  const { snippet, leadingEllipsis, trailingEllipsis } = citation.preview
    ? buildSnippet(citation.preview, anchorText)
    : { snippet: "", leadingEllipsis: false, trailingEllipsis: false };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(label);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleClick = (event: React.MouseEvent | React.KeyboardEvent) => {
    event.preventDefault();
    if (onOpenDocument) {
      onOpenDocument(citation);
    } else {
      copyToClipboard();
    }
  };

  return (
    <HoverCard openDelay={120} closeDelay={80}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          onClick={handleClick}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              handleClick(event);
            }
          }}
          title={`${label}${onOpenDocument ? " - click to open at this page" : " - click to copy"}`}
          className={cn(
            "inline-flex max-w-full items-center gap-1 rounded border border-mint/45 bg-mint-soft/40 px-1.5 py-[2px] align-baseline text-[10px] font-medium leading-none text-onyx transition-colors hover:border-mint hover:bg-mint-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            className,
          )}
        >
          <span className="truncate">{compactLabel}</span>
          {onOpenDocument ? (
            <FileSearch className="h-3 w-3 opacity-60" />
          ) : copied ? (
            <Check className="h-3 w-3 text-mint" />
          ) : (
            <Copy className="h-3 w-3 opacity-50" />
          )}
        </button>
      </HoverCardTrigger>
      <HoverCardContent
        align="start"
        className="w-80 space-y-3 border-border/80 bg-surface p-3 shadow-[var(--shadow-2)]"
      >
        <div className="space-y-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Source
          </p>
          <p className="text-sm font-medium text-foreground">{citation.doc}</p>
          <p className="text-xs text-muted-foreground">Page {citation.page}</p>
        </div>

        {match ? (
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1 rounded-full bg-indigo-soft/60 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-onyx">
              <Sparkles className="h-3 w-3" />
              {match}
            </div>
            <p className="text-[10.5px] leading-snug text-muted-foreground">
              {scoreInterpretation(citation.score)}
            </p>
          </div>
        ) : isPlaceholderScore ? (
          <div className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground">
            <Info className="h-3 w-3" />
            Match not scored
          </div>
        ) : null}

        {snippet ? (
          <div className="space-y-1.5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Excerpt
            </p>
            <div className="rounded-lg border border-mint/30 bg-mint-soft/20 px-3 py-2 text-sm leading-relaxed text-foreground">
              {leadingEllipsis && <span className="text-muted-foreground">...</span>}
              <mark className="rounded bg-mint-soft px-0.5 text-foreground">{snippet}</mark>
              {trailingEllipsis && <span className="text-muted-foreground">...</span>}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            No excerpt available for this citation yet.
          </p>
        )}

        <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-2">
          <button
            type="button"
            onClick={copyToClipboard}
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          >
            {copied ? <Check className="h-3 w-3 text-mint" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copied" : "Copy citation"}
          </button>
          {onOpenDocument && (
            <button
              type="button"
              onClick={() => onOpenDocument(citation)}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo hover:underline"
            >
              <FileSearch className="h-3 w-3" />
              Open document
            </button>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
