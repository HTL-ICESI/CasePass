const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

const uploadDir = path.resolve(__dirname, '../../uploads');
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`),
});

const upload = multer({ storage });

router.post('/cases/:id/documents', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'A file upload is required.' });
    }

    return res.status(201).json({
      id: uuidv4(),
      case_id: req.params.id,
      filename: req.file.filename,
      original_name: req.file.originalname,
      status: 'pending',
      chunks_count: 0,
      uploaded_at: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to upload document.' });
  }
});

router.get('/cases/:id/documents', async (_req, res) => {
  try {
    return res.json([]);
  } catch (error) {
    return res.status(500).json({ error: 'Unable to fetch documents.' });
  }
});

router.delete('/documents/:id', async (req, res) => {
  try {
    return res.json({ success: true, id: req.params.id });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to delete document.' });
  }
});

module.exports = router;
