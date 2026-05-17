# CasePass Frontend-Backend Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the frontend mock auth/data layer with a real REST client connected to the CasePass backend while preserving the frontend from `feature/frontend` as the source of truth for the UI.

**Architecture:** Keep the current TanStack Router frontend intact and swap only the auth and API boundary. Introduce a real client adapter that maps backend England & Wales workflow objects into the frontend’s existing domain types, then verify the merged app locally with backend and frontend running together.

**Tech Stack:** React, TanStack Router, React Query, TypeScript, Vite, Express backend, JWT auth, REST, Jest backend tests

---

Commits are omitted from the plan because the user did not request a new commit for this integration step yet.

## File Structure

- Modify: `frontend/src/lib/auth.tsx` - real JWT-backed auth state and storage
- Modify: `frontend/src/lib/api/index.ts` - export real client instead of `mockClient`
- Modify: `frontend/src/lib/api/client.ts` - implement REST client and adapters
- Modify: `frontend/src/lib/api/types.ts` - align view-model types with real runtime usage
- Modify: `frontend/src/routes/login.tsx` - real login UX instead of demo-role login
- Modify: `frontend/src/routes/_authenticated/dashboard.tsx` - support real API data and role semantics
- Modify: `frontend/src/routes/_authenticated/inbox.tsx` - support real API data filtering
- Modify: `frontend/src/routes/_authenticated/handoffs.new.tsx` - create case + handoff + uploads through backend
- Modify: `frontend/src/routes/_authenticated/handoffs.$id.tsx` - consume real handoff shape
- Modify: `frontend/src/routes/_authenticated/handoffs.$id.chat.tsx` - consume real chat payloads
- Modify: `frontend/src/routes/_authenticated/handoffs.$id.note.tsx` - use real review/note data
- Modify: `frontend/src/routes/_authenticated/handoffs.$id.sources.tsx` - map real documents
- Modify: `frontend/src/routes/_authenticated/handoffs.$id.updates.tsx` - create and render real updates
- Modify: `frontend/src/routes/_authenticated/admin/users.tsx` - replace mock user table with backend users
- Modify: `frontend/vite.config.ts` - add a local `/api` proxy if needed

### Task 1: Replace Mock Authentication

**Files:**
- Modify: `frontend/src/lib/auth.tsx`
- Modify: `frontend/src/routes/login.tsx`

- [ ] **Step 1: Implement real auth storage and login/logout behavior**

In `frontend/src/lib/auth.tsx`, replace the mock `login(email, password, role)` flow with a real request to `POST /api/auth/login`, storing:

- JWT token under a stable storage key
- backend user object

Keep the exported `useAuth()` surface small and stable.

- [ ] **Step 2: Update `login.tsx` to use real backend login**

Remove the demo-role dependency as a source of identity. The form should submit real email/password, show loading state, and display backend failures through the existing toast/error affordances.

- [ ] **Step 3: Verify frontend still builds after auth rewrite**

Run: `npm run build`

Workdir: `frontend`

Expected: build fails only if downstream API client changes are still missing, not because auth imports/types are broken.

### Task 2: Implement Real API Client And Adapters

**Files:**
- Modify: `frontend/src/lib/api/index.ts`
- Modify: `frontend/src/lib/api/client.ts`
- Modify: `frontend/src/lib/api/types.ts`

- [ ] **Step 1: Replace `mockClient` export with a real client**

Export a real `api` object from `frontend/src/lib/api/index.ts`.

- [ ] **Step 2: Implement fetch helpers and auth header injection**

In `frontend/src/lib/api/client.ts`, add a small fetch wrapper that:

- prefixes `/api`
- reads JWT token from storage
- adds `Authorization: Bearer ...`
- parses JSON
- throws meaningful errors on 401/403/409/422/500

- [ ] **Step 3: Add backend-to-frontend adapters**

Implement adapters for:

- handoff summary
- matter review
- documents
- matter updates
- chat answer
- dashboard KPIs

