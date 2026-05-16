import { Link } from 'react-router-dom';
import { FileStack, Share2 } from 'lucide-react';
import api from '../lib/api';
import { buildMockShareLink } from '../lib/mockData';

export default function CaseCard({ caseItem }) {
  async function handleShare() {
    let data;

    try {
      const response = await api.post(`/cases/${caseItem.id}/share`);
      data = response.data;
    } catch (_error) {
      data = buildMockShareLink(caseItem.id);
    }

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(data.url);
      } catch (_error) {
        // Ignore clipboard failures and still show the link.
      }
    }

    window.alert(`Enlace compartido: ${data.url}`);
  }

  return (
    <article className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-5 shadow-docket backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-legal text-cyan-200/70">Expediente</p>
          <h3 className="mt-3 text-xl font-semibold text-white">{caseItem.name}</h3>
          <p className="mt-2 text-sm text-slate-400">Radicado: {caseItem.radicado}</p>
        </div>
        <button
          type="button"
          onClick={handleShare}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs uppercase tracking-[0.24em] text-slate-200 transition hover:border-cyan-300/60 hover:text-cyan-200"
        >
          <Share2 size={14} />
          Compartir
        </button>
      </div>

      <div className="mt-6 rounded-2xl border border-white/5 bg-slate-950/60 p-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-slate-500">
          <FileStack size={14} />
          Ultima actuacion
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-200">{caseItem.last_action || 'Sin datos registrados.'}</p>
      </div>

      <Link to={`/cases/${caseItem.id}`} className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-cyan-300 transition hover:text-cyan-200">
        Abrir expediente
      </Link>
    </article>
  );
}
