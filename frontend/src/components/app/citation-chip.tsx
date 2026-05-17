import { useState } from "react";
import { Copy, Check, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Citation } from "@/lib/api/types";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

type Props = {
  citation: Citation;
  className?: string;
};

function formatConfidence(score?: number) {
  if (typeof score !== "number") {
    return null;
  }

  return `${Math.round(score * 100)}% confidence`;
}

export function CitationChip({ citation, className }: Props) {
  const [copied, setCopied] = useState(false);
  const label = `[Doc: ${citation.doc}, p.${citation.page}]`;
  const confidence = formatConfidence(citation.score);

  return (
    <HoverCard openDelay={120} closeDelay={80}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          onClick={async (event) => {
            event.preventDefault();
            try {
              await navigator.clipboard.writeText(label);
              setCopied(true);
              setTimeout(() => setCopied(false), 1400);
            } catch {
              // ignore clipboard errors in the browser
            }
          }}
          title="Copy citation"
          className={cn(
            "inline-flex max-w-full items-center gap-1 rounded border border-mint/45 bg-mint-soft/40 px-1.5 py-[1px] align-baseline font-mono text-[9.5px] leading-none text-onyx transition-colors hover:border-mint hover:bg-mint-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            className,
          )}
        >
          <span className="truncate">{label}</span>
          {copied ? <Check className="h-3 w-3 text-mint" /> : <Copy className="h-3 w-3 opacity-50" />}
        </button>
      </HoverCardTrigger>
      <HoverCardContent align="start" className="w-80 space-y-3 border-border/80 bg-surface p-3 shadow-[var(--shadow-2)]">
        <div className="space-y-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Source</p>
          <p className="text-sm font-medium text-foreground">{citation.doc}</p>
          <p className="text-xs text-muted-foreground">Page {citation.page}</p>
        </div>

        {confidence ? (
          <div className="inline-flex items-center gap-1 rounded-full bg-indigo-soft/60 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-onyx">
            <Sparkles className="h-3 w-3" />
            {confidence}
          </div>
        ) : null}

        {citation.preview ? (
          <div className="space-y-1.5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Preview</p>
            <div className="rounded-lg border border-mint/30 bg-mint-soft/20 px-3 py-2 text-sm leading-relaxed text-foreground">
              <mark className="rounded bg-mint-soft px-0.5 text-foreground">{citation.preview}</mark>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No preview available for this citation yet.</p>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
