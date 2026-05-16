# CasePass Handoff Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the handoff workflow backend for CasePass, including schema, REST-structural handoff resources, workflow services, state-machine enforcement, and real AI/RAG/PDF services.

**Architecture:** Extend the existing Express backend instead of replacing it. Keep routes thin, move workflow orchestration into services, enforce all handoff status transitions centrally, and preserve append-only audit and matter-status records.

**Tech Stack:** Node.js, Express, PostgreSQL, pg, OpenAI SDK, Anthropic SDK, ChromaDB client, pdf-parse, Puppeteer, Node built-in test runner

---

Commits are omitted from this plan unless the user explicitly asks for them.

## File Structure

- Modify: `backend/src/db/schema.sql` - add handoff workflow tables, constraints, and indexes
- Modify: `backend/src/db/index.js` - add transaction helper support
- Modify: `backend/src/index.js` - mount new handoff routes
- Modify: `backend/src/services/ragService.js` - replace stubs with working RAG implementation
- Modify: `backend/src/services/claudeService.js` - replace stubs with working Claude implementation
- Modify: `backend/src/services/pdfService.js` - replace placeholder PDF generation with required summary generator
- Create: `backend/src/routes/handoffs.js` - REST-structural handoff resources and subresources
- Create: `backend/src/services/handoffService.js` - business orchestration and transitions
- Create: `backend/src/services/aiHandoffService.js` - AI workflow orchestration and persistence
- Create: `backend/src/services/auditService.js` - append-only audit logging and reads
- Create: `backend/src/services/matterStatusService.js` - append-only matter snapshots
- Create: `backend/src/services/stateMachine.js` - valid transition map and typed conflict error
- Create: `backend/test/stateMachine.test.js` - status transition tests
- Create: `backend/test/ragService.test.js` - page-map and chunking tests
- Create: `backend/test/claudeService.test.js` - empty-chunk and JSON parsing utility tests

### Task 1: Expand Schema And Database Helpers

**Files:**
- Modify: `backend/src/db/schema.sql`
- Modify: `backend/src/db/index.js`

- [ ] **Step 1: Add the workflow tables and indexes to `schema.sql`**

Add tables for `handoffs`, `handoff_documents`, `handover_notes`, `post_action_updates`, `audit_events`, and `matter_statuses`, keeping the existing `users`, `cases`, `documents`, and `shared_links` tables intact. Use `CHECK` constraints for `handoff_type`, `status`, `task_scope`, `routing_outcome`, and the document classification enums.

- [ ] **Step 2: Add database transaction support in `backend/src/db/index.js`**

Expose a helper shaped like:

```js
async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

- [ ] **Step 3: Verify the database helper module exports all required functions**

Run: `node -e "const db = require('./src/db'); console.log(Object.keys(db).sort().join(','))"`

Workdir: `backend`

Expected: output includes `pool`, `query`, `runMigrations`, and `withTransaction`.

### Task 2: Add State, Audit, And Matter Status Services

**Files:**
- Create: `backend/src/services/stateMachine.js`
- Create: `backend/src/services/auditService.js`
- Create: `backend/src/services/matterStatusService.js`
- Create: `backend/test/stateMachine.test.js`

- [ ] **Step 1: Write the failing state machine test**

Create tests that assert:

```js
import test from 'node:test';
import assert from 'node:assert/strict';

test('allows draft to clearance_pending', () => {
  // expect no throw
});

