# CasePass Skeleton Design

## Overview

CasePass will start as a greenfield monorepo scaffold at the current repository root. The goal of this phase is a bootable skeleton for a legal case management platform with a future RAG-powered chatbot. The scaffold must satisfy the requested file structure, boot cleanly in local development, and make all major integration points explicit without over-implementing unfinished business logic.

This design targets a level 1 scaffold:

- `docker-compose up` starts infrastructure successfully.
- `npm install && npm run dev` works in both `backend/` and `frontend/`.
- Routes, pages, hooks, and services exist with stable interfaces.
- AI, indexing, and PDF generation internals remain stubbed behind named service exports with `// TODO` guidance.

## Goals

- Match the requested monorepo structure at the repository root.
- Provide a backend Express app with all requested route files, middleware, database schema, and named services.
- Provide a frontend React app with all requested routes, hooks, pages, and components.
- Keep the scaffold safe to run even before full database setup or external API configuration.
- Make future implementation work obvious by keeping stubs narrow, documented, and easy to replace.

## Non-Goals

- Full production authentication and authorization behavior.
- Complete PostgreSQL CRUD logic for every entity.
- Real vector indexing, semantic search, Claude integration, or PDF layout generation.
- Production-ready UI polish beyond a coherent, usable scaffold.
- Seed data, background jobs, or deployment configuration beyond local Docker and Vite/Express development.

## Repository Layout

The repository root will contain:

- `README.md`
- `.env.example`
- `.gitignore`
- `docker-compose.yml`
- `frontend/`
- `backend/`
- `casos-prueba/`

`frontend/` and `backend/` remain independent Node applications to keep local development simple. Shared code is intentionally omitted at this stage because the scaffold does not yet justify a third package or workspace tooling.

## Infrastructure Design

`docker-compose.yml` will define two services on a shared `casepass-net` network:

- `postgres:15`
- `chromadb/chroma:latest`

Postgres will expose port `5432`, use database `casepass`, user `casepass`, password `casepass`, and persist through a named volume. ChromaDB will expose port `8000` with no extra application-specific customization in this phase.

The root `.env.example` will document the intended local environment variables used by both apps without trying to centralize runtime loading between them.

## Backend Architecture

### Application Boundary

`backend/src/index.js` will own application bootstrapping only:

- load environment variables
- create the Express app
- register CORS and JSON middleware
- register upload/static helpers as needed
- apply auth protection to all routes except `POST /api/auth/login` and `GET /api/shared/:token`
- mount route modules under `/api`
- start the HTTP server

This keeps startup code separate from route behavior and avoids hiding feature logic inside the entry file.

### Database Layer

`backend/src/db/index.js` will export a single configured `pg` pool and a small query helper. This is sufficient for a scaffold and avoids introducing a custom repository layer before the real persistence behavior exists.

`backend/src/db/schema.sql` will define the requested tables:

- `users`
- `cases`
- `documents`
- `case_updates`
- `alerts`
- `checklist_items`
- `shared_links`

UUID primary keys will be used where requested, timestamps will default sensibly, and foreign key relationships will be explicit. The schema exists now even where route handlers still use placeholder logic, so the data contract is established from day one.

### Middleware

`middleware/auth.js` will verify JWTs and attach `req.user`.

`middleware/roles.js` will export:

- `requireAdmin`
- `requireUser`

For the scaffold, both middleware files will be functional and consistent, but they will favor predictable local behavior over exhaustive security hardening. Missing or invalid tokens will produce JSON errors in the required shape.

### Route Modules

Each route file will export an Express router and every handler will:

- use `try/catch`
- return JSON success payloads or `{ error: string }`
- keep HTTP concerns local
- delegate AI- or PDF-related work to service files

Requested route coverage:

- `routes/auth.js`
  - `POST /api/auth/login`
  - `POST /api/auth/register` as admin-only
- `routes/cases.js`
  - `GET /api/cases`
  - `POST /api/cases`
  - `GET /api/cases/:id`
  - `PUT /api/cases/:id`
  - `DELETE /api/cases/:id`
- `routes/documents.js`
  - `POST /api/cases/:id/documents`
  - `GET /api/cases/:id/documents`
  - `DELETE /api/documents/:id`
- `routes/chat.js`
  - `POST /api/cases/:id/chat`
- `routes/summary.js`
  - `POST /api/cases/:id/summary`
- `routes/share.js`
  - `POST /api/cases/:id/share`
  - `GET /api/shared/:token`
- `routes/users.js`
  - `GET /api/users`
  - `POST /api/users`
  - `PUT /api/users/:id/active`

Because this is a bootable scaffold, handlers may return placeholder data where real persistence or external service calls are intentionally deferred. The important constraint is stable shape and no startup/runtime crashes under normal navigation.

### Service Modules

Service files are explicit integration seams, not empty placeholders.

`services/ragService.js` will export named functions:

- `indexDocument(docId, text, caseId, docName)`
- `chunkText(text, chunkSize = 500, overlap = 50)`
- `searchChunks(query, caseId, topK = 5)`

`chunkText` will implement the requested sentence-aware chunking rule in the scaffold itself, because this is a deterministic utility and not external integration logic. It will avoid splitting mid-word and prefer sentence boundaries.

`indexDocument` and `searchChunks` will contain JSDoc plus `// TODO` stubs describing the intended ChromaDB integration and metadata contract.

`services/claudeService.js` will export named functions:

