# CasePass Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete CasePass repository-root scaffold so Docker, backend, and frontend all boot cleanly with the requested route, page, and service boundaries.

**Architecture:** Keep the repository as two independent Node applications at the root: an Express backend and a Vite React frontend. Make runtime behavior placeholder-safe by keeping persistence, RAG, Claude, and PDF internals behind small named service functions while still generating every requested file with working imports, exports, and page structure.

**Tech Stack:** Docker Compose, PostgreSQL 15, ChromaDB, Node.js, Express, pg, jsonwebtoken, bcryptjs, multer, pdf-parse, OpenAI SDK, Anthropic SDK, chromadb client, Puppeteer, React 18, Vite, TailwindCSS, React Query, React Router, Axios, Lucide React

---

Commits are intentionally omitted from this plan because this repository should not create git commits unless the user explicitly asks for them.

## File Structure

### Root files

- Create: `README.md` - project overview and local development instructions
- Create: `.env.example` - shared reference environment variables
- Create: `.gitignore` - ignore runtime artifacts and local env files
- Create: `docker-compose.yml` - Postgres and ChromaDB services on `casepass-net`
- Create: `casos-prueba/README.md` - instructions for lawyer-managed test case folders

### Backend files

- Create: `backend/package.json` - backend package metadata and scripts
- Create: `backend/.env.example` - backend runtime variables
- Create: `backend/src/index.js` - Express app bootstrap and route registration
- Create: `backend/src/db/index.js` - pg pool, query helper, migration helper
- Create: `backend/src/db/schema.sql` - SQL schema for all requested tables
- Create: `backend/src/middleware/auth.js` - JWT verification middleware
- Create: `backend/src/middleware/roles.js` - `requireAdmin` and `requireUser`
- Create: `backend/src/routes/auth.js` - login and admin register routes
- Create: `backend/src/routes/cases.js` - case CRUD routes
- Create: `backend/src/routes/documents.js` - upload/list/delete document routes
- Create: `backend/src/routes/chat.js` - case chat route
- Create: `backend/src/routes/summary.js` - summary PDF route
- Create: `backend/src/routes/share.js` - share-token create/read routes
- Create: `backend/src/routes/users.js` - admin user management routes
- Create: `backend/src/services/ragService.js` - chunking utility plus ChromaDB TODO stubs
- Create: `backend/src/services/claudeService.js` - prompt builder and summary TODO stubs
- Create: `backend/src/services/pdfService.js` - PDF buffer generator stub
- Create directory: `backend/uploads/` - multer destination directory

### Frontend files

- Create: `frontend/package.json` - frontend package metadata and scripts
- Create: `frontend/vite.config.js` - Vite proxy to `http://localhost:3001`
- Create: `frontend/tailwind.config.js` - Tailwind content scan config
- Create: `frontend/postcss.config.js` - Tailwind and Autoprefixer integration
- Create: `frontend/index.html` - Vite HTML entry
- Create: `frontend/src/main.jsx` - React bootstrap, query client, router provider
- Create: `frontend/src/router.jsx` - route definitions for `/`, `/dashboard`, `/cases/:id`, `/shared/:token`, `/admin`
- Create: `frontend/src/index.css` - Tailwind directives and base theme styles
- Create: `frontend/src/lib/api.js` - axios instance with JWT interceptor
- Create: `frontend/src/hooks/useAuth.js` - localStorage-backed auth store
- Create: `frontend/src/hooks/useCases.js` - React Query wrappers for case endpoints
- Create: `frontend/src/pages/Login.jsx` - login page
- Create: `frontend/src/pages/Dashboard.jsx` - case grid page
- Create: `frontend/src/pages/CaseView.jsx` - tabbed case detail page
- Create: `frontend/src/pages/SharedCase.jsx` - read-only shared case page
- Create: `frontend/src/pages/Admin.jsx` - admin user page
- Create: `frontend/src/components/CaseCard.jsx` - case summary card
- Create: `frontend/src/components/ChatWidget.jsx` - chat messages and source rendering
- Create: `frontend/src/components/SourceCitation.jsx` - expandable source renderer
- Create: `frontend/src/components/DocumentUpload.jsx` - upload drop zone and progress UI
- Create: `frontend/src/components/CaseForm.jsx` - create/edit case form
- Create: `frontend/src/components/PDFSummaryButton.jsx` - PDF download trigger

## Task 1: Create The Root Scaffold

**Files:**
- Create: `.gitignore`
- Create: `.env.example`
- Create: `docker-compose.yml`
- Create: `README.md`
- Create: `casos-prueba/README.md`

- [ ] **Step 1: Create `.gitignore` and root `.env.example`**

```gitignore
node_modules
.env
uploads/
dist/
.DS_Store
.worktrees/
```

```dotenv
APP_URL=http://localhost:5173
API_URL=http://localhost:3001
DATABASE_URL=postgresql://casepass:casepass@localhost:5432/casepass
JWT_SECRET=change-me
CHROMA_URL=http://localhost:8000
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```

- [ ] **Step 2: Create `docker-compose.yml` with the required services and network**

```yaml
version: '3.9'

services:
  postgres:
    image: postgres:15
    container_name: casepass-postgres
    environment:
      POSTGRES_DB: casepass
      POSTGRES_USER: casepass
      POSTGRES_PASSWORD: casepass
    ports:
      - '5432:5432'
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - casepass-net

  chromadb:
    image: chromadb/chroma:latest
    container_name: casepass-chromadb
    ports:
      - '8000:8000'
    networks:
      - casepass-net

volumes:
  postgres-data:

networks:
  casepass-net:
    driver: bridge
```

