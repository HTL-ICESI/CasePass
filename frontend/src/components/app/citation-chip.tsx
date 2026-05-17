import { useState } from "react";
import { Copy, Check } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Citation } from "@/lib/api/types";

type Props = {
  citation: Citation;
  className?: string;
};

export function CitationChip({ citation, className }: Props) {
  const [copied, setCopied] = useState(false);
  const label = `[Doc: ${citation.doc}, p.${citation.page}]`;

  return (
    <button
      type="button"
      onClick={async (e) => {
        e.preventDefault();
        try {
          await navigator.clipboard.writeText(label);
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        } catch {
          /* ignore */
        }
      }}
      title="Copy citation"
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border border-mint/60 bg-mint-soft/60 px-1.5 py-0.5 align-baseline font-mono text-[10.5px] leading-none text-onyx transition-colors hover:bg-mint-soft hover:border-mint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <span className="truncate">{label}</span>
      {copied ? <Check className="h-3 w-3 text-mint" /> : <Copy className="h-3 w-3 opacity-60" />}
    </button>
  );
}
