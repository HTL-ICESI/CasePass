import { useState } from 'react';

export default function SourceCitation({ source }) {
  const [expanded, setExpanded] = useState(false);
  const text = source.chunk_text || '';
  const preview = text.length > 150 ? `${text.slice(0, 150)}...` : text;

  return (
    <button
      type="button"
      onClick={() => setExpanded((value) => !value)}
      className="w-full rounded-2xl border border-cyan-400/15 bg-slate-950/80 p-3 text-left transition hover:border-cyan-300/35"
    >
      <div className="flex items-center justify-between gap-3 text-xs text-slate-300">
        <span>{source.doc_name}</span>
        <span className="rounded-full bg-cyan-400/10 px-2 py-1 text-cyan-200">Pg. {source.page} · {source.score}</span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-200">{expanded ? text : preview}</p>
    </button>
  );
}