- [ ] **Step 3: Create `README.md` and `casos-prueba/README.md`**

```markdown
# CasePass

CasePass is a legal case management platform scaffold with a future RAG-powered assistant.

## Structure

- `frontend/` - React 18 + Vite client
- `backend/` - Express API
- `casos-prueba/` - lawyer-managed sample cases

## Requirements

- Node.js 20+
- npm 10+
- Docker Desktop or Docker Engine with Compose

## Environment

Copy the root and backend example env files before running the apps.

## Infrastructure

```bash
docker compose up -d
```

This starts:

- PostgreSQL on `localhost:5432`
- ChromaDB on `localhost:8000`

## Backend

```bash
cd backend
npm install
npm run dev
```

The API runs on `http://localhost:3001`.

## Frontend

```bash
cd frontend
npm install
npm run dev
```

The app runs on `http://localhost:5173` and proxies `/api` to the backend.

## Database Schema

To apply the SQL schema after Postgres is available:

```bash
cd backend
npm run db:migrate
```
```

```markdown
# Casos De Prueba

Agrega una carpeta por caso dentro de `casos-prueba/`.

## Estructura esperada

```text
casos-prueba/
  caso-001/
    documento-1.pdf
    documento-2.pdf
    metadata.json
```

## `metadata.json`

Cada carpeta debe incluir un `metadata.json` con esta estructura:

```json
{
  "radicado": "11001-31-03-001-2024-00001-00",
  "partes": "Demandante vs Demandado",
  "hechos_clave": [
    "Resumen del hecho 1",
    "Resumen del hecho 2"
  ],
  "preguntas_prueba": [
    "Cual es la pretension principal?",
    "Que pruebas documentales existen?"
  ]
}
```
```

- [ ] **Step 4: Verify the root configuration before moving on**

Run: `docker compose config`

Expected: Compose prints a normalized config that includes `postgres`, `chromadb`, `casepass-net`, and the `postgres-data` named volume.

## Task 2: Build The Backend Package And Database Contract

**Files:**
- Create: `backend/package.json`
- Create: `backend/.env.example`
- Create: `backend/src/db/index.js`
- Create: `backend/src/db/schema.sql`

- [ ] **Step 1: Create `backend/package.json` and `backend/.env.example`**

```json
{
  "name": "casepass-backend",
  "version": "1.0.0",
  "private": true,
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "db:migrate": "node -e \"require('./src/db').runMigrations()\""
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.54.0",
    "bcryptjs": "^2.4.3",
    "chromadb": "^1.8.1",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.21.2",
    "jsonwebtoken": "^9.0.2",
    "multer": "^1.4.5-lts.1",
    "openai": "^4.79.4",
    "pdf-parse": "^1.1.1",
    "pg": "^8.13.1",
    "puppeteer": "^24.8.2",
    "uuid": "^11.0.3"
  },
  "devDependencies": {
    "nodemon": "^3.1.7"
  }
}
```

```dotenv
PORT=3001
APP_URL=http://localhost:5173
DATABASE_URL=postgresql://casepass:casepass@localhost:5432/casepass
JWT_SECRET=change-me
CHROMA_URL=http://localhost:8000
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
UPLOAD_DIR=uploads
```

- [ ] **Step 2: Create `backend/src/db/index.js`**

```js
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://casepass:casepass@localhost:5432/casepass';

const pool = new Pool({ connectionString });

async function query(text, params = []) {
  return pool.query(text, params);
}

async function runMigrations() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(schema);
  console.log('Database schema applied successfully.');
  await pool.end();
}

module.exports = {
  pool,
  query,
  runMigrations,
};
```

- [ ] **Step 3: Create `backend/src/db/schema.sql` with the full table contract**

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  radicado TEXT NOT NULL,
  plaintiff TEXT,
  defendant TEXT,
  last_action TEXT,
  next_action TEXT,
  apoderado_notes TEXT,
  created_by UUID REFERENCES users(id),
  share_token UUID UNIQUE DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'indexed', 'error')) DEFAULT 'pending',
  chunks_count INTEGER NOT NULL DEFAULT 0,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS case_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  due_date TIMESTAMPTZ,
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shared_links (
  token UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

- [ ] **Step 4: Verify the backend database module parses cleanly**

Run: `node -e "const db = require('./src/db'); if (!db.pool || !db.query || !db.runMigrations) process.exit(1); console.log('db ok');"`

Workdir: `backend`

Expected: `db ok`

## Task 3: Add Backend Middleware And Service Boundaries

**Files:**
- Create: `backend/src/middleware/auth.js`
- Create: `backend/src/middleware/roles.js`
- Create: `backend/src/services/ragService.js`
- Create: `backend/src/services/claudeService.js`
- Create: `backend/src/services/pdfService.js`

- [ ] **Step 1: Create `backend/src/middleware/auth.js` and `backend/src/middleware/roles.js`**

```js
const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: 'Authentication token is required.' });
    }

    const secret = process.env.JWT_SECRET || 'change-me';
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
}

module.exports = {
  authenticateToken,
};
```

```js
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access is required.' });
  }

  return next();
}

function requireUser(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authenticated user is required.' });
  }

  return next();
}

