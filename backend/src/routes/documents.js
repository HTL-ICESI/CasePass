const fs = require('fs');
const express = require('express');
const multer = require('multer');
const path = require('path');
const { query } = require('../db');
const { indexDocument } = require('../services/ragService');
const { logEvent } = require('../services/auditService');
const { TERMINAL_STATUSES } = require('../services/handoffService');

const router = express.Router();
const uploadDir = path.resolve(__dirname, '../../uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`),
});

const upload = multer({ storage });

async function getCaseForDocuments(caseId, userId, role) {
  const result = await query(
    `
      SELECT *
      FROM cases
      WHERE id = $1
        AND (
          $3 = 'admin'
          OR created_by = $2
          OR solicitor_on_record_id = $2
          OR EXISTS (
            SELECT 1 FROM handoffs h
            WHERE h.case_id = cases.id
              AND h.receiving_solicitor_id = $2
          )
        )
    `,
    [caseId, userId, role],
  );

  return result.rows[0] || null;
}

router.post('/cases/:id/documents', upload.single('file'), async (req, res) => {
  try {
    const caseRow = await getCaseForDocuments(req.params.id, req.user.id, req.user.role);
    if (!caseRow) {
      return res.status(403).json({ error: 'You do not have access to this case.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'A file upload is required.' });
    }

    if (req.file.mimetype !== 'application/pdf') {
      return res.status(422).json({ error: 'Only PDF files are supported for case document upload.' });
    }

    const handoffResult = await query(
      `
        SELECT *
        FROM handoffs
        WHERE case_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [req.params.id],
    );
    const activeHandoff = handoffResult.rows[0] || null;

    if (activeHandoff && !['file_upload_open', 'pack_building'].includes(activeHandoff.status)) {
      return res.status(403).json({
        error: 'Document upload is not permitted at this stage. Files can only be uploaded after recipient clearance is approved.',
        code: 'CLEARANCE_GATE_BLOCKED',
        current_handoff_status: activeHandoff.status,
      });
    }

    const result = await query(
      `
        INSERT INTO documents (
          case_id,
          handoff_id,
          filename,
          original_name,
          doc_type,
          source_status,
          sealed_flag,
          privilege_flag,
          confidentiality_flag,
          status,
          chunks_count,
          page_count,
          uploaded_by
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending',0,$10,$11)
        RETURNING *
      `,
      [
        req.params.id,
        activeHandoff?.id || null,
        req.file.filename,
        req.file.originalname,
        req.body.doc_type || 'other',
        req.body.source_status || 'original',
        req.body.sealed_flag === 'true' || req.body.sealed_flag === true,
        req.body.privilege_flag === 'true' || req.body.privilege_flag === true,
        req.body.confidentiality_flag === 'true' || req.body.confidentiality_flag === true,
        req.body.page_count || null,
        req.user.id,
      ],
    );

    const document = result.rows[0];
    const pdfBuffer = await fs.promises.readFile(req.file.path);
    setImmediate(async () => {
      try {
        if (document.handoff_id) {
          await indexDocument(document.handoff_id, document.id, document.original_name, pdfBuffer);
        } else {
          await query(
            `UPDATE documents SET status = 'indexed', chunks_count = 0, index_error = NULL WHERE id = $1`,
            [document.id],
          );
        }
      } catch (error) {
        console.error('[documents] background indexing failed', error.message);
      }
    });

    await logEvent('document', document.id, 'document_uploaded', req.user.id, null, document.status, {
      case_id: req.params.id,
      handoff_id: document.handoff_id,
    });

    return res.status(201).json(document);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to upload document.' });
  }
});

router.get('/cases/:id/documents', async (req, res) => {
  try {
    const caseRow = await getCaseForDocuments(req.params.id, req.user.id, req.user.role);
    if (!caseRow) {
      return res.status(403).json({ error: 'You do not have access to this case.' });
    }

    const result = await query(
      `
        SELECT *
        FROM documents
        WHERE case_id = $1
        ORDER BY uploaded_at DESC
      `,
      [req.params.id],
    );

    return res.json(result.rows);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to fetch documents.' });
  }
});

router.delete('/documents/:id', async (req, res) => {
  try {
    const result = await query('SELECT * FROM documents WHERE id = $1', [req.params.id]);
    const document = result.rows[0];

    if (!document) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    if (document.uploaded_by !== req.user.id) {
      return res.status(403).json({ error: 'Only the uploading user may delete this document.' });
    }

    if (document.handoff_id) {
      const handoffResult = await query('SELECT status FROM handoffs WHERE id = $1', [document.handoff_id]);
      const handoff = handoffResult.rows[0];
      if (handoff && !TERMINAL_STATUSES.has(handoff.status)) {
        return res.status(409).json({ error: 'Documents linked to an active handoff cannot be deleted.' });
      }
    }

    const filePath = path.join(uploadDir, document.filename);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }

    await query('DELETE FROM documents WHERE id = $1', [req.params.id]);
    await logEvent('document', document.id, 'document_deleted', req.user.id, document.status, null, { case_id: document.case_id });
    return res.json({ success: true, id: req.params.id });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to delete document.' });
  }
});

module.exports = router;
