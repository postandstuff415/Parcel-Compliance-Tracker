# WUI Fire Safety Inspection Engine

A full-stack municipal dashboard for Oakland Fire Department / Alameda County fire inspectors to manage Wildland-Urban Interface (WUI) defensible space inspections, plus a resident self-service portal for GPS-verified photo submissions.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/wui-inspector run dev` — run the inspector/resident web app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS, react-leaflet, Shadcn UI
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth)
- `lib/db/src/schema/` — Drizzle ORM table definitions (parcels, inspections, citations, resident_submissions, resident_photos)
- `artifacts/api-server/src/routes/` — Express route handlers (parcels, inspections, citations, resident, dashboard)
- `artifacts/wui-inspector/src/` — React frontend (inspector dashboard + resident portal)

## Architecture decisions

- All API contracts defined in OpenAPI first; Zod schemas and React Query hooks generated from it
- Resident portal PIN "123456" maps to APN "048-5612-014-00" via server-side PIN→APN lookup
- Parcel boundary points stored as JSONB in PostgreSQL (no PostGIS required for MVP)
- Anti-cheat photo capture uses HTML5 MediaDevices API (camera only, no gallery upload)
- Zone buffer rings drawn with react-leaflet Circle components; no Mapbox API key required

## Product

- **Inspector Dashboard** (`/`): Parcel queue sorted by composite fuel risk score, Leaflet map with Zone 0/1/2 buffer rings, action panel for approve/flag/site-visit, citation modal with auto-populated Notice of Non-Compliance
- **Resident Portal** (`/resident-portal`): PIN verification (123456), APN lookup, 3-step guided zone walkthrough with live camera capture, GPS-stamped photos submitted to inspector queue

## User preferences

- Footer required on all pages: "CONFIDENTIAL & PROPRIETARY — Intellectual Property & Trade Secret of Michael Thompson. Protected under CA Civil Code § 3426."

## Gotchas

- After changing `lib/db/src/schema/`, run `pnpm run typecheck:libs` before `pnpm --filter @workspace/api-server run typecheck` so route imports see fresh declarations
- After changing `lib/api-spec/openapi.yaml`, run `pnpm --filter @workspace/api-spec run codegen` (it also runs typecheck:libs)
- The API server builds with esbuild before starting — `dev` script runs build then start

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
