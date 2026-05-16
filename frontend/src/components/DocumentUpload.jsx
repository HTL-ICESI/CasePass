import { useRef, useState } from 'react';
import api from '../lib/api';

export default function DocumentUpload({ caseId }) {
  const inputRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Sin cargas recientes.');

  async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    setStatus(`Subiendo ${file.name}...`);

    try {
      const { data } = await api.post(`/cases/${caseId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (event) => {
          if (event.total) {
            setProgress(Math.round((event.loaded / event.total) * 100));
          }
        },
      });

      setStatus(`Archivo ${data.original_name} cargado con estado ${data.status}.`);
    } catch (_error) {
      setProgress(100);
      setStatus(`Archivo ${file.name} cargado en modo local con estado pending.`);
    }
  }

  function handleDrop(event) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];

    if (file) {
      uploadFile(file);
    }
  }

  return (
    <section
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
      className="rounded-[2rem] border border-dashed border-white/15 bg-slate-900/70 p-6"
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];

          if (file) {
            uploadFile(file);
          }
        }}
      />

      <h3 className="text-lg font-semibold text-white">Documentos del caso</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">Arrastra un PDF o usa el selector para simular la carga y el estado de indexacion.</p>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="mt-5 rounded-full border border-cyan-300/50 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:border-cyan-200 hover:text-white"
      >
        Seleccionar PDF
      </button>

      <div className="mt-5 h-2 rounded-full bg-slate-950">
        <div className="h-2 rounded-full bg-cyan-400 transition-all" style={{ width: `${progress}%` }} />
      </div>

      <p className="mt-3 text-sm text-slate-300">{status}</p>
    </section>
  );
}
