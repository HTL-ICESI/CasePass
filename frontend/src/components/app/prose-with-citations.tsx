import { CitationChip } from "@/components/app/citation-chip";
import { cn } from "@/lib/utils";
import type { Citation } from "@/lib/api/types";

type Props = {
  text?: string;
  onOpenCitation?: (citation: Citation) => void;
  className?: string;
};

const CITATION_RE = /\[Doc:\s*([^,\]]+),\s*p\.(\d+)\]/g;

export function ProseWithCitations({ text, onOpenCitation, className }: Props) {
  if (!text) return null;

  const renderLine = (line: string, lineKey: string) => {
    const nodes: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    const re = new RegExp(CITATION_RE.source, "g");
    let i = 0;

    while ((match = re.exec(line)) !== null) {
      if (match.index > lastIndex) {
        nodes.push(<span key={`${lineKey}-t-${i}`}>{line.slice(lastIndex, match.index)}</span>);
      }
      const citation: Citation = { doc: match[1].trim(), page: Number(match[2]) };
      nodes.push(
        <CitationChip
          key={`${lineKey}-c-${i}`}
          citation={citation}
          anchorText={line}
          onOpenDocument={onOpenCitation}
        />,
      );
      lastIndex = match.index + match[0].length;
      i += 1;
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

    const bullet = line.match(/^\s*(?:•|[-*])\s+(.*)$/);
    if (bullet) {
      const last = blocks[blocks.length - 1];
      if (last && last.kind === "ul") {
        last.items.push(bullet[1]);
      } else {
        blocks.push({ kind: "ul", items: [bullet[1]] });
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
    return <p className={cn("whitespace-pre-wrap", className)}>{text}</p>;
  }

  return (
    <div className={cn("space-y-3 leading-relaxed", className)}>
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
