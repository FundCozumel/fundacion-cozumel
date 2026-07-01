# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sistema de Autoevaluación para Fundación Comunitaria Cozumel, IAP — a full-stack web app for managing youth programs, tracking attendance, and collecting survey data. Spanish-language UI.

## Architecture

**Monorepo with three top-level directories:**
- `frontend/` — Next.js 14 (App Router) + TypeScript + Tailwind CSS
- `backend/` — FastAPI + Python + Uvicorn
- `database/` — Supabase (PostgreSQL) SQL scripts

**Auth flow:**
1. User logs in via Supabase Auth (email/password) on `/login`
2. JWT stored in httpOnly cookie by `@supabase/ssr`
3. `frontend/src/middleware.ts` refreshes session and redirects unauthenticated users
4. Backend validates JWT via `SUPABASE_JWT_SECRET`; creates user-scoped Supabase client that respects RLS

**Two distinct user types:**
- `usuarios` — staff with system access (roles: `administrador` or `coordinador`)
- `participantes` — youth/attendees with no system login; tracked via attendance and surveys

**Data access pattern:**
- Server Components query Supabase directly (user-scoped RLS enforced automatically)
- Client Components use the browser Supabase client (`frontend/src/lib/supabase/client.ts`)
- FastAPI endpoints at `localhost:8000` are called from the frontend with the JWT; backend uses RLS-aware Supabase client

**Database:** 11 tables with Row-Level Security. Key tables: `programas`, `sedes`, `actividades`, `participantes`, `asistencias`, `cuestionarios`, `preguntas`, `opciones_respuesta`, `respuestas`. All tables have `created_at`/`updated_at` with auto-update triggers.

## Development Commands

### Frontend
```bash
cd frontend
npm install
npm run dev       # http://localhost:3000
npm run build
npm run lint
```

### Backend
```bash
cd backend
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000   # http://localhost:8000/docs
```

### Database Setup (Supabase SQL Editor, in order)
1. `database/schema.sql`
2. `database/seed.sql`
3. `database/rls.sql`
4. `database/test_queries.sql` — validates setup

## Environment Variables

**`frontend/.env.local`** (copy from `.env.local.example`):
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**`backend/.env`** (copy from `.env.example`):
```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
FRONTEND_URL=http://localhost:3000
```

## Key Patterns

**Supabase clients:** Use `frontend/src/lib/supabase/server.ts` in Server Components/Route Handlers and `client.ts` in Client Components. Never use the service-role key in frontend code.

**Role checks:** Read from `usuarios` table joined to Supabase Auth UID. Admins see all data; coordinators see restricted data via RLS policies in `database/rls.sql`.

**Survey question types:** `texto`, `numero`, `opcion_multiple`, `si_no`, `likert_1_5`, `fecha`. Survey types: `registro`, `pre`, `post`, `evaluacion_modulo`, `evaluacion_evento`.

**Path alias:** Frontend uses `@/` mapped to `src/` (configured in `tsconfig.json`).

**CORS:** Backend only allows requests from `FRONTEND_URL`. When adding new API routes, register them in `backend/app/main.py` via `app.include_router(...)`.

**Creating users:** New staff users must be created through Supabase Auth dashboard (or service-role API), then inserted into the `usuarios` table with the matching `auth_user_id` and role.