module.exports = {
  requireAdmin,
  requireUser,
};
```

- [ ] **Step 2: Create `backend/src/services/ragService.js` with a real `chunkText` implementation and stubbed Chroma hooks**

```js
/**
 * Split text into sentence-aware chunks without breaking words when possible.
 * @param {string} text
 * @param {number} chunkSize
 * @param {number} overlap
 * @returns {string[]}
 */
function chunkText(text, chunkSize = 500, overlap = 50) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();

  if (!normalized) {
    return [];
  }

  const sentences = normalized.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [normalized];
  const chunks = [];
  let current = '';

  for (const sentence of sentences) {
    const candidate = current ? `${current} ${sentence.trim()}` : sentence.trim();

    if (candidate.length <= chunkSize) {
      current = candidate;
      continue;
    }

    if (current) {
      chunks.push(current.trim());
      const overlapSlice = current.slice(Math.max(0, current.length - overlap)).trim();
      current = overlapSlice ? `${overlapSlice} ${sentence.trim()}`.trim() : sentence.trim();
      continue;
    }

    const words = sentence.trim().split(/\s+/);
    let wordChunk = '';

    for (const word of words) {
      const wordCandidate = wordChunk ? `${wordChunk} ${word}` : word;
      if (wordCandidate.length <= chunkSize) {
        wordChunk = wordCandidate;
      } else {
        chunks.push(wordChunk.trim());
        const overlapSlice = wordChunk.slice(Math.max(0, wordChunk.length - overlap)).trim();
        wordChunk = overlapSlice ? `${overlapSlice} ${word}`.trim() : word;
      }
    }

    current = wordChunk;
  }

  if (current) {
    chunks.push(current.trim());
  }

  return chunks;
}

/**
 * Persist document chunks into ChromaDB.
 * @param {string} docId
 * @param {string} text
 * @param {string} caseId
 * @param {string} docName
 * @returns {Promise<{ indexed: boolean, chunks_count: number }>} 
 */
async function indexDocument(docId, text, caseId, docName) {
  const chunks = chunkText(text);

  // TODO: Create or reuse a ChromaDB collection and persist each chunk with metadata.
  // TODO: Store `doc_name`, `page`, `chunk_index`, and `case_id` so search can filter by case.

  return {
    indexed: false,
    chunks_count: chunks.length,
  };
}

/**
 * Search indexed chunks for a case.
 * @param {string} query
 * @param {string} caseId
 * @param {number} topK
 * @returns {Promise<Array<{ text: string, doc_name: string, page: number, chunk_index: number, score: number }>>}
 */
async function searchChunks(query, caseId, topK = 5) {
  // TODO: Query ChromaDB with embeddings and filter by `case_id`.
  // TODO: Return ranked chunks including `text`, `doc_name`, `page`, `chunk_index`, and `score`.
  return [
    {
      text: `No indexed chunks are available yet for case ${caseId}.`,
      doc_name: 'placeholder.txt',
      page: 1,
      chunk_index: 0,
      score: 0,
    },
  ].slice(0, topK && topK > 0 ? topK : 1);
}

module.exports = {
  chunkText,
  indexDocument,
  searchChunks,
};
```

- [ ] **Step 3: Create `backend/src/services/claudeService.js` and `backend/src/services/pdfService.js`**

```js
/**
 * Build a Claude prompt with numbered context blocks and return a placeholder answer.
 * @param {string} question
 * @param {Array<{ text: string, doc_name: string, page: number, chunk_index: number, score: number }>} chunks
 * @returns {Promise<{ answer: string, sources: Array<{ doc_name: string, page: number, chunk_text: string, score: number }> }>}
 */
async function chatWithSources(question, chunks) {
  const numberedContext = chunks
    .map((chunk, index) => `[${index + 1}] ${chunk.doc_name} page ${chunk.page}\n${chunk.text}`)
    .join('\n\n');

  const prompt = [
    'You are a legal case assistant.',
    'Answer the user using the context blocks below.',
    'Cite supporting blocks as [1], [2], and so on.',
    '',
    `Question: ${question}`,
    '',
    'Context:',
    numberedContext,
  ].join('\n');

  void prompt;

  // TODO: Call Claude model `claude-sonnet-4-20250514` with the numbered prompt above.
  // TODO: Parse citations from the model response and map them back to the source objects.

  return {
    answer: chunks.length
      ? `This is a placeholder answer for: ${question} [1]`
      : `This is a placeholder answer for: ${question}`,
    sources: chunks.map((chunk) => ({
      doc_name: chunk.doc_name,
      page: chunk.page,
      chunk_text: chunk.text,
      score: chunk.score,
    })),
  };
}

/**
 * Generate a markdown summary for a case.
 * @param {object} caseData
 * @returns {Promise<string>}
 */
async function generateCaseSummary(caseData) {
  // TODO: Replace this scaffold summary with a Claude-generated case summary.
  return `# Resumen del Caso\n\n- Nombre: ${caseData.name || 'Sin nombre'}\n- Radicado: ${caseData.radicado || 'Sin radicado'}\n- Ultima actuacion: ${caseData.last_action || 'Sin informacion'}\n- Proxima actuacion: ${caseData.next_action || 'Sin informacion'}`;
}

module.exports = {
  chatWithSources,
  generateCaseSummary,
};
```

```js
const puppeteer = require('puppeteer');

/**
 * Generate a PDF buffer for a case summary.
 * @param {string} summaryMarkdown
 * @param {object} caseData
 * @returns {Promise<Buffer>}
 */
