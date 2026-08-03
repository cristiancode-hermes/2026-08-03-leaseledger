# API — LeaseLedger

Base URL: `/api` (same origin as the SPA). Auth: `Authorization: Bearer <jwt>` for every route except `/auth/*` and `/health`. Swagger UI: `/api/docs`.

Roles: `landlord`, `manager`, `tenant`. `@Roles` marks the allowed roles per route; property-scoped endpoints re-validate ownership/assignment server-side.

## Auth

| Method | Path | Roles | Description |
|---|---|---|---|
| POST | `/auth/register` | public | `{name, email, password, role: landlord\|manager}` → `{token, user}` |
| POST | `/auth/login` | public | `{email, password}` → `{token, user}` |
| GET | `/auth/me` | any | `{user}` for the current token |

## Dashboard

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/dashboard` | landlord, manager | `{kpis: {rentDue, collected, overdue, arrears, occupancy}, expiringLeases[], unpaidUnits[], openMaintenance[]}` |
| GET | `/dashboard/my-lease` | tenant | `{lease (unit/property/effectiveStatus), payments[], nextDue}` — tenant found by email match |

## Properties

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/properties?q=` | landlord, manager | Portfolio summaries: `{id, name, address, type, graceDays, lateFeeRate, unitCount, occupiedCount, monthlyRent}` |
| POST | `/properties` | landlord, manager | `{name, address, type}` (+ optional `graceDays`, `lateFeeRate`) |
| GET | `/properties/:id` | owner/manager | Property detail |
| PATCH | `/properties/:id` | owner/manager | Partial update (incl. `managerId` assignment) |
| DELETE | `/properties/:id` | owner | 409 if units exist |
| GET | `/properties/:id/units` | owner/manager | Units of the property |

## Units

| Method | Path | Roles | Description |
|---|---|---|---|
| POST | `/units` | landlord, manager | `{propertyId, number, bedrooms, bathrooms, area, monthlyRent, status?}` — 409 on duplicate (propertyId, number) |
| GET | `/units/:id` | owner/manager | `{unit, property, currentLease, paymentHistory, maintenance}` |
| PATCH | `/units/:id` | owner/manager | Partial update; status validation (occupied only with an active lease) |
| DELETE | `/units/:id` | owner | 409 if an active lease exists |

## Tenants

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/tenants?q=` | landlord, manager | List (FTS over name/email/phone/nif) |
| POST | `/tenants` | landlord, manager | `{name, email?, phone?, nif?, emergencyContact?}` — 409 on duplicate email/nif |
| GET | `/tenants/:id` | landlord, manager | Detail + leases (with effective status) + payment summary `{totalDue, totalPaid, arrears, count}` |
| PATCH | `/tenants/:id` | landlord, manager | Partial update (uniqueness re-checked) |
| DELETE | `/tenants/:id` | landlord, manager | 409 if linked to an active lease |

## Leases

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/leases?unitId=&status=&expiringWithinDays=` | landlord, manager | List with unit/tenant relations + effective status |
| POST | `/leases` | landlord, manager | `{unitId, tenantId, startDate, endDate, monthlyRent, deposit?}` — 400 invalid range, **409 on overlap**; creates the prorated first payment; flips unit to `occupied` when started |
| GET | `/leases/overlap-check?unitId=&start=&end=` | landlord, manager | `{overlaps, conflicting?}` |
| GET | `/leases/:id` | owner/manager | Detail: unit, tenant, payments, maintenance, `proratedFirstMonth` |
| PATCH | `/leases/:id/renew` | owner/manager | `{endDate, monthlyRent?}` — active only, end must extend |
| PATCH | `/leases/:id/terminate` | owner/manager | `{terminatedAt?}` — sets status terminated, unit → available |

## Payments

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/payments/roll?month=YYYY-MM` | landlord, manager | `{month, rows[], totals: {due, collected, arrears}}` — synthetic rows generated on-read |
| GET | `/payments?leaseId=&month=&status=` | landlord, manager | Stored payment rows |
| POST | `/payments` | landlord, manager | `{leaseId, dueDate, amount, method?, paidDate?}` — upsert: marks the due row paid |
| PATCH | `/payments/:id` | landlord, manager | `{paidDate?, method?, paidAmount?}` — corrections |
| GET | `/payments/export?month=YYYY-MM` | landlord, manager | CSV (UTF-8 BOM, semicolon-free) for spreadsheet import |
| GET | `/payments/arrears?propertyId=` | landlord, manager | `{total, byTenant[]}` — unpaid amounts incl. late/overdue |

## Maintenance

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/maintenance?status=&priority=&unitId=` | landlord, manager | Requests with unit + assignee relations |
| GET | `/maintenance/mine` | tenant | Requests reported by the tenant's account |
| POST | `/maintenance` | landlord, manager, tenant | `{unitId, category, priority, description}` — tenant restricted to own unit |
| PATCH | `/maintenance/:id/assign` | landlord, manager | `{assignedTo}` — open → assigned |
| PATCH | `/maintenance/:id/start` | landlord, manager | assigned → in-progress |
| PATCH | `/maintenance/:id/resolve` | landlord, manager | `{cost?}` — in-progress → resolved (sets resolvedAt) |

## Error envelope

Non-2xx responses follow Nest defaults: `{statusCode, message, error}`. `message` may be an array of validation errors. Overlap/create conflicts use 409, ownership failures 403, missing resources 404.

## Seed data (deterministic, SEED_DB=true on first boot)

- Users (password `password123`): `ana@leaseledger.dev` (landlord-1), `carlos@leaseledger.dev` (landlord-2), `marta@leaseledger.dev` (manager, assigned to Calle Sol 12), `k.james@mail.com` (tenant demo).
- 2 properties (Casa Robles 4 units, Calle Sol 12 3 units), 6 tenants, 6 leases (active / expiring-43d / expired / maintenance-blocked), 38 payments (incl. 2 unpaid months with late fees on B-202), 4 maintenance requests across all statuses.
