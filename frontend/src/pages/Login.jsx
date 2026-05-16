import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scale, ShieldCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@casepass.local');
  const [password, setPassword] = useState('casepass');
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'No fue posible iniciar sesion.');
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="grid w-full max-w-6xl gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[2.5rem] border border-white/10 bg-slate-900/75 p-8 shadow-docket backdrop-blur lg:p-12">
          <div className="flex items-center gap-3 text-cyan-200">
            <Scale size={22} />
            <span className="text-xs uppercase tracking-legal">CasePass</span>
          </div>
          <h1 className="mt-8 max-w-2xl text-4xl font-semibold leading-tight text-white lg:text-5xl">
            Gestion legal con un expediente claro, consultable y listo para compartir.
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-7 text-slate-300">
            El esqueleto inicial organiza casos, documentos, resumenes PDF y una futura capa RAG para consultas guiadas sobre el expediente.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {[
              'Control documental por expediente',
              'Chat con citas de fuentes por documento',
              'Vistas compartidas de solo lectura',
              'Resumenes PDF listos para exportar',
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-white/5 bg-slate-950/70 p-4 text-sm leading-6 text-slate-300">
                {item}
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="rounded-[2.5rem] border border-cyan-300/10 bg-slate-950/85 p-8 shadow-docket backdrop-blur lg:p-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 px-4 py-2 text-xs uppercase tracking-[0.28em] text-cyan-200">
            <ShieldCheck size={14} />
            Acceso seguro
          </div>
          <h2 className="mt-8 text-3xl font-semibold text-white">Ingreso al expediente digital</h2>
          <p className="mt-3 text-sm leading-7 text-slate-400">Usa cualquier correo y clave para entrar en modo local temporal mientras dejamos el backend real fuera del flujo de acceso.</p>

          <label className="mt-8 block text-sm text-slate-300">
            <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-slate-500">Correo</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-[1.5rem] border border-white/10 bg-slate-900 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-300/45"
            />
          </label>

          <label className="mt-4 block text-sm text-slate-300">
            <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-slate-500">Clave</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-[1.5rem] border border-white/10 bg-slate-900 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-300/45"
            />
          </label>

          {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}

          <button type="submit" className="mt-8 w-full rounded-full bg-cyan-400 px-4 py-3 text-sm font-semibold uppercase tracking-[0.22em] text-slate-950">
            Ingresar
          </button>
        </form>
      </section>
    </main>
  );
}
