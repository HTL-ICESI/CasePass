import { useState } from 'react';
import api from '../lib/api';
import { buildMockChatResponse } from '../lib/mockData';
import SourceCitation from './SourceCitation';

export default function ChatWidget({ caseId, disabled = false, disabledReason = 'Chat no disponible.' }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hola. Soy el asistente inicial de CasePass. Haz una pregunta para probar el flujo.',
      sources: [],
    },
  ]);
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!question.trim() || disabled) {
      return;
    }

    const nextQuestion = question.trim();
    setMessages((current) => [...current, { role: 'user', content: nextQuestion, sources: [] }]);
    setQuestion('');
    setIsLoading(true);

    try {
      const { data } = await api.post(`/cases/${caseId}/chat`, { question: nextQuestion });
      setMessages((current) => [...current, { role: 'assistant', content: data.answer, sources: data.sources || [] }]);
    } catch (_error) {
      const localResponse = buildMockChatResponse(nextQuestion);
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: localResponse.answer,
          sources: localResponse.sources,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-4 shadow-docket backdrop-blur">
      <div className="space-y-4">
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className="space-y-3 rounded-2xl border border-white/5 bg-slate-950/70 p-4">
            <p className="text-[11px] uppercase tracking-legal text-slate-500">{message.role}</p>
            <p className="text-sm leading-6 text-slate-100">{message.content}</p>
            {message.role === 'assistant' && message.sources?.length > 0 ? (
              <div className="space-y-2">
                {message.sources.map((source, sourceIndex) => (
                  <SourceCitation key={`${source.doc_name}-${sourceIndex}`} source={source} />
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder={disabled ? disabledReason : 'Pregunta por hechos, documentos o estrategia procesal...'}
          disabled={disabled || isLoading}
          className="min-h-28 w-full rounded-[1.5rem] border border-white/10 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/50"
        />
        <button
          type="submit"
          disabled={disabled || isLoading}
          className="rounded-full bg-cyan-400 px-5 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? 'Consultando...' : 'Enviar pregunta'}
        </button>
      </form>
    </section>
  );
}