- `chatWithSources(question, chunks)`
- `generateCaseSummary(caseData)`

`chatWithSources` will build the correct numbered-context prompt shape and describe the intended citation mapping behavior, but return scaffold-safe placeholder content until real API integration is added.

`services/pdfService.js` will export:

- `generateSummaryPDF(summaryMarkdown, caseData)`

It will include JSDoc and a TODO-guided Puppeteer stub that preserves the intended response interface.

## Backend Runtime Behavior

To preserve a reliable developer experience, the backend will be designed to boot even when:

- Postgres is not yet migrated
- ChromaDB is not reachable
- Claude or OpenAI API keys are missing

Where those dependencies are required for real results, handlers will fail gracefully with consistent JSON errors or placeholder responses appropriate to the selected scaffold level. This is preferable to a partial implementation that crashes on startup.

`uploads/` will exist for local file storage and will be gitignored. Multer will write files there using a deterministic local naming strategy.

## Frontend Architecture

### Application Boundary

The frontend will be a Vite React 18 app using:

- React Router v6 for page routing
- React Query for server-state hooks
- TailwindCSS for baseline styling
- Axios for API access

`src/main.jsx` will initialize React, create the query client, and render the router provider.

`src/router.jsx` will define the required routes:

- `/`
- `/dashboard`
- `/cases/:id`
- `/shared/:token`
- `/admin`

### API Client

`src/lib/api.js` will export one axios instance with:

- `baseURL: '/api'`
- a request interceptor that reads the stored token from `localStorage`
- automatic `Authorization: Bearer {token}` attachment when a token exists

This keeps authentication concerns centralized and avoids repetitive header code in components.

### Hooks

`useAuth.js` will manage:

- current user state from `localStorage`
- `login()`
- `logout()`
- token persistence

`useCases.js` will provide thin React Query wrappers around case endpoints. For the scaffold, the hook layer will handle empty, loading, and error states predictably without assuming the backend already has full data.

### Pages And Components

Each requested page/component will render a full skeleton, not an empty file.

Pages:

- `Login.jsx` renders an email/password form wired to `/api/auth/login`
- `Dashboard.jsx` renders a cases grid, create action, and empty state
- `CaseView.jsx` renders case details with tabs for Documents, Chat, Updates, Alerts, and Checklist
- `SharedCase.jsx` renders a read-only shared case view including `ChatWidget`
- `Admin.jsx` renders a user table and create-user form

Components:

- `CaseCard.jsx`
- `ChatWidget.jsx`
- `SourceCitation.jsx`
- `DocumentUpload.jsx`
- `CaseForm.jsx`
- `PDFSummaryButton.jsx`

The UI will be intentionally simple, coherent, and resilient. It must render safely without requiring real backend data to exist.

## Frontend Runtime Behavior

The frontend will prefer placeholder-safe states over speculative complexity:

- dashboards show empty states when no case data is present
- case detail tabs render structured placeholder content where API data is unavailable
- chat supports local message flow and renders assistant source citations beneath each assistant response
- PDF summary button triggers the correct blob download behavior when the endpoint responds
- admin screens render without assuming seeded users already exist

This keeps the app useful as a skeleton without implying that unfinished business logic is complete.

## API And Response Conventions

The backend will follow a few strict conventions:

- JSON failures always return `{ error: string }`
- authenticated routes require JWT middleware unless explicitly exempted
- service modules use named exports only
- chat responses return `{ answer, sources }`
- shared case responses are read-only shapes

For the chat flow, the intended contract is:

1. route receives `{ question }`
2. route asks the RAG service for relevant chunks
3. route passes numbered context blocks to the Claude service
4. response returns answer text plus source objects shaped like `{ doc_name, page, chunk_text, score }`

Even in stub mode, the file structure and function signatures will preserve that contract.

## Documentation And Sample Cases

The root `README.md` will explain:

- repository purpose
- prerequisite tools
- Docker startup
- backend startup
- frontend startup
- environment file usage

`casos-prueba/README.md` will document how legal users should add test cases:

- one folder per case
- PDFs inside that folder
- one `metadata.json` file containing:
  - `radicado`
  - `partes`
  - `hechos_clave`
  - `preguntas_prueba[]`

## Verification Strategy

This scaffold is considered successful when the following are true:

- root files exist in the requested layout
- Docker Compose validates and starts the infrastructure services
- backend dependencies install and `npm run dev` boots without import/runtime errors
- frontend dependencies install and `npm run dev` boots without import/runtime errors
- all requested route/component files are present and referenced correctly
- unfinished integrations are clearly marked with JSDoc and `// TODO` comments

No claim will be made that RAG, Claude, or PDF generation are production-complete in this phase.

## Risks And Mitigations

- Risk: startup failures from unavailable infra or API keys
  - Mitigation: keep external integrations behind stubs and avoid boot-time dependency checks that crash the app.
- Risk: confusing placeholders that look like finished features
  - Mitigation: keep TODO comments explicit and keep returned placeholder data minimal.
- Risk: overbuilding before product decisions are made
  - Mitigation: keep boundaries small and avoid introducing extra packages, abstractions, or shared libraries.

## Design Decisions Confirmed

- Build directly at the current repository root, not inside a nested `casepass/` directory.
- Implement the exact requested file tree.
- Target a bootable scaffold, not a partially real backend.
- Keep unfinished services as documented stubs rather than fake full implementations.
- Keep infrastructure limited to Postgres and ChromaDB in Docker Compose.