async function generateSummaryPDF(summaryMarkdown, caseData) {
  const browser = await puppeteer.launch({ headless: 'new' });

  try {
    const page = await browser.newPage();
    const title = caseData?.name || 'Resumen del caso';
    const safeMarkdown = String(summaryMarkdown || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // TODO: Replace this simple HTML wrapper with a styled legal-report template.
    await page.setContent(`
      <html>
        <body style="font-family: Arial, sans-serif; padding: 32px; color: #0f172a;">
          <h1>${title}</h1>
          <pre style="white-space: pre-wrap; font-size: 14px; line-height: 1.6;">${safeMarkdown}</pre>
        </body>
      </html>
    `);

    return await page.pdf({ format: 'A4', printBackground: true });
  } finally {
    await browser.close();
  }
}

module.exports = {
  generateSummaryPDF,
};
```

- [ ] **Step 4: Verify backend support modules parse without syntax errors**

Run: `node --check src/middleware/auth.js && node --check src/middleware/roles.js && node --check src/services/ragService.js && node --check src/services/claudeService.js && node --check src/services/pdfService.js`

Workdir: `backend`

Expected: no output and exit code `0`

## Task 4: Implement Backend Routes And Express Bootstrap

**Files:**
- Create: `backend/src/routes/auth.js`
- Create: `backend/src/routes/cases.js`
- Create: `backend/src/routes/documents.js`
- Create: `backend/src/routes/chat.js`
- Create: `backend/src/routes/summary.js`
- Create: `backend/src/routes/share.js`
- Create: `backend/src/routes/users.js`
- Create: `backend/src/index.js`

- [ ] **Step 1: Create `auth.js`, `cases.js`, and `documents.js`**

```js
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roles');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const secret = process.env.JWT_SECRET || 'change-me';
    const user = {
      id: uuidv4(),
      name: 'Demo Admin',
      email,
      role: 'admin',
      active: true,
    };

    const token = jwt.sign(user, secret, { expiresIn: '8h' });
    return res.json({ token, user });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to complete login.' });
  }
});

router.post('/register', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, email, password, role = 'user' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    return res.status(201).json({
      id: uuidv4(),
      name,
      email,
      role,
      active: true,
      password_hash,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to register user.' });
  }
});

module.exports = router;
```

```js
const express = require('express');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

