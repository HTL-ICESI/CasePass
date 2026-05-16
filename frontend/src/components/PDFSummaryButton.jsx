import api from '../lib/api';
import { buildMockPdfBlob } from '../lib/mockData';

export default function PDFSummaryButton({ caseId }) {
  async function handleDownload() {
    let blob;

    try {
      const { data } = await api.post(`/cases/${caseId}/summary`, {}, { responseType: 'blob' });
      blob = data instanceof Blob ? data : new Blob([data], { type: 'application/pdf' });
    } catch (_error) {
      blob = buildMockPdfBlob(caseId);
    }

    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `case-${caseId}-summary.pdf`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      className="rounded-full border border-cyan-300/40 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:border-cyan-200 hover:text-white"
    >
      Descargar resumen PDF
    </button>
  );
}
