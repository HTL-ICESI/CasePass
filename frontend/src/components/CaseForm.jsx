import { useState } from 'react';

const emptyCase = {
  name: '',
  radicado: '',
  plaintiff: '',
  defendant: '',
  last_action: '',
  next_action: '',
  apoderado_notes: '',
};

export default function CaseForm({ initialValues = emptyCase, onSubmit, submitLabel = 'Guardar caso' }) {
  const [form, setForm] = useState({ ...emptyCase, ...initialValues });

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 rounded-[2rem] border border-white/10 bg-slate-900/80 p-5 md:grid-cols-2">
      {Object.entries(form).map(([key, value]) => (
        <label key={key} className={`text-sm text-slate-300 ${key === 'apoderado_notes' ? 'md:col-span-2' : ''}`}>
          <span className="mb-2 block text-xs uppercase tracking-[0.22em] text-slate-500">{key.replaceAll('_', ' ')}</span>
          {key === 'apoderado_notes' ? (
            <textarea
              value={value}
              onChange={(event) => updateField(key, event.target.value)}
              className="min-h-28 w-full rounded-[1.25rem] border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-300/50"
            />
          ) : (
            <input
              value={value}
              onChange={(event) => updateField(key, event.target.value)}
              className="w-full rounded-[1.25rem] border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-300/50"
            />
          )}
        </label>
      ))}

      <button type="submit" className="md:col-span-2 rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950">
        {submitLabel}
      </button>
    </form>
  );
}