These adapters should map backend fields like `case_title`, `forum`, `page_count`, `chunks_count`, `privilege_flag`, `most_recent_operative_event`, and `next_procedural_step` into the existing frontend shapes.

- [ ] **Step 4: Verify frontend build after API client replacement**

Run: `npm run build`

Workdir: `frontend`

Expected: build succeeds or remaining errors are isolated to route-level assumptions rather than the client boundary.

### Task 3: Wire Dashboard, Inbox, And Handoff Detail Pages

**Files:**
- Modify: `frontend/src/routes/_authenticated/dashboard.tsx`
- Modify: `frontend/src/routes/_authenticated/inbox.tsx`
- Modify: `frontend/src/routes/_authenticated/handoffs.$id.tsx`

- [ ] **Step 1: Switch dashboard queries to the real client**

Ensure dashboard list and KPI calculations derive from real backend data rather than mocks.

- [ ] **Step 2: Switch inbox filtering to real backend-derived handoffs**

Filter on the authenticated receiving user from real backend data.

- [ ] **Step 3: Switch handoff detail layout to real handoff resources**

Use `GET /api/handoffs/:id` as the source of truth and map backend detail data into the frontend layout.

- [ ] **Step 4: Verify build after top-level route wiring**

Run: `npm run build`

Workdir: `frontend`

Expected: detail/dashboard/inbox routes compile against the real client and adapters.

### Task 4: Wire New Handoff, Chat, Notes, Sources, Updates, And Admin Users

**Files:**
- Modify: `frontend/src/routes/_authenticated/handoffs.new.tsx`
- Modify: `frontend/src/routes/_authenticated/handoffs.$id.chat.tsx`
- Modify: `frontend/src/routes/_authenticated/handoffs.$id.note.tsx`
- Modify: `frontend/src/routes/_authenticated/handoffs.$id.sources.tsx`
- Modify: `frontend/src/routes/_authenticated/handoffs.$id.updates.tsx`
- Modify: `frontend/src/routes/_authenticated/admin/users.tsx`

- [ ] **Step 1: Convert new handoff flow to real backend mutations**

Create the case, then the handoff, then upload files through backend endpoints.

- [ ] **Step 2: Convert chat page to real backend chat**

Ensure response citations and source panels map from backend `sources[]` correctly.

- [ ] **Step 3: Convert note page to real review and handover note resources**

Use backend notes and reviews instead of mock review data.

- [ ] **Step 4: Convert sources and updates pages to real backend resources**

Use real documents and post-action updates.

- [ ] **Step 5: Convert admin users page to real backend user data**

Replace `MOCK_USERS` with `/api/users` and `/api/users/:id/active`.

- [ ] **Step 6: Verify full frontend build after route integration**

Run: `npm run build`

Workdir: `frontend`

Expected: the production build completes successfully.

### Task 5: Add Local Proxy And Run Integrated Smoke Flow

**Files:**
- Modify: `frontend/vite.config.ts` if needed

- [ ] **Step 1: Ensure the frontend dev server can reach backend `/api` locally**

If the TanStack/Vite config does not already proxy `/api`, add the minimal local dev proxy configuration required.

- [ ] **Step 2: Run backend automated verification**

Run: `npm test`

Workdir: `backend`

Expected: backend Jest suite remains green.

- [ ] **Step 3: Run frontend build verification**

Run: `npm run build`

Workdir: `frontend`

Expected: frontend build passes.

- [ ] **Step 4: Start backend and frontend locally for manual verification**

Run backend on a local port and frontend on its local dev port, then manually verify:

- login
- dashboard
- inbox
- create handoff
- upload docs
- review/note/release
- accept
- updates
- chat
- admin users
- share view
- summary download

Document any blockers immediately instead of guessing.

## Self-Review Checklist

- Spec coverage: auth, API client, view-model adapters, route integration, and local smoke validation all have explicit tasks.
- Placeholder scan: no unresolved TODO execution steps remain in this plan.
- Type consistency: the plan preserves the frontend route/UI structure from `feature/frontend` and only replaces the mock boundary with real auth and REST adapters.
