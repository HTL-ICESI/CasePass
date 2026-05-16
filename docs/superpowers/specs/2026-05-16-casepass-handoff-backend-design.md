# CasePass Handoff Backend Design

## Overview

This design adds a litigation handoff workflow to the existing CasePass backend. The work is limited to backend code and directly related backend artifacts. The workflow spans four blocks: screening and authorisation, handover pack construction, recipient task execution, and post-action routing with continuity.

The existing backend already contains `users`, `cases`, `documents`, `shared_links`, authentication middleware, and initial AI service files. This design extends that scaffold with a handoff-centric data model, workflow-aware routes, strict state transitions, append-only audit and matter status tracking, and fully implemented AI/RAG/PDF services where explicitly required.

## Goals

- Add a complete PostgreSQL schema for the 18-step handoff workflow.
- Add a REST API that maps cleanly to the workflow blocks and enforces actor and state constraints.
- Add backend services for handoff orchestration, audit logging, matter status snapshots, and workflow state validation.
- Replace AI service stubs with real implementations for retrieval, Claude-based drafting, and PDF generation.
- Preserve the existing `cases` model as the matter-level entity while introducing `handoffs` as the workflow entity.

## Non-Goals

- Frontend integration changes.
- Full production auth redesign beyond route-level actor checks.
- Automatic filing of a Notice of Change.
- Cross-handoff vector retrieval. Retrieval remains scoped per handoff.
- Broad refactoring of unrelated existing routes.

## Architectural Direction

The backend remains an Express app with service-led business logic. The main additions are:

- new workflow tables in `schema.sql`
- a new handoff route module mounted under `/api/handoffs`
- new backend services:
  - `handoffService.js`
  - `aiHandoffService.js`
  - `auditService.js`
  - `matterStatusService.js`
  - `stateMachine.js`
- full implementation of:
  - `ragService.js`
  - `claudeService.js`
  - `pdfService.js`

Routes remain thin. They validate request shape, confirm actor identity, call services, and return consistent JSON errors. Services own transactions and state transitions.

## Core Domain Model

### Cases vs Handoffs

`cases` remains the long-lived matter entity. It holds the overall matter identity. `handoffs` becomes the operational unit for a specific transfer or delegated tranche of work between legal professionals.

This split is intentional:

- a case may have many handoffs over time
- each handoff has its own state machine
- continuity is preserved at the case level through append-only `matter_statuses`

### Handoffs

`handoffs` stores:

- sender and receiver user IDs
- referral shell fields from Step 1 as explicit columns:
  - `court_or_tribunal`
  - `matter_type`
  - `client_name`
  - `opponent_name`
  - `next_date`
  - `urgency`
  - `intended_task`
  - `intended_receiving_role`
- handoff type
- workflow status
- clearance result and notes
- compliance hold data
- task scope and routing outcome
- notice-of-change informational flag

The referral shell is modeled as explicit columns, not JSON, because these fields are part of the platform’s core workflow and must support validation, filtering, indexing, and reporting.

### Handoff Documents

`handoff_documents` links a case-level `documents` row to a specific handoff and adds workflow-specific metadata:

- document type within the handoff context
- privilege and confidentiality flags
- version lineage via `superseded_by`
- source status
- page count

This avoids duplicating file storage while still preserving handoff-specific classification and version tracking.

### Handover Notes and Post-Action Updates

Two separate tables capture AI-assisted text generation:

- `handover_notes`
- `post_action_updates`

Both preserve strict separation between:

- AI draft content
- AI draft source metadata
- human-edited or human-verified final content

AI output never overwrites the verified human version.

### Audit Events

`audit_events` is append-only and records:

- successful state transitions
- blocked transition attempts
- operational workflow events such as release, acceptance, verification, or routing

This table is the source of truth for traceability.

### Matter Statuses

`matter_statuses` is append-only and captures the continuity layer. Each row is a point-in-time snapshot of the matter’s operative state after a routing outcome.

It stores:

- operative event
- next procedural step
- deadline and urgency arrays
- source register snapshot

Rows are inserted only. Existing rows are never updated.

## State Machine

`handoff.status` is enforced centrally through `stateMachine.js`, called from `handoffService` before every status change.

Valid transitions are exactly:

- `draft -> clearance_pending`
- `clearance_pending -> clearance_failed | compliance_hold | file_upload_open`
- `clearance_failed` is terminal
- `compliance_hold -> file_upload_open`
- `file_upload_open -> pack_building`
- `pack_building -> pack_review`
- `pack_review -> pack_released`
- `pack_released -> accepted`
- `accepted -> task_in_progress`
- `task_in_progress -> post_action_pending`
- `post_action_pending -> update_draft`
- `update_draft -> update_verified`
- `update_verified -> routed`
- `routed -> completed | escalated`

