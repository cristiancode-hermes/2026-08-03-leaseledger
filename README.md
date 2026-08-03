# LeaseLedger — Property & Rental Management Platform

A focused property-management desk for small landlords (2–50 units): keep every unit, lease, rent payment, and maintenance request in one calm ledger, with rents that calculate themselves and arrears that never sneak up on you.

**Stack:** Angular 22 (standalone, signals, zoneless) · NestJS 11 (TypeORM) · SQLite (dev) / Neon PostgreSQL (prod) · JWT auth with landlord/manager/tenant roles.

**Design:** "Brownstone" — deep ivy green + warm brass + quiet stone neutrals, Fraunces serif display, tabular numerals for money. Full token spec: `docs/DESIGN.md` (source: `/opt/data/hermes-design-specs/2026-08-03-leaseledger/`).

## Features

- **Auth & roles** — register/login, JWT, role guard (landlord / manager / tenant)
- **Properties & units** — CRUD, unit numbers unique per property, status (available / occupied / maintenance)
- **Tenants** — CRUD with FTS search (name/NIF), emergency contact
- **Leases** — overlap validation (409), prorated first month (leap-year safe), renew/terminate, auto-expiration on-read
- **Rent payments** — monthly rent roll, grace period + late fee, arrears accumulation, CSV export (UTF-8 BOM)
- **Maintenance** — state machine `open → assigned → in-progress → resolved`, cost tracking
- **Dashboard** — 4 real KPIs (rent due, collected, overdue/arrears, occupancy), expiring leases (60d), open maintenance

## Monorepo layout

```
apps/
  api/   NestJS 11 — modules: auth, properties, units, tenants, leases, payments, maintenance, dashboard, seed
  web/   Angular 22 — lazy routes, signal services, shared UI kit
docs/    ARCHITECTURE.md, API.md, FRONTEND.md
```

## Commands

```bash
npm install                # hoisted workspace install
npm run build              # nest build + ng build
npm run test:api           # jest unit tests (proration, overlap, state machines, aggregation)
```

## Dev

```bash
cd apps/api && SEED_DB=true npm run start:dev    # API on :3000, Swagger at /docs
cd apps/web && npm run start                     # Web on :4200
```

Local dev uses SQLite (`apps/api/data/leaseledger.db`, auto-created + seeded). Production targets Neon Postgres — schema SQL in `docs/API.md` / `DATABASE_SCHEMA.md` spec; no SQLite-only constructs in entities.