test('blocks pack_released to pack_building with conflict metadata', async () => {
  // expect typed error with code and allowed_from payload
});
```

- [ ] **Step 2: Run the state machine test and verify it fails first**

Run: `node --test test/stateMachine.test.js`

Workdir: `backend`

Expected: FAIL because `stateMachine.js` does not exist yet.

- [ ] **Step 3: Implement `stateMachine.js`, `auditService.js`, and `matterStatusService.js` minimally to satisfy the tests and spec**

`stateMachine.js` should export a transition map, a typed `InvalidStateTransitionError`, and a validator function that can optionally log blocked transitions through `auditService`.

`auditService.js` should export `logEvent`, `getHandoffAuditTrail`, and `getCaseTimeline`.

`matterStatusService.js` should export `snapshotMatterStatus`, `getCurrentStatus`, and `getStatusHistory`, with inserts only.

- [ ] **Step 4: Re-run the state machine test**

Run: `node --test test/stateMachine.test.js`

Workdir: `backend`

Expected: PASS.

### Task 3: Implement Real RAG Service

**Files:**
- Modify: `backend/src/services/ragService.js`
- Create: `backend/test/ragService.test.js`

- [ ] **Step 1: Write failing tests for `buildPageMap` and `chunkText`**

Include tests for:

- cumulative page offsets
- no mid-sentence split when sentence boundaries exist
- returned chunk metadata containing `doc_name`, `page`, `char_start`, `char_end`, and `token_estimate`

- [ ] **Step 2: Run the RAG test and verify the new cases fail**

Run: `node --test test/ragService.test.js`

Workdir: `backend`

Expected: FAIL because the current service lacks `buildPageMap` and the current `chunkText` signature/shape.

- [ ] **Step 3: Implement `buildPageMap`, `chunkText`, `indexDocument`, and `searchChunks` fully**

Use:

- `pdf-parse` with per-page text collection for page maps
- OpenAI embeddings model `text-embedding-3-small`
- Chroma collection naming `handoff_${handoffId}`
- Postgres updates to `documents.status` and `documents.chunks_count`
- typed errors like `RAG_INDEX_FAILED`

- [ ] **Step 4: Re-run the RAG tests**

Run: `node --test test/ragService.test.js`

Workdir: `backend`

Expected: PASS.

### Task 4: Implement Real Claude And PDF Services

**Files:**
- Modify: `backend/src/services/claudeService.js`
- Modify: `backend/src/services/pdfService.js`
- Create: `backend/test/claudeService.test.js`

- [ ] **Step 1: Write failing Claude service tests for validation and JSON parsing helpers**

Cover:

- `NO_CHUNKS_FOUND` when chunks are empty
- JSON fence stripping for structured responses

- [ ] **Step 2: Run the Claude service test and verify it fails first**

Run: `node --test test/claudeService.test.js`

Workdir: `backend`

Expected: FAIL because helper behavior does not exist yet.

- [ ] **Step 3: Implement `chatWithSources`, `reviewMatter`, `generateHandoverNote`, and `generateUpdateDraft`**

Requirements:

- instantiate `Anthropic` once at module level
- always use `claude-sonnet-4-20250514`
- set `temperature: 0`
- log token and latency data in `[CLAUDE] ...` format
- reject empty or weak chunk inputs
- preserve source mapping from citations back to chunks

- [ ] **Step 4: Implement `generateSummaryPDF(caseData, handoverNote, matterReview)` in `pdfService.js`**

Use Puppeteer with `--no-sandbox`, inline CSS only, and the exact report section order from the spec.

- [ ] **Step 5: Re-run the Claude service test and syntax-check the PDF service**

Run: `node --test test/claudeService.test.js && node --check src/services/pdfService.js`

Workdir: `backend`

Expected: PASS and zero syntax errors.

### Task 5: Implement Handoff And AI Workflow Services

**Files:**
- Create: `backend/src/services/handoffService.js`
- Create: `backend/src/services/aiHandoffService.js`

- [ ] **Step 1: Implement `handoffService.js` with transaction-backed workflow methods**

Include:

- `createHandoff`
- `submitClearance`
- `setRepresentationType`
- `releaseHandoverPack`
- `acceptHandoff`
- `routeHandoff`

Each state-changing method must:

- load the current handoff row
- validate actor responsibility
- call the state machine
- perform the data mutation
- append an audit event
- insert a `matter_statuses` snapshot when routing occurs

- [ ] **Step 2: Implement `aiHandoffService.js` as the orchestration layer**

Include:

- `reviewMatter(handoffId)`
- `generateHandoverNote(handoffId)`
- `generateUpdateDraft(postActionId)`

Each method should gather handoff context, call retrieval, invoke `claudeService`, validate grounded sources, and persist AI drafts without overwriting human-reviewed content.

- [ ] **Step 3: Syntax-check the workflow services**

Run: `node --check src/services/handoffService.js && node --check src/services/aiHandoffService.js`

Workdir: `backend`

Expected: no output, exit code `0`.

### Task 6: Add Handoff Routes And Mount Them

**Files:**
- Create: `backend/src/routes/handoffs.js`
- Modify: `backend/src/index.js`

- [ ] **Step 1: Implement the handoff route handlers grouped by workflow block**

Add routes for:

- `POST /api/handoffs`
- `POST /api/handoffs/:id/clearance`
- `PUT /api/handoffs/:id/authority`
- `POST /api/handoffs/:id/compliance-hold`
- `POST /api/handoffs/:id/compliance-clear`
- `POST /api/handoffs/:id/documents`
- `GET /api/handoffs/:id/document-map`
- `POST /api/handoffs/:id/ai-review`
- `POST /api/handoffs/:id/handover-note`
- `PUT /api/handoffs/:id/handover-note`
- `POST /api/handoffs/:id/release`
- `POST /api/handoffs/:id/accept`
- `PUT /api/handoffs/:id/task-status`
- `POST /api/handoffs/:id/hearing-notes`
- `POST /api/handoffs/:id/post-action`
- `POST /api/handoffs/:id/ai-update`
- `PUT /api/handoffs/:id/verify-update`
- `PUT /api/handoffs/:id/route`
- `GET /api/handoffs/:id/continuity`
- `GET /api/handoffs/:id`
- `GET /api/cases/:id/handoffs`

- [ ] **Step 2: Mount the route module in `backend/src/index.js`**

Mount it behind JWT auth under `/api` while preserving the existing public auth and share routes.

- [ ] **Step 3: Verify the app bootstrap still loads**

Run: `node -e "const { app } = require('./src/index'); console.log(typeof app);"`

Workdir: `backend`

Expected: `function` or `object` and exit code `0`.

### Task 7: Full Backend Verification

**Files:**
- No new files required

- [ ] **Step 1: Run all focused backend tests**

Run: `node --test test/stateMachine.test.js test/ragService.test.js test/claudeService.test.js`

Workdir: `backend`

Expected: all tests pass.

- [ ] **Step 2: Syntax-check all modified backend source files**

Run: `node --check src/index.js && node --check src/routes/handoffs.js && node --check src/services/handoffService.js && node --check src/services/aiHandoffService.js && node --check src/services/auditService.js && node --check src/services/matterStatusService.js && node --check src/services/stateMachine.js && node --check src/services/ragService.js && node --check src/services/claudeService.js && node --check src/services/pdfService.js`

Workdir: `backend`

Expected: zero syntax errors.

- [ ] **Step 3: Verify backend dependency graph and app bootstrap**

Run: `npm install && node -e "const { app, startServer } = require('./src/index'); if (!app || !startServer) process.exit(1); console.log('backend ok');"`

Workdir: `backend`

Expected: `backend ok`

## Self-Review Checklist

- Spec coverage: schema, route surface, workflow services, state machine, audit trail, continuity layer, and real AI services all have explicit tasks.
- Placeholder scan: this plan avoids unresolved TODO-style execution steps; all steps identify exact files and concrete verification commands.
- Type consistency: the plan uses `handoffs`, `handoff_documents`, `handover_notes`, `post_action_updates`, `audit_events`, and `matter_statuses` consistently across schema, services, and routes.
