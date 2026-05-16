import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import ChatWidget from '../components/ChatWidget';
import api from '../lib/api';
import { buildMockSharedCase } from '../lib/mockData';

export default function SharedCase() {
  const { token } = useParams();
  const sharedCaseQuery = useQuery({
    queryKey: ['shared-case', token],
    queryFn: async () => {
      try {
        const { data } = await api.get(`/shared/${token}`);
        return data;
      } catch (_error) {
        return buildMockSharedCase(token);
      }
    },
  });

  const caseData = sharedCaseQuery.data;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <section className="rounded-[2.5rem] border border-white/10 bg-slate-900/75 p-6 shadow-docket backdrop-blur">
        <p className="text-xs uppercase tracking-legal text-cyan-200/75">Enlace compartido</p>
        <h1 className="mt-3 text-4xl font-semibold text-white">{caseData?.name || 'Cargando caso compartido...'}</h1>
        <p className="mt-3 text-sm leading-7 text-slate-400">Radicado: {caseData?.radicado || 'Sin radicado'}</p>
        <p className="mt-5 rounded-2xl border border-white/5 bg-slate-950/70 p-4 text-sm leading-7 text-slate-300">
          {caseData?.apoderado_notes || 'Sin notas disponibles.'}
        </p>
      </section>

      <div className="mt-8">
        <ChatWidget
          caseId={caseData?.id}
          disabled
          disabledReason="El chat autenticado no esta habilitado en la vista compartida del esqueleto inicial."
        />
      </div>
    </main>
  );
}
