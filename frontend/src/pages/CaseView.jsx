import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import ChatWidget from '../components/ChatWidget';
import DocumentUpload from '../components/DocumentUpload';
import PDFSummaryButton from '../components/PDFSummaryButton';
import CaseForm from '../components/CaseForm';
import { useCase, useUpdateCase } from '../hooks/useCases';

const tabs = ['Documents', 'Chat', 'Updates', 'Alerts', 'Checklist'];

export default function CaseView() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('Documents');
  const caseQuery = useCase(id);
  const updateCase = useUpdateCase(id);
  const caseData = caseQuery.data;

  const panel = useMemo(() => {
    if (!caseData) {
      return <p className="text-sm text-slate-400">Cargando caso...</p>;
    }

    if (activeTab === 'Documents') {
      return <DocumentUpload caseId={id} />;
    }

    if (activeTab === 'Chat') {
      return <ChatWidget caseId={id} />;
    }

    if (activeTab === 'Updates') {
      return <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-5 text-sm text-slate-300">No hay actualizaciones registradas todavia.</div>;
    }

    if (activeTab === 'Alerts') {
      return <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-5 text-sm text-slate-300">No hay alertas pendientes.</div>;
    }

    return <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-5 text-sm text-slate-300">No hay checklist registrado.</div>;
  }, [activeTab, caseData, id]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <header className="rounded-[2.5rem] border border-white/10 bg-slate-900/75 p-6 shadow-docket backdrop-blur lg:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-legal text-cyan-200/75">Detalle del caso</p>
            <h1 className="mt-3 text-4xl font-semibold text-white">{caseData?.name || 'Cargando expediente...'}</h1>
            <p className="mt-3 text-sm leading-7 text-slate-300">Radicado: {caseData?.radicado || 'Sin radicado'}</p>
          </div>
          <PDFSummaryButton caseId={id} />
        </div>
      </header>

      {caseData ? (
        <section className="mt-8">
          <CaseForm initialValues={caseData} onSubmit={(payload) => updateCase.mutateAsync(payload)} submitLabel="Actualizar caso" />
        </section>
      ) : null}

      <nav className="mt-8 flex flex-wrap gap-3">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-full px-4 py-2 text-sm uppercase tracking-[0.18em] ${activeTab === tab ? 'bg-cyan-400 font-semibold text-slate-950' : 'border border-white/10 text-slate-200 transition hover:border-cyan-200/30 hover:text-white'}`}
          >
            {tab}
          </button>
        ))}
      </nav>

      <section className="mt-6">{panel}</section>
    </main>
  );
}
