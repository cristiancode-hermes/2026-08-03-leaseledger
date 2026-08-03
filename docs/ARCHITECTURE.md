# Architecture — LeaseLedger

Property & rental management platform for small landlords (2–50 units): properties, units, tenants, leases (with proration + overlap validation), a monthly rent roll, and a maintenance state machine.

**Stack:** Angular 22 (standalone, signals, zoneless) + NestJS 11 + TypeORM (SQLite dev / Neon Postgres ready) + Tailwind-token design system (pure CSS custom properties).

## Repository layout

```
2026-08-03-leaseledger/
├── apps/
│   ├── api/                     NestJS 11 backend
│   │   └── src/
│   │       ├── main.ts          bootstrap: /api prefix, CORS, ValidationPipe, Swagger (/api/docs)
│   │       ├── app.module.ts    TypeORM forRoot + module wiring + seed on boot
│   │       ├── common/          pure domain rules (tested, no Nest deps)
│   │       │   ├── dates.ts         YYYY-MM-DD helpers, leap years
│   │       │   ├── proration.ts     first-month rent proration
│   │       │   ├── lease-rules.ts   overlap + lease status machine
│   │       │   ├── payment-rules.ts grace/late/overdue + late-fee derivation
│   │       │   ├── maintenance-rules.ts status transitions
│   │       │   └── rent-roll.ts     due-date generation + month totals
│   │       ├── entities/       7 TypeORM entities (see schema doc)
│   │       ├── auth/           JWT (passport-jwt), roles guard (landlord/manager/tenant)
│   │       ├── properties/     CRUD + manager assignment + portfolio summary
│   │       ├── units/          CRUD + status rules
│   │       ├── tenants/        CRUD + FTS search + detail aggregation
│   │       ├── leases/         create (overlap 409, prorated first payment), renew, terminate
│   │       ├── payments/       rent roll (on-read generation), record/correct, CSV, arrears
│   │       ├── maintenance/    CRUD + state machine endpoints (assign/start/resolve)
│   │       ├── dashboard/      KPIs + expiring + unpaid + open maintenance; tenant my-lease
│   │       └── seed/           deterministic demo data (stable UUIDs)
│   └── web/                    Angular 22 SPA
│       └── src/app/
│           ├── services/       API clients (signals-based state)
│           ├── shared/ui/      status-pill, kpi-tile, modal, confirm, empty-state, …
│           ├── shared/format-base.ts  template-scope bridge for format helpers
│           ├── layout/         header + role-aware nav + mobile bottom nav
│           └── pages/          14 lazy routes (see FRONTEND.md)
├── scripts/preview-server.mjs  same-origin dev preview (SPA + /api proxy)
└── docs/                       ARCHITECTURE.md · API.md · FRONTEND.md
```

## Domain model (7 entities)

`User` (role: landlord | manager | tenant) → owns/`managerId` **Property** → **Unit** ← **Lease** (unit × tenant, status machine draft/active/expired/terminated) ← **RentPayment** (one row per lease × due date) and **MaintenanceRequest** (open → assigned → in-progress → resolved).

**Manager assignment:** the spec's ERD has no join table (7-entity cap), so assignment is modelled as a nullable `Property.managerId` FK to `users`. Access rule: a manager sees only properties where `managerId = user.id` (or where they are also the owner). Landlords see their own `ownerId` properties. Documented deviation — see `DATABASE_SCHEMA.md` of the spec.

## Key business rules

- **Proration (first month):** `prorated = round2(monthlyRent / daysInMonth × (daysInMonth − moveInDay + 1))`; leap-year aware; due date = lease start. First payment row is created at lease creation; later months are generated on-read by the rent roll (nothing persisted until paid).
- **Overlap:** inclusive-date ranges — creating a lease whose `[start, end]` intersects any existing lease of the same unit → `409 CONFLICT` with the conflicting lease. `GET /leases/overlap-check` powers the live form warning.
- **Payments status (derived on read):** `paid` (full) → `partial` (some) → `due` (≤ due+graceDays) → `late` (past deadline, fee not yet applied) → `overdue` (fee applied). Dashboard refresh applies the fee lazily: `fee = round2(amount × property.lateFeeRate)`.
- **Lease status (derived on read):** `active` auto-expires when `endDate < today`; `draft` activates on start date; `terminated`/`expired` are terminal.
- **Rent roll:** for a month, every active lease intersecting it yields one row; due date = min(lease start day, month length); existing payment rows override the synthetic row.

## AuthZ

- `POST /auth/register` creates landlord/manager accounts (tenant accounts come from seed; tenant ↔ user link is by email match with the `Tenant` entity).
- `@Roles('landlord','manager')` on staff routes; `@Roles('tenant')` on `/dashboard/my-lease`. Property-scoped services re-check ownership/assignment per resource (`assertAccess`), so a manager cannot read another manager's property.
- Tenant self-service: report maintenance only on units covered by their own active lease.

## Testing

Pure domain rules live in `common/` with zero Nest dependencies — 38 unit tests in `src/common/*.spec.ts` run via Jest:

- `proration.spec.ts` — mid-month, day-1, leap-year Feb 29, Feb 28 non-leap, clamping
- `lease-rules.spec.ts` — overlap matrix (incl. touching dates), status machine, renew/terminate gates
- `payment-rules.spec.ts` — grace boundary, late vs overdue, fee rounding, partials
- `maintenance-rules.spec.ts` — legal transitions, no jumps, terminal state
- `rent-roll.spec.ts` — month intersection, due-date capping, totals

```bash
cd apps/api && npm test        # 38 tests
npm run build:api              # nest build
npm run build:web              # ng build
```

## Environment / ports

- API: `PORT` (default 3000 — NOTE: this host has Forgejo on 3000, so local dev uses 3100), `DB_PATH` (default `./data/leaseledger.db`), `SEED_DB` (`false` to skip), `DATABASE_TYPE=postgres` + `DATABASE_URL` flips to Neon.
- Web: built with `ng build`, served same-origin with the API behind Caddy (relative `/api`).
- Dev preview: `node scripts/preview-server.mjs <dist> <api-port> <port>` — SPA + `/api` reverse proxy on one origin.