function buildPlaceholderCase(overrides = {}) {
  return {
    id: overrides.id || uuidv4(),
    name: 'Proceso Ordinario Laboral',
    radicado: '11001-31-03-001-2024-00001-00',
    plaintiff: 'Demandante de ejemplo',
    defendant: 'Demandado de ejemplo',
    last_action: 'Recepcion de documentos',
    next_action: 'Preparar resumen del expediente',
    apoderado_notes: 'Caso de ejemplo para el esqueleto inicial.',
    created_by: 'demo-admin',
    share_token: uuidv4(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

router.get('/', async (req, res) => {
  try {
    return res.json([buildPlaceholderCase()]);
  } catch (error) {
    return res.status(500).json({ error: 'Unable to fetch cases.' });
  }
});

router.post('/', async (req, res) => {
  try {
    return res.status(201).json(buildPlaceholderCase(req.body));
  } catch (error) {
    return res.status(500).json({ error: 'Unable to create case.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    return res.json(buildPlaceholderCase({ id: req.params.id }));
  } catch (error) {
    return res.status(500).json({ error: 'Unable to fetch case.' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    return res.json(buildPlaceholderCase({ id: req.params.id, ...req.body, updated_at: new Date().toISOString() }));
  } catch (error) {
    return res.status(500).json({ error: 'Unable to update case.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    return res.json({ success: true, id: req.params.id });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to delete case.' });
  }
});

module.exports = router;
```

```js
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

router.get('/cases/:id/documents', async (req, res) => {
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
```

- [ ] **Step 2: Create `chat.js`, `summary.js`, `share.js`, and `users.js`**

```js
const express = require('express');
const { searchChunks } = require('../services/ragService');
const { chatWithSources } = require('../services/claudeService');

const router = express.Router();

router.post('/cases/:id/chat', async (req, res) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'A question is required.' });
    }

    const chunks = await searchChunks(question, req.params.id, 5);
    const response = await chatWithSources(question, chunks);
    return res.json(response);
  } catch (error) {
    return res.status(500).json({ error: 'Unable to process chat request.' });
  }
});

module.exports = router;
```

```js
const express = require('express');
const { generateCaseSummary } = require('../services/claudeService');
const { generateSummaryPDF } = require('../services/pdfService');

const router = express.Router();

router.post('/cases/:id/summary', async (req, res) => {
  try {
    const caseData = {
      id: req.params.id,
      name: 'Proceso Ordinario Laboral',
      radicado: '11001-31-03-001-2024-00001-00',
      last_action: 'Recepcion de documentos',
      next_action: 'Preparar resumen del expediente',
    };

    const summaryMarkdown = await generateCaseSummary(caseData);
    const pdfBuffer = await generateSummaryPDF(summaryMarkdown, caseData);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="case-${req.params.id}-summary.pdf"`);
    return res.send(pdfBuffer);
  } catch (error) {
    return res.status(500).json({ error: 'Unable to generate summary PDF.' });
  }
});

module.exports = router;
```

```js
const express = require('express');
const { v4: uuidv4 } = require('uuid');

const publicSharedRouter = express.Router();
const privateShareRouter = express.Router();

privateShareRouter.post('/cases/:id/share', async (req, res) => {
  try {
    const token = uuidv4();
    const appUrl = process.env.APP_URL || 'http://localhost:5173';

    return res.json({
      token,
      url: `${appUrl}/shared/${token}`,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to create share link.' });
  }
});

publicSharedRouter.get('/shared/:token', async (req, res) => {
  try {
    return res.json({
      id: req.params.token,
      name: 'Caso Compartido',
      radicado: '11001-31-03-001-2024-00001-00',
      plaintiff: 'Demandante de ejemplo',
      defendant: 'Demandado de ejemplo',
      last_action: 'Recepcion de documentos',
      next_action: 'Preparar resumen del expediente',
      apoderado_notes: 'Vista compartida de solo lectura.',
      documents: [],
    });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to fetch shared case.' });
  }
});

module.exports = {
  publicSharedRouter,
  privateShareRouter,
};
```

```js
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { requireAdmin } = require('../middleware/roles');

const router = express.Router();

router.use(requireAdmin);

router.get('/', async (_req, res) => {
  try {
    return res.json([
      {
        id: 'demo-admin',
        name: 'Demo Admin',
        email: 'admin@casepass.local',
        role: 'admin',
        active: true,
        created_at: new Date().toISOString(),
      },
    ]);
  } catch (error) {
    return res.status(500).json({ error: 'Unable to fetch users.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, email, role = 'user' } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required.' });
    }

    return res.status(201).json({
      id: uuidv4(),
      name,
      email,
      role,
      active: true,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to create user.' });
  }
});

router.put('/:id/active', async (req, res) => {
  try {
    const { active } = req.body;
    return res.json({ id: req.params.id, active: Boolean(active) });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to update user status.' });
  }
});

module.exports = router;
```

- [ ] **Step 3: Create `backend/src/index.js` and ensure auth is only bypassed for login and shared-case read**

```js
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { authenticateToken } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const caseRoutes = require('./routes/cases');
const documentRoutes = require('./routes/documents');
const chatRoutes = require('./routes/chat');
const summaryRoutes = require('./routes/summary');
const { publicSharedRouter, privateShareRouter } = require('./routes/share');
const userRoutes = require('./routes/users');

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3001);
const uploadDir = path.resolve(__dirname, '../uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.use(cors({ origin: process.env.APP_URL || 'http://localhost:5173' }));
app.use(express.json());
app.use('/uploads', express.static(uploadDir));

app.use('/api/auth', authRoutes);
app.use('/api', publicSharedRouter);
app.use('/api', authenticateToken);
app.use('/api/cases', caseRoutes);
app.use('/api', documentRoutes);
app.use('/api', chatRoutes);
app.use('/api', summaryRoutes);
app.use('/api', privateShareRouter);
app.use('/api/users', userRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error.' });
});

function startServer() {
  return app.listen(port, () => {
    console.log(`CasePass backend listening on http://localhost:${port}`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = {
  app,
  startServer,
};
```

- [ ] **Step 4: Install backend packages and verify the server bootstrap**

Run: `npm install`

Workdir: `backend`

Expected: npm installs dependencies successfully.

Run: `node -e "const { app, startServer } = require('./src/index'); if (!app || !startServer) process.exit(1); console.log('app ok');"`

Workdir: `backend`

Expected: `app ok`

## Task 5: Create Frontend Tooling And App Shell

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.js`
- Create: `frontend/tailwind.config.js`
- Create: `frontend/postcss.config.js`
- Create: `frontend/index.html`
- Create: `frontend/src/index.css`
- Create: `frontend/src/main.jsx`

- [ ] **Step 1: Create `frontend/package.json`**

```json
{
  "name": "casepass-frontend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@tanstack/react-query": "^5.59.19",
    "axios": "^1.7.7",
    "lucide-react": "^0.456.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.28.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.3",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.14",
    "vite": "^5.4.10"
  }
}
```

- [ ] **Step 2: Create Vite, Tailwind, PostCSS, and HTML entry files**

```js
const { defineConfig } = require('vite');
const react = require('@vitejs/plugin-react');

module.exports = defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
```

```js
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CasePass</title>
  </head>
  <body class="bg-slate-950 text-slate-100">
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Create `frontend/src/index.css` and `frontend/src/main.jsx`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
  background: #020617;
  color: #e2e8f0;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
}

a {
  color: inherit;
  text-decoration: none;
}

button,
input,
textarea,
select {
  font: inherit;
}
```

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import router from './router';
import './index.css';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>,
);
```

- [ ] **Step 4: Verify frontend tooling files parse before building components**

Run: `npm install`

Workdir: `frontend`

Expected: npm installs dependencies successfully.

Run: `npm run build`

Workdir: `frontend`

Expected: build fails because `src/router.jsx` does not exist yet. This is the expected checkpoint before the routing task.

## Task 6: Add Frontend API, Auth Hook, And Shared Components

**Files:**
- Create: `frontend/src/lib/api.js`
- Create: `frontend/src/hooks/useAuth.js`
- Create: `frontend/src/hooks/useCases.js`
- Create: `frontend/src/components/CaseCard.jsx`
- Create: `frontend/src/components/ChatWidget.jsx`
- Create: `frontend/src/components/SourceCitation.jsx`
- Create: `frontend/src/components/DocumentUpload.jsx`
- Create: `frontend/src/components/CaseForm.jsx`
- Create: `frontend/src/components/PDFSummaryButton.jsx`

- [ ] **Step 1: Create `frontend/src/lib/api.js`, `frontend/src/hooks/useAuth.js`, and `frontend/src/hooks/useCases.js`**

```js
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = window.localStorage.getItem('casepass-token');

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;
```

```js
import { useEffect, useState } from 'react';
import api from '../lib/api';

const AUTH_EVENT = 'casepass-auth-change';

function readAuthState() {
  const token = window.localStorage.getItem('casepass-token');
  const rawUser = window.localStorage.getItem('casepass-user');
  return {
    token,
    user: rawUser ? JSON.parse(rawUser) : null,
  };
}

function writeAuthState(token, user) {
  window.localStorage.setItem('casepass-token', token);
  window.localStorage.setItem('casepass-user', JSON.stringify(user));
  window.dispatchEvent(new Event(AUTH_EVENT));
}

function clearAuthState() {
  window.localStorage.removeItem('casepass-token');
  window.localStorage.removeItem('casepass-user');
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function useAuth() {
  const [auth, setAuth] = useState(() => readAuthState());

  useEffect(() => {
    const sync = () => setAuth(readAuthState());
    window.addEventListener('storage', sync);
    window.addEventListener(AUTH_EVENT, sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(AUTH_EVENT, sync);
    };
  }, []);

  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    writeAuthState(data.token, data.user);
    return data;
  }

  function logout() {
    clearAuthState();
  }

  return {
    token: auth.token,
    user: auth.user,
    isAuthenticated: Boolean(auth.token),
    login,
    logout,
  };
}
```

```js
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export function useCases() {
  return useQuery({
    queryKey: ['cases'],
    queryFn: async () => {
      const { data } = await api.get('/cases');
      return data;
    },
  });
}

export function useCase(caseId) {
  return useQuery({
    queryKey: ['case', caseId],
    queryFn: async () => {
      const { data } = await api.get(`/cases/${caseId}`);
      return data;
    },
    enabled: Boolean(caseId),
  });
}

export function useCreateCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/cases', payload);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cases'] }),
  });
}

