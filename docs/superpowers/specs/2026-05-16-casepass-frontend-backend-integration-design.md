# CasePass Frontend-Backend Integration Design

## Overview

The frontend from `feature/frontend` is now the source of truth for the UI. The integration goal is to preserve that frontend experience while replacing its mock authentication and mock data client with a real client for the CasePass backend already implemented on the `backend` branch.

This work is not a redesign of the frontend. It is an integration pass. The visual system, route structure, and screen composition from the frontend branch remain intact. Only the data boundary and authentication flow change.

## Goals

- Keep the frontend from `feature/frontend` as the canonical UI.
- Replace demo login with real JWT-backed login against the backend.
- Replace `mockClient` with a real REST client.
- Adapt backend England & Wales domain objects into the frontend view models expected by the current screens.
- Run the integrated frontend and backend locally so manual verification is possible.

## Non-Goals

- Rebuild the frontend to mirror backend JSON one-to-one.
- Preserve the older frontend scaffold from the backend branch.
- Add new backend endpoints unless integration reveals a hard blocker.

## Integration Strategy

The frontend keeps its current route tree and components. Integration happens through three layers:

1. `auth.tsx` becomes real session auth.
2. `src/lib/api/index.ts` stops exporting `mockClient`.
3. `src/lib/api/client.ts` becomes a real REST adapter that maps backend data to the frontend domain types.

This keeps the UI stable while allowing the backend to remain the system of record.

## Authentication Design

Current frontend auth is fully mocked. It creates local users in browser storage.

The new behavior:

- `login(email, password)` calls `POST /api/auth/login`
- stores:
  - JWT token
  - backend user object
- `logout()` clears token and user
- authenticated route guards derive access from the stored real user

Frontend role labels remain display-level labels, but role resolution comes from backend data:

- `admin` stays `admin`
- non-admin users are displayed as solicitor or receiving counsel based on context, not hardcoded demo selection

The role picker on the login page is removed or downgraded to an informational hint because it no longer drives identity.

## API Client Design

`CasePassClient` remains the frontend-facing contract, but is now backed by REST.

The REST client will:

- inject `Authorization: Bearer <token>` when present
- centralize JSON parsing and error handling
- translate backend 401/403/409 errors into user-facing exceptions the routes can display

## View Model Mapping

The backend data model is richer and more legal-specific than the frontend’s current types. We will keep the frontend types and add adapter functions.

### Handoff Mapping

Frontend expects:

- `caseName`
- `matterType`
- `court`
- `parties`
- `status`
- `summary`
- `documentsCount`
- `pagesIndexed`
- `deadlines`

These map from backend fields such as:

- `case_summary.case_title`
- `case_summary.claim_type`
- `case_summary.court_name` or `forum`
- `case_summary.claimant` / `defendant`
- handoff workflow status mapped into frontend display statuses
- latest note or case summary text for `summary`
- aggregated document counts and page totals
- deadline extraction from `aos_due`, `defence_due`, `bundle_due`, `skeleton_due`, `next_hearing_date`

### Review Mapping

Frontend `MatterReview` is a condensed view of the backend AI review. Adapter logic will map:

- `stage_of_proceedings -> stage`
- `most_recent_operative_event -> lastEvent`
- `urgent_issues -> urgentIssues`
- `missing_documents -> missingDocs`
- `next_procedural_step -> nextStep`

Inline citations from backend source objects are preserved in frontend citation chips.

### Document Mapping

Frontend document rows expect:

- `filename`
- `pages`
- `chunks`
- `privilege`
- `status`

These derive from:

- `original_name`
- `page_count`
- `chunks_count`
- `privilege_flag`
- `status`

### Update Mapping

Frontend updates timeline expects:

- `whatWasDone`
- `whatHappened`
- `whatFollows`
- author label
- attachments
- citations

These map from `post_action_updates`, linked documents, and audit or ownership context where needed.

## Screen-Level Integration

### Login

- Replace mock role-based login with real login request.
- Show backend error messages when auth fails.

### Dashboard

- Populate from real handoffs accessible to the user.
- Dashboard KPIs are derived client-side from real fetched data in the first pass.

### Inbox

- Filter real handoffs assigned to the current receiving solicitor.

### New Handoff

- Convert the multi-step flow into real backend calls:
  - create case
  - create handoff
  - upload documents

### Handoff Detail

- Read from `GET /api/handoffs/:id`
- child routes consume the same handoff resource and supporting subresources

### Chat

- Call `POST /api/cases/:id/chat` with `handoff_id`
- translate `sources[]` into citation chips and source panel entries

### Note

- generate and approve real handover notes

### Updates

- create post-action updates
- generate AI draft
- verify final version

### Sources

- list real handoff-linked documents

### Admin Users

- consume `/api/users`
- toggle active status through `/api/users/:id/active`

## Local Verification Plan

We will verify in two layers:

### Automated

- backend Jest suite remains green
- frontend build passes after replacing mocks

### Manual Integrated Smoke Flow

Using local backend + local frontend:

1. login with real backend user
2. create a case
3. create a handoff
4. upload a PDF
5. run matter review
6. generate handover note
7. release pack
8. accept as receiving user
9. log post-action update
10. verify update
11. route handoff
12. use chat against indexed sources
13. open shared case link
14. download PDF summary

Only after that manual pass is clean should we consider the front-back integration complete.

## Files To Change

- `frontend/src/lib/auth.tsx`
- `frontend/src/lib/api/index.ts`
- `frontend/src/lib/api/client.ts`
- `frontend/src/lib/api/types.ts`
- selected route files that currently assume mock-only shapes or role semantics
- `frontend/vite.config.ts` if a proxy/config tweak is needed for local dev

No visual redesign is part of this work.
