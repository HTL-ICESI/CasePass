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
