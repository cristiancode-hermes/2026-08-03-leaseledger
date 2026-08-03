# Frontend — LeaseLedger (Angular 22)

Standalone components, **signals** everywhere, **zoneless** change detection (`provideZonelessChangeDetection`), lazy-loaded routes, no NgModules.

## Routes (all guarded)

| Route | Roles | Page |
|---|---|---|
| `/login`, `/register` | public | Auth pages (demo creds prefilled) |
| `/dashboard` | landlord, manager | KPIs, unpaid month, open maintenance, expiring, properties |
| `/my-lease` | tenant | Own lease, payment history, report-issue modal, own maintenance |
| `/properties` `/properties/new` `/properties/:id` `/properties/:id/edit` | staff | Portfolio cards → detail (units table, add-unit modal, delete) |
| `/units/:id` | staff | Current lease, payment history, maintenance |
| `/tenants` `/tenants/new` `/tenants/:id` `/tenants/:id/edit` | staff | FTS search, detail with leases + arrears |
| `/leases/new` | staff | Live **overlap check** + **proration preview** as you type |
| `/leases/:id` | staff | Payments table, renew (+1y), terminate |
| `/payments` | staff | Rent roll: month picker, record-payment modal, CSV export, arrears |
| `/maintenance` | staff | Filter tabs, assign/start/resolve actions, new-request modal |
| `**` | — | Not found |

## Design system — "Brownstone" (`styles.css`)

CSS custom properties only — no Tailwind build step, no `dark:` prefixes. Theme swaps via `[data-theme]` on `<html>` (ThemeService persists `leaseledger-theme` and respects `prefers-color-scheme`).

- **Colors (Committed strategy):** deep ivy `#1B4D3E` primary, brass `#8A6A2F` secondary, stone neutrals, status tints at 10–14% mixes for pills/alerts. Dark mode inverts to mint-on-charcoal.
- **Type:** Fraunces (display, headings + KPI numerals) × Inter (UI) × JetBrains Mono (unit numbers, dates); tabular numerals for money.
- **Motion:** exponential ease-out, `prefers-reduced-motion` global kill-switch, no bounce/elastic.
- **Responsive:** tables collapse to labelled stacked cards < 640px; desktop nav collapses to a fixed bottom nav.

## Architecture notes

- **Template scope:** Angular templates resolve component members only — imported format helpers (`eur`, `dateFmt`, pill tones) are exposed via `shared/format-base.ts`, an abstract base class every page extends.
- **Forms:** template-driven `ngModel` for CRUD forms. Form objects are plain mutable objects (not signals) because `[(ngModel)]` cannot two-way-bind to a signal property. Whole-signal bindings (`[(ngModel)]="newCategory"`) work fine.
- **State:** services own signals (`state()`, `loading()`, `error()`); pages read them reactively. No subscription cleanup needed.
- **API base:** relative `/api` — same origin in production (Caddy), proxied in dev (`scripts/preview-server.mjs`).
- **Auth:** token in `localStorage('leaseledger_token')`, `authInterceptor` attaches the Bearer header; `roleGuard` gates routes by `data.roles` and re-fetches the profile once if unset.

## Key components

- `shared/ui/status-pill` — one pill, five tones, dot indicator
- `shared/ui/modal` + `confirm-dialog` — a11y focus handling via native buttons, ESC/backdrop close
- `shared/ui/month-picker` — rent-roll month navigation
- `shared/ui/empty-state` — every list has one (glyph + title + CTA)
- `layout/layout-shell` — sticky header, role-aware nav, mobile bottom nav, toast host

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Landlord | `ana@leaseledger.dev` | `password123` |
| Manager | `marta@leaseledger.dev` | `password123` |
| Tenant | `k.james@mail.com` | `password123` |