Blocked transitions return `409` with:

```json
{
  "error": "string",
  "current_status": "string",
  "allowed_from": ["string"]
}
```

Blocked attempts are also logged into `audit_events`.

## Actor Model And Access Rules

Workflow steps are actor-bound.

Sender-owned steps:

- create referral shell
- set representation type
- apply compliance hold or clear it when authorised
- review and approve handover note
- release handover pack

Receiver-owned steps:

- submit clearance result
- accept handoff
- update task progress
- upload hearing notes
- submit post-action material
- generate and verify update
- route outcome

Admin users may inspect and audit but do not bypass workflow guards by default.

Document exposure rule:

- sender can see handoff documents from upload time
- receiver must not access handoff documents until `status >= pack_released`

File upload rule:

- Step 5 upload is only valid when `handoff.status === 'file_upload_open'`

## Data Integrity Rules

- `clearance_failed` has no recovery path within the same handoff
- `notice_of_change_required` is informational only
- operations touching multiple tables use transactions
- `approved_at` and `approved_by` move together
- `verified_at` and `verified_by` move together
- `routing_outcome` is only meaningful once a verified update exists
- `matter_statuses` is append-only and never updated

## API Design

The handoff API is exposed as REST resources and subresources rather than verb-style command endpoints. The handoff remains the central resource, and each workflow step is modeled either as a collection-creating `POST`, a resource update `PATCH`, or a read `GET`.

### Core Resources

- `POST /api/handoffs`
  - create referral shell
  - sender only
  - creates handoff row
  - transitions `draft -> clearance_pending`
  - writes audit event

- `GET /api/handoffs/:id`
  - returns full handoff state with notes, updates, and visible document map

- `GET /api/cases/:id/handoffs`
  - returns all handoffs for a case ordered chronologically

### Block A Resources

- `POST /api/handoffs/:id/clearance-records`
  - receiver only
  - records a new clearance result and notes
  - transitions from `clearance_pending` to one of:
    - `clearance_failed`
    - `compliance_hold`
    - `file_upload_open`
  - writes audit event

- `PATCH /api/handoffs/:id/representation`
  - sender only
  - updates representation type and Notice of Change flag
  - writes audit event

- `POST /api/handoffs/:id/compliance-records`
  - sender only
  - creates a compliance-hold record for the current handoff
  - transitions to `compliance_hold`
  - writes audit event

- `PATCH /api/handoffs/:id/compliance-records/current`
  - sender only
  - clears the active compliance hold
  - transitions `compliance_hold -> file_upload_open`
  - writes audit event

### Block B Resources

- `POST /api/handoffs/:id/documents`
  - sender only
  - upload only when `file_upload_open`
  - creates `documents` and `handoff_documents` rows
  - indexes PDFs into the handoff-scoped Chroma collection
  - writes audit event

- `GET /api/handoffs/:id/documents`
  - sender always; receiver only once pack is released
  - returns handoff-linked document resources

- `GET /api/handoffs/:id/document-map`
  - returns the source register view for the handoff

- `POST /api/handoffs/:id/matter-reviews`
  - sender only
  - generates a structured AI review for the matter file
  - moves workflow into `pack_building` if not already there
  - writes audit event

- `GET /api/handoffs/:id/handover-notes`
  - returns all versions of handover notes for the handoff

- `POST /api/handoffs/:id/handover-notes`
  - sender only
  - generates a new AI draft handover note resource
  - stores draft in `handover_notes`
  - writes audit event

- `PATCH /api/handoffs/:id/handover-notes/:noteId`
  - sender only
  - stores solicitor-edited note approval on a specific note resource
  - first approval transitions `pack_building -> pack_review`
  - later approvals in `pack_review` create a new approved note version without changing handoff status
  - writes audit event

- `POST /api/handoffs/:id/pack-releases`
  - sender only
  - creates a pack release event
  - transitions `pack_review -> pack_released`
  - writes audit event

### Block C Resources

- `POST /api/handoffs/:id/acceptances`
  - receiver only
  - creates an acceptance record with scope
  - transitions `pack_released -> accepted`
  - writes audit event

- `POST /api/handoffs/:id/task-events`
  - receiver only
  - records task execution/progress events
  - typically transitions `accepted -> task_in_progress`
  - writes audit event

- `POST /api/handoffs/:id/hearing-notes`
  - receiver only
  - uploads attendance note, transcript, or post-hearing dictation artifact
  - remains within execution flow, with audit logging

### Block D Resources

- `GET /api/handoffs/:id/post-action-updates`
  - returns post-action update resources for the handoff

