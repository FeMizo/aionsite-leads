# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # Dev server at http://localhost:2692/dashboard
npm run build            # Next.js build (includes prisma:generate)
npm start                # Production server

npm run prisma:generate  # Generate Prisma client
npm run db:migrate       # Create new migration
npm run db:deploy        # Apply migrations (production)
npm run db:push          # Push schema without migration
npm run db:studio        # Prisma Studio GUI

npm run migrate:legacy         # Import legacy JSON data
npm run send:reschedule        # Recalculate scheduled sends
npm run send:followups         # Send follow-up emails
npm run send:followups:preview # Preview follow-ups
```

## Architecture

Next.js 16 App Router + PostgreSQL (Prisma 7) + Vercel Cron. Spanish-language B2B lead generation platform for AionSite.

### Database Models (prisma/schema.prisma)

- **Prospect** — main lead entity: status, contact info, website analysis, scoring, scheduling
- **ContactEvent** — audit trail of all interactions per prospect
- **Run** — metrics per automated search execution

### Prospect Lifecycle

`generated` → `analyzed` → `approved` → `ready` → `contacted` → `replied` → `closed` (or `rejected` at any point)

### API Routes (app/api/)

All routes require `Authorization: Bearer <INTERNAL_API_KEY>` except `/api/cron` which uses `CRON_SECRET`.

- `POST /api/cron` — Vercel Cron trigger (M/W/F 9am UTC), runs prospect search pipeline
- `POST /api/runs/execute` — Manual search trigger
- `GET/POST /api/prospects` — List (by status) / create prospects
- `POST /api/prospects/[id]/approve` — Approve + schedule outreach
- `POST /api/prospects/[id]/reject` — Reject prospect
- `POST /api/prospects/[id]/message` — Generate personalized email draft
- `POST /api/prospects/[id]/send` — Send email via SMTP
- `POST /api/prospects/[id]/reply` — Mark as replied + hotLead (webhook)

### Core Business Logic (lib/)

- **pipeline.ts** — Full search workflow: Google Places → dedupe → email finding → scoring → save
- **prospect-scoring.ts** — Qualification algorithm (website signals + business type/rating)
- **dedupe.ts** — Normalizes name/email/phone to filter duplicates against existing DB
- **outreach.ts** — Personalized message generation
- **email-template.ts** — HTML + plaintext email drafting
- **mailer.ts** — Nodemailer SMTP integration
- **send-scheduler.ts / send-windows.ts** — Time-zone aware scheduling (Mexico City business hours)
- **auth.ts** — Bearer token validation middleware
- **env.ts** — Typed env vars with fallbacks

### External Providers (providers/)

- **google-places.ts** — Google Places API text search
- **email-finder.ts** — Web scraping + DNS lookups to find prospect emails

### UI

Vanilla CSS (no UI framework). Pages under `app/` follow App Router conventions. Main dashboard at `/dashboard` with sidebar navigation to `/prospects`, `/generated`, `/contacted`, `/history`, `/overview`, `/settings`.

### Key Config

- `vercel.json` — Cron: `0 9 * * 1,3,5`
- `openapi.yaml` — OpenAPI 3.0 schema for Custom GPT Actions integration
- Path alias `@/*` maps to project root
- Port: 2692 (set in package.json dev script)
