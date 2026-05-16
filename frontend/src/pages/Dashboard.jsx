import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpenText, Plus } from 'lucide-react';
import CaseCard from '../components/CaseCard';
import CaseForm from '../components/CaseForm';
import { useAuth } from '../hooks/useAuth';
import { useCases, useCreateCase } from '../hooks/useCases';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const casesQuery = useCases();
  const createCase = useCreateCase();

  async function handleCreateCase(payload) {
    const created = await createCase.mutateAsync(payload);
    setShowForm(false);
    navigate(`/cases/${created.id}`);
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <header className="rounded-[2.5rem] border border-white/10 bg-slate-900/75 p-6 shadow-docket backdrop-blur lg:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-legal text-cyan-200/75">Panel principal</p>
            <h1 className="mt-3 text-4xl font-semibold text-white">Expedientes activos</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              Usuario actual: {user?.email || 'sin sesion'}. Este tablero resume los casos y deja preparada la entrada a documentos, chat y resumenes.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {user?.role === 'admin' ? (
              <Link to="/admin" className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 transition hover:border-cyan-200/40 hover:text-white">
                Administracion
              </Link>
            ) : null}
            <button type="button" onClick={() => setShowForm((value) => !value)} className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950">
              <Plus size={16} />
              {showForm ? 'Cerrar formulario' : 'Crear caso'}
            </button>
            <button type="button" onClick={logout} className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 transition hover:border-white/20">
              Salir
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            { label: 'Casos visibles', value: casesQuery.data?.length || 0 },
            { label: 'Acceso', value: 'Modo local temporal' },
            { label: 'Modo', value: 'Skeleton de desarrollo' },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-white/5 bg-slate-950/60 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{item.label}</p>
              <p className="mt-3 text-2xl font-semibold text-white">{item.value}</p>
            </div>
          ))}
        </div>
      </header>

      {showForm ? (
        <section className="mt-8">
          <CaseForm onSubmit={handleCreateCase} submitLabel="Crear caso" />
        </section>
      ) : null}

      <section className="mt-8 flex items-center gap-3 text-sm text-slate-400">
        <BookOpenText size={18} />
        <span>Cada tarjeta abre un expediente con pestañas de documentos, chat, alertas y checklist.</span>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {casesQuery.data?.length ? (
          casesQuery.data.map((caseItem) => <CaseCard key={caseItem.id} caseItem={caseItem} />)
        ) : (
          <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 text-sm leading-7 text-slate-300">
            {casesQuery.error ? 'No fue posible cargar los casos. Verifica que hayas iniciado sesion y que el backend este activo.' : 'No hay casos cargados todavia. Usa "Crear caso" para probar el formulario.'}
          </div>
        )}
      </section>

      <Link to="/" className="mt-8 inline-flex items-center gap-2 text-sm text-cyan-300 transition hover:text-cyan-200">
        Volver al acceso
        <ArrowRight size={16} />
      </Link>
    </main>
  );
}