- `POST /api/handoffs/:id/post-action-updates`
  - receiver only
  - creates a post-action update resource and optional linked document
  - transitions `task_in_progress -> post_action_pending`
  - writes audit event

- `POST /api/handoffs/:id/post-action-updates/:updateId/drafts`
  - receiver only
  - generates the AI draft for a specific post-action update resource
  - transitions `post_action_pending -> update_draft` if needed
  - writes audit event

- `PATCH /api/handoffs/:id/post-action-updates/:updateId`
  - receiver only
  - verifies and finalises a specific post-action update resource
  - transitions `update_draft -> update_verified`
  - writes audit event

- `POST /api/handoffs/:id/routing-decisions`
  - receiver only
  - creates the routing decision for the handoff
  - transitions `update_verified -> routed`
  - inserts append-only `matter_statuses` snapshot
  - then advances to `completed` or `escalated`
  - writes audit events for both routing and final status

- `GET /api/handoffs/:id/continuity`
  - sender, receiver, or admin with access
  - returns:
    - handoff audit trail
    - case matter status history
    - source map lineage

## Service Responsibilities

### handoffService.js

Owns:

- row creation and updates for handoffs
- actor validation in service layer
- transaction boundaries
- state-machine calls
- audit logging hooks
- matter-status snapshot trigger on routing

### aiHandoffService.js

Owns:

- retrieval orchestration for a handoff
- Claude workflow invocation
- validation that AI outputs contain grounded sources
- persistence of AI drafts into the correct tables

It relies on the fully implemented `ragService.js` and `claudeService.js`.

### auditService.js

Owns append-only event writes and ordered retrieval methods.

### matterStatusService.js

Owns append-only status snapshots and retrieval of current or historical case state.

### stateMachine.js

Owns:

- transition map
- validation helper
- typed conflict errors
- blocked-transition audit logging support

## AI Service Implementation Requirements

### ragService.js

`ragService.js` is fully implemented, not stubbed.

It must:

- build page maps from per-page parsed text
- chunk PDFs into sentence-aware pieces with page metadata
- embed chunks with `text-embedding-3-small`
- store embeddings in `handoff_{handoffId}` Chroma collections
- update Postgres document indexing state
- retrieve scored chunks with relevance filtering

Errors are explicit and typed. Index failures set document status to `error` before throwing.

### claudeService.js

`claudeService.js` is fully implemented using the Anthropic SDK.

It must:

- reject empty or weak chunk sets with `NO_CHUNKS_FOUND`
- use model `claude-sonnet-4-20250514`
- use `temperature: 0`
- log model, input tokens, output tokens, latency, and handoff ID
- support:
  - citation-grounded chat answers
  - structured matter review JSON
  - structured executive handover note JSON
  - structured update draft JSON

It must parse JSON defensively and return a structured error payload when Claude fails to produce valid JSON for structured endpoints.

### pdfService.js

`pdfService.js` is fully implemented using Puppeteer.

It must:

- render a summary PDF with inline CSS only
- include the required confidentiality header and ordered content sections
- produce a final `Buffer`
- use the required Puppeteer launch and PDF generation flow

## Files To Change

- `backend/src/db/schema.sql`
- `backend/src/index.js`
- `backend/src/routes/handoffs.js`
- `backend/src/services/handoffService.js`
- `backend/src/services/aiHandoffService.js`
- `backend/src/services/auditService.js`
- `backend/src/services/matterStatusService.js`
- `backend/src/services/stateMachine.js`
- `backend/src/services/ragService.js`
- `backend/src/services/claudeService.js`
- `backend/src/services/pdfService.js`

No frontend files are part of this design.

## Verification Strategy

Success criteria:

- schema applies cleanly
- new route module mounts without import/runtime errors
- new services parse and export correctly
- blocked transitions return `409` with the required payload
- every status transition inserts an `audit_events` row
- `matter_statuses` receives inserts only and no update path exists
- RAG indexing and retrieval paths handle typed failures correctly
- Claude entrypoints reject empty chunk input and produce deterministic requests
- Puppeteer summary generation returns a PDF buffer

Runtime verification should include:

- `node --check` on all new backend modules
- backend boot verification
- focused smoke tests for at least one valid transition and one blocked transition
- service-level verification for chunking, JSON parsing, and snapshot creation

## Design Decisions Confirmed

- The referral shell lives as explicit columns on `handoffs`.
- Backend only; no frontend work.
- `cases` remains the parent entity; `handoffs` is the workflow entity.
- `matter_statuses` is append-only and supports continuity.
- `ragService.js`, `claudeService.js`, and `pdfService.js` are implemented as working services, not stubs.
- Every state transition is audited and guarded centrally.
