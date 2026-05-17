const fs = require('fs');
const express = require('express');
const multer = require('multer');
const path = require('path');
const { query } = require('../db');
const { indexDocument } = require('../services/ragService');
const handoffService = require('../services/handoffService');
const aiHandoffService = require('../services/aiHandoffService');

const router = express.Router();
const uploadDir = path.resolve(__dirname, '../../uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadDir),
  filename: (_req, file, callback) => callback(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`),
});

const upload = multer({ storage });

function sendError(res, error) {
  if (error.code === 'INVALID_TRANSITION' || error.code === 'HANDOFF_UPLOAD_BLOCKED') {
    return res.status(error.statusCode || 409).json({
      error: error.message,
      code: error.error_code || error.code,
      current_status: error.current_status,
      allowed_from: error.allowed_next || error.allowed_from,
    });
  }

  if (error.code === 'RECORDING_PROHIBITED') {
    return res.status(403).json({ error: error.message, code: error.code });
  }

  if (error.code === 'VALIDATION_ERROR') {
    return res.status(error.statusCode || 422).json({ error: error.message, field_errors: error.field_errors || {} });
  }

  return res.status(error.statusCode || 500).json({ error: error.message || 'Unexpected handoff error.' });
}

function buildDocumentMetadata(body, defaultDocType) {
  return {
    doc_type: body.doc_type || defaultDocType,
    privilege_flag: body.privilege_flag === 'true' || body.privilege_flag === true,
    confidentiality_flag: body.confidentiality_flag === 'true' || body.confidentiality_flag === true,
    sealed_flag: body.sealed_flag === 'true' || body.sealed_flag === true,
    version_number: body.version_number,
    superseded_by: body.superseded_by,
    source_status: body.source_status || 'original',
    page_count: body.page_count,
  };
}

function buildStoredFilePayload(file, nonPdfStatus = 'indexed') {
  return {
    filename: file.filename,
    original_name: file.originalname,
    status: file.mimetype === 'application/pdf' ? 'indexing' : nonPdfStatus,
    chunks_count: 0,
  };
}

async function maybeIndexUploadedPdf(handoffId, createdDocument, file) {
  if (!file || file.mimetype !== 'application/pdf' || !createdDocument) {
    return null;
  }

  const pdfBuffer = await fs.promises.readFile(file.path);
  return indexDocument(handoffId, createdDocument.id, file.originalname, pdfBuffer);
}

router.post('/handoffs', async (req, res) => {
  try {
    const handoff = await handoffService.createHandoff(req.user.id, req.body.case_id, req.body);
    return res.status(201).json(handoff);
  } catch (error) {
    return sendError(res, error);
  }
});

router.get('/handoffs/recipients', async (req, res) => {
  try {
    const result = await query(
      `
        SELECT id, name, email, role, legal_role, active, created_at
        FROM users
        WHERE active = TRUE
          AND role <> 'admin'
          AND id <> $1
        ORDER BY name ASC
      `,
      [req.user.id],
    );

    return res.json(result.rows);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to fetch handoff recipients.' });
  }
});

router.get('/handoffs/:id', async (req, res) => {
  try {
    const handoff = await handoffService.getFullHandoffState(req.params.id, req.user.id, req.user.role);
    return res.json(handoff);
  } catch (error) {
    return sendError(res, error);
  }
});

router.get('/cases/:id/handoffs', async (req, res) => {
  try {
    const handoffs = await handoffService.listCaseHandoffs(req.params.id, req.user.id, req.user.role);
    return res.json(handoffs);
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/handoffs/:id/clearance-records', async (req, res) => {
  try {
    const handoff = await handoffService.submitClearance(req.params.id, req.body, req.user.id);
    return res.status(201).json(handoff);
  } catch (error) {
    return sendError(res, error);
  }
});

router.patch('/handoffs/:id/representation', async (req, res) => {
  try {
    const handoff = await handoffService.setRepresentationType(req.params.id, req.body.handoff_type, req.user.id);
    return res.json(handoff);
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/handoffs/:id/compliance-records', async (req, res) => {
  try {
    const handoff = await handoffService.setComplianceHold(req.params.id, req.user.id, req.body.reason);
    return res.status(201).json(handoff);
  } catch (error) {
    return sendError(res, error);
  }
});

router.patch('/handoffs/:id/compliance-records/current', async (req, res) => {
  try {
    if (req.body.status !== 'cleared') {
      return res.status(400).json({ error: 'Only status "cleared" is supported for the current compliance record.' });
    }

    const handoff = await handoffService.clearComplianceHold(req.params.id, req.user.id);
    return res.json(handoff);
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/handoffs/:id/documents', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'A file upload is required.' });
    }

    const created = await handoffService.addHandoffDocument(
      req.params.id,
      req.user.id,
      buildStoredFilePayload(req.file, 'pending'),
      buildDocumentMetadata(req.body, 'pleading'),
    );
    setImmediate(async () => {
      try {
        await maybeIndexUploadedPdf(req.params.id, created, req.file);
      } catch (indexingError) {
        console.error('[handoffs] background indexing failed', {
          handoffId: req.params.id,
          documentId: created.id,
          reason: indexingError.message,
        });
      }
    });

    return res.status(201).json({
      document: created,
      indexing: { queued: true },
    });
  } catch (error) {
    return sendError(res, error);
  }
});

router.get('/handoffs/:id/documents', async (req, res) => {
  try {
    const documents = await handoffService.getDocumentMap(req.params.id, req.user.id, req.user.role);
    return res.json(documents);
  } catch (error) {
    return sendError(res, error);
  }
});

router.get('/handoffs/:id/document-map', async (req, res) => {
  try {
    const documentMap = await handoffService.getDocumentMap(req.params.id, req.user.id, req.user.role);
    return res.json(documentMap);
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/handoffs/:id/matter-reviews', async (req, res) => {
  try {
    await handoffService.beginPackBuilding(req.params.id, req.user.id);
    const review = await aiHandoffService.reviewMatter(req.params.id, req.user.id);
    return res.status(201).json(review);
  } catch (error) {
    return sendError(res, error);
  }
});

router.get('/handoffs/:id/handover-notes', async (req, res) => {
  try {
    const notes = await handoffService.listHandoverNotes(req.params.id, req.user.id, req.user.role);
    return res.json(notes);
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/handoffs/:id/handover-notes', async (req, res) => {
  try {
    const handoff = await handoffService.getHandoffRow(req.params.id);
    if (handoff.sending_solicitor_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the sending solicitor may generate a handover note.' });
    }

    if (!['pack_building', 'pack_review'].includes(handoff.status)) {
      return res.status(409).json({
        error: 'Handover note generation is only available while building or reviewing the pack.',
        current_status: handoff.status,
        allowed_from: ['pack_building', 'pack_review'],
      });
    }

    const note = await aiHandoffService.generateHandoverNote(req.params.id, req.user.id);
    return res.status(201).json(note);
  } catch (error) {
    return sendError(res, error);
  }
});

router.patch('/handoffs/:id/handover-notes/:noteId', async (req, res) => {
  try {
    const result = await handoffService.approveHandoverNote(req.params.id, req.params.noteId, req.user.id, req.body.solicitor_edited);
    return res.json(result);
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/handoffs/:id/pack-releases', async (req, res) => {
  try {
    const handoff = await handoffService.releaseHandoverPack(req.params.id, req.user.id);
    return res.status(201).json(handoff);
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/handoffs/:id/acceptances', async (req, res) => {
  try {
    const handoff = await handoffService.acceptHandoff(req.params.id, req.user.id, req.body.scope);
    return res.status(201).json(handoff);
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/handoffs/:id/task-events', async (req, res) => {
  try {
    const handoff = await handoffService.updateTaskStatus(req.params.id, req.user.id, req.body);
    return res.status(201).json(handoff);
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/handoffs/:id/hearing-notes', upload.single('file'), async (req, res) => {
  try {
    const result = await handoffService.addHearingNote(req.params.id, req.user.id, {
      note_text: req.body.note_text,
      hearing_note_type: req.body.hearing_note_type || 'typed_attendance_note',
      ...buildDocumentMetadata(req.body, 'attendance_note'),
      filePayload: req.file ? buildStoredFilePayload(req.file) : null,
    });

    const indexing = await maybeIndexUploadedPdf(req.params.id, result.document, req.file);
    return res.status(201).json({ ...result, indexing });
  } catch (error) {
    return sendError(res, error);
  }
});

router.get('/handoffs/:id/post-action-updates', async (req, res) => {
  try {
    const updates = await handoffService.listPostActionUpdates(req.params.id, req.user.id, req.user.role);
    return res.json(updates);
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/handoffs/:id/post-action-updates', upload.single('file'), async (req, res) => {
  try {
    const result = await handoffService.createPostActionRecord(req.params.id, req.user.id, {
      what_was_done: req.body.what_was_done,
      what_happened: req.body.what_happened,
      what_follows: req.body.what_follows,
      new_procedural_status: req.body.new_procedural_status,
      ...buildDocumentMetadata(req.body, 'post_action_doc'),
      filePayload: req.file ? buildStoredFilePayload(req.file) : null,
    });

    const indexing = await maybeIndexUploadedPdf(req.params.id, result.document, req.file);
    return res.status(201).json({ ...result, indexing });
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/handoffs/:id/post-action-updates/:updateId/drafts', async (req, res) => {
  try {
    await handoffService.markUpdateDraftReady(req.params.id, req.user.id, req.params.updateId);
    const draft = await aiHandoffService.generateUpdateDraft(req.params.updateId, req.user.id);
    return res.status(201).json(draft);
  } catch (error) {
    return sendError(res, error);
  }
});

router.patch('/handoffs/:id/post-action-updates/:updateId', async (req, res) => {
  try {
    const result = await handoffService.verifyUpdate(req.params.id, req.params.updateId, req.user.id, req.body);
    return res.json(result);
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/handoffs/:id/routing-decisions', async (req, res) => {
  try {
    const handoff = await handoffService.routeHandoff(req.params.id, req.body.outcome, req.user.id);
    return res.status(201).json(handoff);
  } catch (error) {
    return sendError(res, error);
  }
});

router.get('/handoffs/:id/continuity', async (req, res) => {
  try {
    const continuity = await handoffService.getContinuity(req.params.id, req.user.id, req.user.role);
    return res.json(continuity);
  } catch (error) {
    return sendError(res, error);
  }
});

module.exports = router;