export function useUpdateCase(caseId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.put(`/cases/${caseId}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      queryClient.invalidateQueries({ queryKey: ['case', caseId] });
    },
  });
}

export function useDeleteCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (caseId) => {
      const { data } = await api.delete(`/cases/${caseId}`);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cases'] }),
  });
}
```

- [ ] **Step 2: Create `CaseCard.jsx`, `SourceCitation.jsx`, and `ChatWidget.jsx`**

```jsx
import { Link } from 'react-router-dom';
import { Share2 } from 'lucide-react';
import api from '../lib/api';

export default function CaseCard({ caseItem }) {
  async function handleShare() {
    const { data } = await api.post(`/cases/${caseItem.id}/share`);
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(data.url);
    }
    window.alert(`Enlace compartido: ${data.url}`);
  }

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg shadow-slate-950/30">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{caseItem.name}</h3>
          <p className="mt-1 text-sm text-slate-400">Radicado: {caseItem.radicado}</p>
        </div>
        <button
          type="button"
          onClick={handleShare}
          className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-3 py-2 text-sm text-slate-200"
        >
          <Share2 size={16} />
          Compartir
        </button>
      </div>
      <p className="mt-4 text-sm text-slate-300">Ultima actuacion: {caseItem.last_action || 'Sin datos'}</p>
      <Link to={`/cases/${caseItem.id}`} className="mt-5 inline-block text-sm font-medium text-cyan-300">
        Abrir expediente
      </Link>
    </article>
  );
}
```

```jsx
import { useState } from 'react';

export default function SourceCitation({ source }) {
  const [expanded, setExpanded] = useState(false);
  const preview = source.chunk_text.length > 140 ? `${source.chunk_text.slice(0, 140)}...` : source.chunk_text;

  return (
    <button
      type="button"
      onClick={() => setExpanded((value) => !value)}
      className="w-full rounded-xl border border-slate-700 bg-slate-900/60 p-3 text-left"
    >
      <div className="flex items-center justify-between gap-3 text-xs text-slate-300">
        <span>{source.doc_name}</span>
        <span className="rounded-full bg-cyan-500/15 px-2 py-1 text-cyan-200">Pg. {source.page} · {source.score}</span>
      </div>
      <p className="mt-2 text-sm text-slate-200">{expanded ? source.chunk_text : preview}</p>
    </button>
  );
}
```

```jsx
import { useState } from 'react';
import api from '../lib/api';
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
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: error.response?.data?.error || 'No fue posible responder la pregunta.',
          sources: [],
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="space-y-4">
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className="space-y-3 rounded-xl bg-slate-900/70 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{message.role}</p>
            <p className="text-sm text-slate-100">{message.content}</p>
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
          className="min-h-28 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100"
        />
        <button
          type="submit"
          disabled={disabled || isLoading}
          className="rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? 'Consultando...' : 'Enviar pregunta'}
        </button>
      </form>
    </section>
  );
}
```

- [ ] **Step 3: Create `DocumentUpload.jsx`, `CaseForm.jsx`, and `PDFSummaryButton.jsx`**

```jsx
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
    } catch (error) {
      setStatus(error.response?.data?.error || 'No fue posible cargar el archivo.');
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
      className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-6"
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
      <p className="mt-2 text-sm text-slate-400">Arrastra un PDF o usa el selector para simular la carga y el estado de indexacion.</p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="mt-4 rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-950"
      >
        Seleccionar PDF
      </button>
      <div className="mt-4 h-2 rounded-full bg-slate-800">
        <div className="h-2 rounded-full bg-cyan-400" style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-3 text-sm text-slate-300">{status}</p>
    </section>
  );
}
```

```jsx
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
    <form onSubmit={handleSubmit} className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 md:grid-cols-2">
      {Object.entries(form).map(([key, value]) => (
        <label key={key} className={`text-sm text-slate-300 ${key === 'apoderado_notes' ? 'md:col-span-2' : ''}`}>
          <span className="mb-2 block capitalize">{key.replaceAll('_', ' ')}</span>
          {key === 'apoderado_notes' ? (
            <textarea
              value={value}
              onChange={(event) => updateField(key, event.target.value)}
              className="min-h-28 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            />
          ) : (
            <input
              value={value}
              onChange={(event) => updateField(key, event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
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
```

```jsx
import api from '../lib/api';

export default function PDFSummaryButton({ caseId }) {
  async function handleDownload() {
    const { data } = await api.post(`/cases/${caseId}/summary`, {}, { responseType: 'blob' });
    const url = window.URL.createObjectURL(data);
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
      className="rounded-full border border-cyan-400 px-4 py-2 text-sm font-semibold text-cyan-300"
    >
      Descargar resumen PDF
    </button>
  );
}
```

- [ ] **Step 4: Verify shared frontend modules parse with Vite**

Run: `npm run build`

Workdir: `frontend`

Expected: build still fails because `src/router.jsx` and page files do not exist yet. Import parsing for `main.jsx`, hooks, and components should succeed.

## Task 7: Add Frontend Pages And Router

**Files:**
- Create: `frontend/src/router.jsx`
- Create: `frontend/src/pages/Login.jsx`
- Create: `frontend/src/pages/Dashboard.jsx`
- Create: `frontend/src/pages/CaseView.jsx`
- Create: `frontend/src/pages/SharedCase.jsx`
- Create: `frontend/src/pages/Admin.jsx`

- [ ] **Step 1: Create `frontend/src/pages/Login.jsx` and `frontend/src/pages/Dashboard.jsx`**

```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
    <main className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl shadow-slate-950/40">
        <p className="text-sm uppercase tracking-[0.4em] text-cyan-300">CasePass</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">Ingreso al expediente digital</h1>
        <p className="mt-3 text-sm text-slate-400">Usa cualquier correo y clave para probar el flujo inicial.</p>
        <label className="mt-6 block text-sm text-slate-300">
          <span className="mb-2 block">Correo</span>
          <input value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100" />
        </label>
        <label className="mt-4 block text-sm text-slate-300">
          <span className="mb-2 block">Clave</span>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100" />
        </label>
        {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
        <button type="submit" className="mt-6 w-full rounded-full bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950">
          Ingresar
        </button>
      </form>
    </main>
  );
}
```

```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CaseCard from '../components/CaseCard';
import CaseForm from '../components/CaseForm';
import { useAuth } from '../hooks/useAuth';
import { useCases, useCreateCase } from '../hooks/useCases';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const casesQuery = useCases();
  const createCase = useCreateCase();

  async function handleCreateCase(payload) {
    const created = await createCase.mutateAsync(payload);
    setShowForm(false);
    navigate(`/cases/${created.id}`);
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <header className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/70 p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.4em] text-cyan-300">Panel principal</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Expedientes activos</h1>
          <p className="mt-2 text-sm text-slate-400">Usuario actual: {user?.email || 'sin sesion'}</p>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={() => setShowForm((value) => !value)} className="rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950">
            {showForm ? 'Cerrar formulario' : 'Crear caso'}
          </button>
          <button type="button" onClick={logout} className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200">
            Salir
          </button>
        </div>
      </header>

      {showForm ? <div className="mt-6"><CaseForm onSubmit={handleCreateCase} submitLabel="Crear caso" /></div> : null}

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {casesQuery.data?.length ? (
          casesQuery.data.map((caseItem) => <CaseCard key={caseItem.id} caseItem={caseItem} />)
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-400">
            No hay casos cargados todavia. Usa "Crear caso" para probar el formulario.
          </div>
        )}
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Create `CaseView.jsx`, `SharedCase.jsx`, and `Admin.jsx`**

```jsx
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import ChatWidget from '../components/ChatWidget';
import DocumentUpload from '../components/DocumentUpload';
import PDFSummaryButton from '../components/PDFSummaryButton';
import CaseForm from '../components/CaseForm';
import { useCase, useUpdateCase } from '../hooks/useCases';

const tabs = ['Documents', 'Chat', 'Updates', 'Alerts', 'Checklist'];

export default function CaseView() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('Documents');
  const caseQuery = useCase(id);
  const updateCase = useUpdateCase(id);
  const caseData = caseQuery.data;

  const panel = useMemo(() => {
    if (!caseData) {
      return <p className="text-sm text-slate-400">Cargando caso...</p>;
    }

    if (activeTab === 'Documents') {
      return <DocumentUpload caseId={id} />;
    }

    if (activeTab === 'Chat') {
      return <ChatWidget caseId={id} />;
    }

    if (activeTab === 'Updates') {
      return <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-300">No hay actualizaciones registradas todavia.</div>;
    }

    if (activeTab === 'Alerts') {
      return <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-300">No hay alertas pendientes.</div>;
    }

    return <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-300">No hay checklist registrado.</div>;
  }, [activeTab, caseData, id]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <header className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/70 p-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.4em] text-cyan-300">Detalle del caso</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">{caseData?.name || 'Cargando expediente...'}</h1>
          <p className="mt-2 text-sm text-slate-400">Radicado: {caseData?.radicado || 'Sin radicado'}</p>
        </div>
        <PDFSummaryButton caseId={id} />
      </header>

      {caseData ? (
        <div className="mt-6">
          <CaseForm initialValues={caseData} onSubmit={(payload) => updateCase.mutateAsync(payload)} submitLabel="Actualizar caso" />
        </div>
      ) : null}

      <nav className="mt-8 flex flex-wrap gap-3">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-full px-4 py-2 text-sm ${activeTab === tab ? 'bg-cyan-400 font-semibold text-slate-950' : 'border border-slate-700 text-slate-200'}`}
          >
            {tab}
          </button>
        ))}
      </nav>

      <section className="mt-6">{panel}</section>
    </main>
  );
}
```

```jsx
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import ChatWidget from '../components/ChatWidget';
import api from '../lib/api';

export default function SharedCase() {
  const { token } = useParams();
  const sharedCaseQuery = useQuery({
    queryKey: ['shared-case', token],
    queryFn: async () => {
      const { data } = await api.get(`/shared/${token}`);
      return data;
    },
  });

  const caseData = sharedCaseQuery.data;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <p className="text-sm uppercase tracking-[0.4em] text-cyan-300">Enlace compartido</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">{caseData?.name || 'Cargando caso compartido...'}</h1>
        <p className="mt-3 text-sm text-slate-400">Radicado: {caseData?.radicado || 'Sin radicado'}</p>
        <p className="mt-3 text-sm text-slate-300">{caseData?.apoderado_notes || 'Sin notas disponibles.'}</p>
      </section>

      <div className="mt-8">
        <ChatWidget
          caseId={caseData?.id}
          disabled
          disabledReason="El chat autenticado no esta habilitado en la vista compartida del esqueleto inicial."
        />
      </div>
    </main>
  );
}
```

```jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export default function Admin() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: '', email: '', role: 'user' });

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await api.get('/users');
      return data;
    },
  });

  const createUser = useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/users', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setForm({ name: '', email: '', role: 'user' });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }) => {
      const { data } = await api.put(`/users/${id}/active`, { active });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <header className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <p className="text-sm uppercase tracking-[0.4em] text-cyan-300">Administracion</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Usuarios del sistema</h1>
      </header>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          createUser.mutate(form);
        }}
        className="mt-6 grid gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 md:grid-cols-4"
      >
        <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Nombre" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100" />
        <input value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="Correo" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100" />
        <select value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100">
          <option value="user">user</option>
          <option value="admin">admin</option>
        </select>
        <button type="submit" className="rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950">Crear usuario</button>
      </form>

      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        <table className="min-w-full divide-y divide-slate-800 text-sm">
          <thead className="bg-slate-950/50 text-left text-slate-400">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Correo</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Activo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-slate-200">
            {usersQuery.data?.map((user) => (
              <tr key={user.id}>
                <td className="px-4 py-3">{user.name}</td>
                <td className="px-4 py-3">{user.email}</td>
                <td className="px-4 py-3">{user.role}</td>
                <td className="px-4 py-3">
                  <button type="button" onClick={() => toggleActive.mutate({ id: user.id, active: !user.active })} className="rounded-full border border-slate-700 px-3 py-1 text-xs">
                    {user.active ? 'Desactivar' : 'Activar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
```

- [ ] **Step 3: Create `frontend/src/router.jsx` and wire all routes**

```jsx
import { Navigate, createBrowserRouter } from 'react-router-dom';
import Admin from './pages/Admin';
import CaseView from './pages/CaseView';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import SharedCase from './pages/SharedCase';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Login />,
  },
  {
    path: '/dashboard',
    element: <Dashboard />,
  },
  {
    path: '/cases/:id',
    element: <CaseView />,
  },
  {
    path: '/shared/:token',
    element: <SharedCase />,
  },
  {
    path: '/admin',
    element: <Admin />,
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

export default router;
```

- [ ] **Step 4: Verify the full frontend build**

Run: `npm run build`

Workdir: `frontend`

Expected: Vite completes successfully and writes the production build into `dist/`.

## Task 8: Run End-To-End Smoke Checks

**Files:**
- No new files

- [ ] **Step 1: Start Docker infrastructure**

Run: `docker compose up -d`

Workdir: repository root

Expected: `postgres` and `chromadb` containers start successfully.

- [ ] **Step 2: Start the backend development server**

Run: `npm run dev`

Workdir: `backend`

Expected: console logs `CasePass backend listening on http://localhost:3001`.

- [ ] **Step 3: Start the frontend development server**

Run: `npm run dev`

Workdir: `frontend`

Expected: Vite prints a local URL, typically `http://localhost:5173`.

- [ ] **Step 4: Smoke-check the public and authenticated routes**

Run: `curl http://localhost:3001/api/shared/test-token`

Expected: JSON payload for a read-only shared case.

Run: `curl -X POST http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@casepass.local","password":"casepass"}'`

Expected: JSON payload with `token` and `user`.

Run: `curl http://localhost:3001/api/cases -H "Authorization: Bearer <paste-token-from-login>"`

Expected: JSON array containing at least one placeholder case object.

## Self-Review Checklist

- Spec coverage: root scaffold, Docker config, backend files, frontend files, sample-case docs, auth rules, service stubs, and frontend route structure are all represented by explicit tasks.
- Placeholder scan: the plan does not leave any execution step unspecified. The only `TODO` strings appear inside service-file code comments because the target implementation requires visible service stubs.
- Type consistency: route names, file paths, case field names, and exported function names match the approved design document.
