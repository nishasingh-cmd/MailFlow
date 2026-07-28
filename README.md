# MailFlow

An AI-powered email outreach platform that helps users send personalized emails at scale
with minimal effort.

## Features

- Upload leads using Excel (.xlsx) or CSV files
- Automatic column detection and mapping
- Dynamic email templates with placeholders
- Bulk personalized email sending
- Background email queue using BullMQ & Redis
- Manual WhatsApp outreach with pre-filled messages
- Lead status and follow-up tracking
- Lightweight CRM dashboard

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + TypeScript + Tailwind CSS |
| Backend | Node.js + Express + TypeScript |
| Database | Supabase (PostgreSQL) via Prisma ORM |
| Queue | BullMQ + Redis |
| Email Provider | Resend / SendGrid |
| AI | OpenAI |
| File Parsing | SheetJS (xlsx) |

## Monorepo Structure

```
mailflow/
├── project-documentation/   # Source-of-truth docs (do not modify)
├── frontend/                # React + Vite + TypeScript + Tailwind CSS
├── backend/                 # Node.js + Express + TypeScript + Prisma
├── worker/                  # Background job worker (BullMQ — future phase)
└── shared/                  # Shared TypeScript types and constants
```

## Getting Started

### Prerequisites

- **Node.js** v18+ and **npm** v9+
- **PostgreSQL** (local or Supabase URL)
- **Redis** (local or hosted — e.g. Upstash, Railway)

### 1. Install Dependencies

From the **root** directory (installs all workspaces at once):

```bash
npm install
```

### 2. Configure Environment Variables

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env — fill in DATABASE_URL and REDIS_URL

# Frontend
cp frontend/.env.example frontend/.env
# Edit frontend/.env — set VITE_API_BASE_URL if backend runs on a different port
```

### 3. Run Database Migrations

```bash
cd backend
npm run prisma:migrate   # Applies migrations + prompts for a migration name
npm run prisma:generate  # Re-generates Prisma client after schema changes
```

### 4. Start Services

Each service runs independently. Open three terminals:

```bash
# Terminal 1 — Frontend (http://localhost:5173)
npm run dev:frontend

# Terminal 2 — Backend API (http://localhost:3001)
npm run dev:backend

# Terminal 3 — Worker (placeholder; BullMQ added in a later phase)
npm run dev:worker
```

Or run each from their own directory:

```bash
cd frontend && npm run dev
cd backend  && npm run dev
cd worker   && npm run dev
```

## Verifying Connections

### PostgreSQL

Run a Prisma migration — if the `DATABASE_URL` is correct and the database exists,
the migration will apply successfully:

```bash
cd backend
npm run prisma:migrate
```

You can also open Prisma Studio to browse the database:

```bash
cd backend
npm run prisma:studio
```

### Redis

Start the backend (`npm run dev:backend`). On startup it will:

1. Connect to the Redis URL in `.env`
2. Send a `PING` command
3. Log `[redis] Ping successful — Redis is reachable` if the connection works

If Redis is not running, you'll see `[redis] Connection error: ...` in the console.

## Code Quality

```bash
# Lint all workspaces
npm run lint

# Format all workspaces
npm run format
```

Husky git hooks run ESLint + Prettier automatically on every commit.

## Goal

Simplify cold outreach by allowing users to upload leads, personalize messages, send
bulk emails, manage follow-ups, and track outreach from a single platform.
