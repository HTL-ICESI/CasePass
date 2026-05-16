function createTimestamp() {
  return new Date().toISOString();
}

export function buildMockUser(email = 'admin@casepass.local', overrides = {}) {
  return {
    id: 'local-admin',
    name: 'Acceso Local',
    email,
    role: 'admin',
    active: true,
    ...overrides,
  };
}

export function buildMockCase(overrides = {}) {
  return {
    id: overrides.id || 'local-case-001',
    name: 'Proceso Ordinario Laboral',
    radicado: '11001-31-03-001-2024-00001-00',
    plaintiff: 'Demandante de ejemplo',
    defendant: 'Demandado de ejemplo',
    last_action: 'Recepcion de documentos',
    next_action: 'Preparar resumen del expediente',
    apoderado_notes: 'Expediente local de demostracion para navegar el esqueleto sin depender del login real.',
    created_by: 'local-admin',
    share_token: 'local-share-token',
    created_at: createTimestamp(),
    updated_at: createTimestamp(),
    ...overrides,
  };
}

export function buildMockCases() {
  return [buildMockCase()];
}

export function buildMockSharedCase(token = 'local-shared-case') {
  return {
    id: token,
    name: 'Caso Compartido',
    radicado: '11001-31-03-001-2024-00001-00',
    plaintiff: 'Demandante de ejemplo',
    defendant: 'Demandado de ejemplo',
    last_action: 'Recepcion de documentos',
    next_action: 'Preparar resumen del expediente',
    apoderado_notes: 'Vista compartida local de solo lectura para revisar el esqueleto.',
    documents: [],
  };
}

export function buildMockUsers() {
  return [buildMockUser()];
}

export function buildMockShareLink(caseId) {
  const token = `local-${caseId}`;
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';

  return {
    token,
    url: `${origin}/shared/${token}`,
  };
}

export function buildMockChatResponse(question) {
  return {
    answer: `Modo local: esta es una respuesta de demostracion para "${question}" [1]`,
    sources: [
      {
        doc_name: 'memo-local.txt',
        page: 1,
        chunk_text: `Fragmento local de referencia para la pregunta: ${question}`,
        score: 0.42,
      },
    ],
  };
}

export function buildMockPdfBlob(caseId) {
  const safeCaseId = String(caseId || 'local-case').replace(/[()]/g, '');
  const pdf = `%PDF-1.1
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 95 >>
stream
BT
/F1 12 Tf
72 720 Td
(CasePass resumen local ${safeCaseId}) Tj
0 -18 Td
(Este PDF se genero en modo local.) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000063 00000 n 
0000000122 00000 n 
0000000250 00000 n 
0000000395 00000 n 
trailer
<< /Root 1 0 R /Size 6 >>
startxref
465
%%EOF`;

  return new Blob([pdf], { type: 'application/pdf' });
}
