const fs = require('fs');
const os = require('os');
const path = require('path');
const { query } = require('../src/db');

async function resetDomainData() {
  await query('TRUNCATE TABLE shared_links, checklist_items, alerts, case_updates, matter_status_snapshots, audit_events, post_action_updates, handover_notes, documents, handoffs, cases RESTART IDENTITY CASCADE');
}

async function createCase(ownerId, overrides = {}) {
  const result = await query(
    `
      INSERT INTO cases (
        case_title, claimant, defendant, forum, urgency,
        claim_number, created_by, solicitor_on_record_id,
        most_recent_operative_event, next_procedural_step
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *
    `,
    [
      overrides.case_title || 'Test Civil Matter',
      overrides.claimant || 'Claimant Ltd',
      overrides.defendant || 'Defendant Ltd',
      overrides.forum || 'county_court',
      overrides.urgency || 'urgent',
      overrides.claim_number || 'CLM-001',
      ownerId,
      overrides.solicitor_on_record_id || ownerId,
      overrides.most_recent_operative_event || null,
      overrides.next_procedural_step || null,
    ],
  );

  return result.rows[0];
}

async function createHandoff(caseId, senderId, receiverId, overrides = {}) {
  const result = await query(
    `
      INSERT INTO handoffs (
        case_id, sending_solicitor_id, receiving_solicitor_id,
        intended_task, status, clearance_result
      )
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *
    `,
    [
      caseId,
      senderId,
      receiverId,
      overrides.intended_task || 'Prepare for hearing.',
      overrides.status || 'clearance_pending',
      overrides.clearance_result || 'pending',
    ],
  );

  return result.rows[0];
}

async function createDocument(caseId, handoffId, uploadedBy, overrides = {}) {
  const result = await query(
    `
      INSERT INTO documents (
        case_id, handoff_id, filename, original_name, doc_type,
        source_status, status, uploaded_by, chunks_count, page_count
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *
    `,
    [
      caseId,
      handoffId || null,
      overrides.filename || 'test.pdf',
      overrides.original_name || 'test.pdf',
      overrides.doc_type || 'pleading',
      overrides.source_status || 'original',
      overrides.status || 'indexed',
      uploadedBy,
      overrides.chunks_count || 1,
      overrides.page_count || 1,
    ],
  );

  return result.rows[0];
}

function createPdfFixture(contents = 'Test PDF content for CasePass') {
  const filePath = path.join(os.tmpdir(), `casepass-test-${Date.now()}.pdf`);
  const escaped = contents.replace(/[()\\]/g, '');
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
<< /Length 120 >>
stream
BT
/F1 12 Tf
72 720 Td
(${escaped.slice(0, 100)}) Tj
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
0000000418 00000 n 
trailer
<< /Root 1 0 R /Size 6 >>
startxref
488
%%EOF`;
  fs.writeFileSync(filePath, pdf);
  return filePath;
}

module.exports = {
  resetDomainData,
  createCase,
  createHandoff,
  createDocument,
  createPdfFixture,
};
