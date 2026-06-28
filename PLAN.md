# Medication Tracker — Implementation Plan (for Claude Code)

This document is the build plan for a personal medication-tracking app. It is written to be handed to **Claude Code**, which should work through it as a sequence of **merge requests (MRs)** on GitLab — one MR per unit of work, each independently reviewable.

The human author is **solo and learning TypeScript, React, and GitLab CI**. Optimise for clarity and small, well-explained MRs over cleverness. Every MR description should briefly explain *what* changed and *why*, so it doubles as a learning aid.

---

## 1. What we're building

A single-user app to:

- Track each medication, how many pills are left, and how many are taken per day, and **compute when a refill is needed**.
- Track each scheduled dose for the day, let the user **tick it off when taken**, and **alert the user** if a dose goes unticked past an escalation threshold (default: 3 hours).

There is **no multi-user support, no auth, no sharing**. One person, one set of data.

### Scope of THIS plan

This plan covers five milestones, all of which run **locally** — no cloud, no AWS, no deployment:

1. Domain core (pure TypeScript logic)
2. Local API + storage (Express + SQLite behind an interface)
3. React frontend (Vite + Tailwind)
4. Local sweep (hourly check + notifications)
5. Desktop widget (Tauri tray)

**Explicitly out of scope for now** (do not build, but do not preclude): AWS Lambda/API Gateway/DynamoDB, EventBridge or GitHub Actions scheduling, real SMS. The architecture must make these *easy to add later*, but this plan stops at a fully working local app.

---

## 2. Guiding principles (apply to every MR)

These are the rules that keep the app extensible. Treat them as non-negotiable design constraints.

1. **Pure core, no I/O.** The domain core (`packages/core`) must contain only pure functions — no database calls, no network, no reading the system clock inside functions. Anything time-dependent takes the current time as an explicit parameter.
2. **Hide all I/O behind interfaces.** Storage sits behind a `MedicationRepository` interface; notifications sit behind a `Notifier` interface. Concrete implementations (SQLite, Console, Telegram) are swappable without touching callers. This is the seam that makes the later DynamoDB swap a one-file change.
3. **One data shape everywhere.** The TypeScript types in `packages/core` are the single source of truth. Mock data, the SQLite rows, the API responses, and the frontend all use the *same* shapes. Never redefine a `Medication` or `Dose` locally.
4. **Times are ISO 8601 strings.** Store and pass timestamps as strings (e.g. `"2026-06-25T17:00:00Z"`), not `Date` objects. This avoids timezone bugs and serialises cleanly over HTTP and into any database.
5. **Don't throw away meaning.** Computations return honest values even when they're "bad news" — e.g. days-until-refill may be **negative** (already overdue to reorder). The core does not clamp; the UI decides how to present it.
6. **Test-first where practical.** For the domain core especially, write the failing test, then the implementation. Pure functions make this trivial and it's the fastest way to learn TS with feedback.
7. **Small MRs.** Each MR below is sized to be reviewed in one sitting. Do not combine milestones into a single MR.

---

## 3. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Language | TypeScript (strict mode) | Shared across every package |
| Monorepo | npm workspaces | Built into npm, no extra tooling to learn |
| Test runner | Vitest | Zero-config TS, watch mode, same family as Vite |
| API | Express | Thin handlers over the core |
| Local storage | SQLite (`better-sqlite3`) | Behind the repository interface |
| Frontend | React + Vite + Tailwind (+ shadcn/ui) | Imports types from `packages/core` |
| Sweep scheduler (local) | `node-cron` | Hourly trigger for local proving |
| Notifications | Console + Telegram bot | `Notifier` interface; Telegram is free |
| Widget | Tauri | Wraps the web build; needs Rust toolchain to build |

---

## 4. Repository structure (target)

```
medication-tracker/
├── package.json              # npm workspaces root
├── tsconfig.base.json        # shared strict TS config
├── .gitlab-ci.yml            # lint + typecheck + test on every MR
├── packages/
│   ├── core/                 # pure domain logic + types  (Milestone 1)
│   ├── api/                  # Express + repository impls  (Milestone 2)
│   ├── sweep/                # Notifier + sweep + scheduler (Milestone 4)
│   └── web/                  # React frontend (Vite)       (Milestone 3)
│       └── src-tauri/        # Tauri shell                 (Milestone 5)
```

---

## 5. The data contract

Create this in `packages/core/src/types.ts` in the first MR and treat it as authoritative thereafter. Extend it only via its own MR.

```typescript
export interface Medication {
  id: string;
  name: string;
  pillsRemaining: number;      // pills physically on hand right now
  dosesPerDay: number;         // doses taken each day (must be > 0)
  refillLeadTimeDays: number;  // days before running out to reorder
  schedule: string[];          // times of day, 24h, e.g. ["08:00", "21:00"]
}

export interface Dose {
  medicationId: string;
  scheduledFor: string;        // ISO timestamp the dose is due
  takenAt: string | null;      // ISO timestamp when ticked off, else null
}

export interface RefillStatus {
  medicationId: string;
  daysUntilRefill: number;     // may be negative (already overdue to reorder)
  refillDate: string;          // ISO date when a refill is needed
}
```

---

## 6. The work, as merge requests

Each MR lists: **Goal**, **In scope**, **Out of scope**, **Key files**, and **Acceptance criteria** (the definition of done). Standard definition of done for *every* MR: TypeScript typechecks under `strict`, all tests pass, CI is green, and the MR description explains what and why.

### MR-0 — Repo scaffold & tooling

- **Goal:** A working monorepo skeleton with strict TS and a passing (empty) test run.
- **In scope:** `package.json` with npm workspaces; `tsconfig.base.json` with `"strict": true`; Vitest installed at root; an `npm test`, `npm run typecheck`, and `npm run lint` script; ESLint + Prettier with a minimal sensible config; a `README.md` stub; `.gitignore`.
- **Out of scope:** Any app logic.
- **Key files:** root `package.json`, `tsconfig.base.json`, `.eslintrc`, `.prettierrc`, `.gitignore`.
- **Acceptance:** `npm test` runs and reports zero tests without error; `npm run typecheck` passes; a fresh clone + `npm install` works.

### MR-1 — Domain core: types + `daysUntilRefill`

- **Goal:** The data contract plus the first pure function, test-first.
- **In scope:** `packages/core` workspace; `src/types.ts` (as in §5); `daysUntilRefill(med: Medication): number` = `floor(pillsRemaining / dosesPerDay) - refillLeadTimeDays`. Guard `dosesPerDay <= 0` (throw a clear error rather than returning `Infinity`). Tests written **before** the implementation.
- **Out of scope:** Time-based functions, storage.
- **Key files:** `packages/core/src/types.ts`, `packages/core/src/refill.ts`, `packages/core/src/refill.test.ts`.
- **Acceptance — these exact cases pass:**
  - 30 pills, 1/day, lead 7 → `23`.
  - 31 pills, 2/day, lead 7 → `8` (floors 15.5 → 15, minus 7).
  - 3 pills, 1/day, lead 7 → `-4` (negative is intentional, not clamped).
  - `dosesPerDay: 0` → throws.

### MR-2 — Domain core: `dosesDueAt` + `isOverdue` (clock injected)

- **Goal:** The time-dependent core logic, kept pure by passing `now` in.
- **In scope:**
  - `dosesDueAt(doses: Dose[], now: string): Dose[]` — returns doses whose `scheduledFor <= now` and `takenAt === null`.
  - `isOverdue(dose: Dose, now: string, thresholdHours = 3): boolean` — true when untaken and `now` is past `scheduledFor + thresholdHours`.
  - Helper `refillDate(med, today)` returning an ISO date (`today + daysUntilRefill`), and populate `RefillStatus`.
- **Out of scope:** Generating the day's doses from a schedule (that can be a follow-up helper if needed by the API), storage, notifications.
- **Key files:** `packages/core/src/doses.ts` (+ tests), extend `refill.ts` for `refillDate`.
- **Acceptance:** No function reads the system clock internally — every test supplies a fixed `now` string and asserts a deterministic result. Cover: due vs not-yet-due, taken (never overdue), exactly-at-threshold boundary, and past-threshold.

### MR-3 — Repository interface + in-memory implementation

- **Goal:** Define the storage seam and a trivial implementation to develop against.
- **In scope:** `MedicationRepository` interface with at least: `listMedications()`, `getDueDoses(now)`, `markTaken(medicationId, scheduledFor, takenAt)`, `getRefillStatus()`. An `InMemoryMedicationRepository` implementing it (backed by a plain array/seed data). Tests against the in-memory impl.
- **Out of scope:** SQLite, Express.
- **Key files:** `packages/api/src/repository.ts` (interface), `packages/api/src/inMemoryRepository.ts`, tests.
- **Acceptance:** The interface is defined once; the in-memory impl passes a shared test suite that any future implementation (SQLite, DynamoDB) can be run against.

### MR-4 — SQLite implementation of the repository

- **Goal:** A real local persistence layer, same interface.
- **In scope:** `SqliteMedicationRepository` using `better-sqlite3`; a schema/migration for `medications` and `doses`; reuse the **same** test suite from MR-3 to prove behavioural parity.
- **Out of scope:** Express, any cloud DB.
- **Key files:** `packages/api/src/sqliteRepository.ts`, `packages/api/src/schema.sql`, tests.
- **Acceptance:** The SQLite impl passes the identical repository test suite the in-memory impl passed. Swapping implementations requires no change to callers.

### MR-5 — Express API over the core + repository

- **Goal:** A local HTTP backend you can hit with `curl`.
- **In scope:** Express server wiring the `SqliteMedicationRepository` and the core. Endpoints (thin handlers — logic stays in the core):
  - `GET /medications`
  - `GET /doses/due?now=<iso>` (defaults to real now at the edge, not in the core)
  - `POST /doses/taken` (body: `{ medicationId, scheduledFor }`)
  - `GET /refill-status`
  - `POST /sweep` (runs a check now and returns what *would* be notified — used later by the scheduler)
- **Out of scope:** Auth, deployment, notifications firing (the `/sweep` endpoint just reports for now).
- **Key files:** `packages/api/src/server.ts`, route handlers, integration tests (supertest or equivalent).
- **Acceptance:** Documented `curl` examples in the MR description; integration tests cover each endpoint; the server reads the clock only at the HTTP boundary, never in the core.

### MR-6 — React frontend scaffold + typed API client

- **Goal:** A Vite React app that imports core types and talks to the local API, with a mock mode.
- **In scope:** `packages/web` via Vite (React + TS); Tailwind + shadcn/ui set up; a typed `apiClient` whose return types are the `core` types; a `MOCK` toggle that serves hardcoded data matching those types so the UI can run with no backend.
- **Out of scope:** Final styling polish, Tauri.
- **Key files:** `packages/web/*`, `packages/web/src/apiClient.ts`, `packages/web/src/mockData.ts`.
- **Acceptance:** App boots with `npm run dev`; switching `MOCK` on/off changes the data source with no other code change; types are imported from `packages/core`, not redefined.

### MR-7 — Frontend dashboard UI

- **Goal:** The slick part: see today's doses, tick them off, see refill countdown.
- **In scope:** A medication list; per-dose **tick-box** that calls `POST /doses/taken` and reflects state; a **refill countdown** per medication using `RefillStatus` (present negative days as "reorder now / overdue" rather than a raw minus number); clean, compact layout suitable for later reuse inside the widget.
- **Out of scope:** Tauri shell, tray behaviour.
- **Key files:** `packages/web/src/components/*`.
- **Acceptance:** Ticking a dose persists via the API and survives reload; refill status displays sensibly including the overdue case; UI components are written so the widget can reuse them.

### MR-8 — Notifier interface + sweep logic

- **Goal:** The escalation logic, pure and testable, with a console notifier.
- **In scope:** `Notifier` interface (`send(message): Promise<void>`); `ConsoleNotifier`; a `runSweep(repo, notifier, now)` function that finds overdue doses via the core and notifies once per overdue dose. Use the existing notification-log concept to make it **idempotent** (don't double-notify the same dose). Tests with a fake repo + fake notifier + fixed `now`.
- **Out of scope:** Real Telegram, scheduling.
- **Key files:** `packages/sweep/src/notifier.ts`, `packages/sweep/src/sweep.ts`, tests.
- **Acceptance:** Given a fixed `now` and seeded overdue doses, the sweep notifies exactly the right doses, exactly once each; re-running with the same state notifies nothing new.

### MR-9 — Local scheduler + Telegram notifier

- **Goal:** Prove real, recurring, real-channel reminders on the laptop.
- **In scope:** `node-cron` job running `runSweep` hourly against the SQLite repo; a `TelegramNotifier` implementing `Notifier` via a Telegram bot token (read from an env var; document setup via BotFather in the MR). Default escalation threshold 3 hours, made configurable via env.
- **Out of scope:** Cloud scheduling, SMS.
- **Key files:** `packages/sweep/src/scheduler.ts`, `packages/sweep/src/telegramNotifier.ts`, `.env.example`.
- **Acceptance:** Running the scheduler locally sends a real Telegram message for an overdue dose; secrets come from env, never committed; switching `ConsoleNotifier` ↔ `TelegramNotifier` is a one-line change.

### MR-10 — Tauri shell

- **Goal:** Run the existing web frontend as a desktop app.
- **In scope:** Initialise Tauri inside `packages/web/src-tauri`; load the web build; documented build prerequisites (Rust toolchain). No behaviour change to the UI yet.
- **Out of scope:** Tray icon, window sizing.
- **Key files:** `packages/web/src-tauri/*`.
- **Acceptance:** `tauri dev` launches the app in a native window showing the existing dashboard, pointed at the local API.

### MR-11 — Tray icon + corner widget view

- **Goal:** The small, always-on-top corner widget.
- **In scope:** System-tray icon; a compact widget view (today's tick-box + refill countdown only) reusing the MR-7 components; small, frameless/always-on-top window parked in a screen corner; click tray to show/hide.
- **Out of scope:** Cloud connectivity (still points at local API).
- **Key files:** `packages/web/src-tauri/*`, a compact route/component in `packages/web`.
- **Acceptance:** A small widget sits in the corner, shows current status, and lets the user tick today's dose; closing to tray and reopening works.

---

## 7. Working agreement for Claude Code

- Raise **one MR per section** above, in order. Do not start an MR whose dependencies aren't merged.
- Branch naming: `mr-<n>-<short-slug>` (e.g. `mr-1-domain-core-refill`).
- Each MR description states the goal, the key decisions, and any follow-ups deferred.
- Keep the `core` package free of imports from `api`, `web`, or `sweep` — dependencies point *toward* the core, never out of it.
- If a requirement here seems wrong or ambiguous, flag it in the MR description and propose an alternative rather than silently diverging — the author is learning and wants the reasoning surfaced.
- Do not add AWS, deployment, or cloud-scheduling code; those are a later phase by design.

## 8. Phase-2 note (context only — do not build yet)

Later, the SQLite repository will be joined by a DynamoDB implementation of the *same* `MedicationRepository` interface, the sweep will be triggered by GitHub Actions (then EventBridge) instead of `node-cron`, and the widget will point at an API Gateway URL instead of localhost. Everything in this plan is structured so those are swaps at the seams, not rewrites. Building the seams cleanly now is what earns that later.

> **Direction update (post Phase 1):** Phase 2 has since been chosen to be **free and non-AWS** — a hosted **Postgres** (instead of DynamoDB), a free API host + **GitHub Actions cron** for reminders (instead of EventBridge), **GitHub Pages** for the web UI, and a **Tauri** desktop widget. The seam-based reasoning above still holds; only the concrete services changed. The detailed Phase 2 plan is **§10** below.

---

## 9. Status — completed since the original plan

Phase 1 (the local app) is built and working. Beyond MR-0…MR-9, the following shipped (out of the original numbering, driven by real use):

- **Local one-command run:** `docker-compose` with three services (`api`, `sweep`, `web`) sharing the `./data` SQLite volume; persistence across restarts.
- **MR-12 — Add medication:** `POST /medications` + add-medication form; removed auto-seed data.
- **MR-13 — Computed pills remaining:** `Medication` now stores `pillsAtPickup` + `lastPickupDate`; `pillsRemaining` is a *computed* value (`RefillStatus.pillsRemaining`) rather than stored state. (This supersedes the `pillsRemaining` field shown in §5.)
- **MR-14 — Tick / un-tick a dose:** taken doses stay visible and can be un-ticked; dashboard reads "today's doses" (taken + pending), not just outstanding ones.
- **MR-15 — Recurring doses:** each medication's doses are materialised for every day on demand (`ensureDosesForDay`), not only the day it was added; the sweep ensures the day too.
- **MR-16 — Delete a medication:** removes the medication and all its doses (`DELETE /medications/:id`).
- **MR-17 — Edit a dose time:** inline time editor in the Due Today list; moves today's + future *untaken* doses to the new time, leaving taken history intact.

**Deferred:** the original **MR-10 / MR-11 (Tauri shell + tray widget)** were not built in Phase 1. They are now absorbed into Phase 2 **Epic D**, where the widget points at the *hosted* API rather than localhost.

---

## 10. Phase 2 — Hosted backbone, reminders, and desktop widget

Phase 2 graduates the app from a local-only tool into a small **single-user hosted service** with three clients (a desktop widget, a hosted web page, and local dev) that all share one cloud database. The repository/notifier seams built in Phase 1 are what make this a series of swaps rather than a rewrite.

### 10.1 Target architecture

```
        ┌─ Desktop widget (Tauri tray)  ─┐
        │                                │
        ├─ Hosted web UI (GitHub Pages) ─┼──▶  Hosted API  ──▶  Hosted DB (Postgres)
        │                                │          ▲
        └─ Local dev (docker compose)  ──┘          │
                                            GitHub Actions cron
                                            (fires at dose times → /sweep → Telegram)
```

The hosted API + DB is the single source of truth; every UI is just a client of it. A free host that *sleeps when idle* is fine — the cron is the heartbeat that wakes it at dose times.

### 10.2 Recommended stack

| Piece | Choice | Notes |
|---|---|---|
| Database | Neon or Supabase (free Postgres) | Persistent free tier; reached via a new repository implementation |
| API host | Fly.io or Render (free) | Render free sleeps when idle — acceptable, the cron wakes it |
| Web UI hosting | GitHub Pages | Free static hosting of the production Vite build |
| Reminders | GitHub Actions cron → hosted `/sweep` | Free; schedule cron *at dose times* (not frequent polling) to stay punctual and within free minutes |
| Widget | Tauri | Light on memory/battery; system tray; reuses the React UI |

### 10.3 Phase 2 guiding principles (new constraints)

These are in addition to §2, and are triggered by going public:

1. **Auth before exposure.** The API must require a secret/token before it is reachable on the public internet. No open endpoints over your medication data.
2. **Migrations, not "delete the DB".** Once data is real and hosted, schema changes go through a migration runner — the local "delete `medications.db`" habit must end.
3. **Secrets live in env / GitHub Secrets.** Telegram tokens, the API token, and the DB URL are never committed.
4. **Reuse the seams.** New storage is a new `MedicationRepository` implementation; reminders reuse the existing `Notifier` / `runSweep`. Callers don't change.
5. **Timezone correctness becomes real.** Times are still stored UTC-naively today; hosted reminders that fire at the right local time make this worth fixing (DST included).

### 10.4 The work, as merge requests

Continues the numbering from the completed MR-17. Same definition of done as §6.

#### Epic A — Cloud backbone (everything depends on this)

**MR-18 — Postgres repository implementation**
- **Goal:** A `PostgresMedicationRepository` behind the existing `MedicationRepository` interface.
- **In scope:** New implementation using a Postgres driver; run the **shared repository test suite** against it (Testcontainers or a local Postgres) to prove parity with SQLite; `main.ts` selects SQLite (local) vs Postgres (cloud) by env var.
- **Out of scope:** Deployment, auth, migrations runner (next MRs).
- **Key files:** `packages/api/src/postgresRepository.ts`, wiring in `packages/api/src/main.ts`, repo tests.
- **Acceptance:** The Postgres impl passes the identical shared suite the SQLite impl passes; switching storage is an env change, no caller edits.

**MR-19 — Database migrations**
- **Goal:** Replace "delete the DB" with versioned migrations.
- **In scope:** A migration runner (e.g. `node-pg-migrate`) and the initial schema as migration 1; run on startup or via an explicit command; documented.
- **Out of scope:** Deployment.
- **Key files:** `packages/api/migrations/*`, migration scripts in `package.json`.
- **Acceptance:** A fresh database is brought up to schema by running migrations; a schema change is expressed as a new migration, not a manual reset.

**MR-20 — API auth (shared token)**
- **Goal:** Stop the API being open before it goes public.
- **In scope:** Middleware requiring a secret token (header) on all data endpoints; token from env; local dev can default-allow via env flag; clear 401 on missing/wrong token.
- **Out of scope:** Multi-user accounts, OAuth.
- **Key files:** `packages/api/src/auth.ts` (or middleware), `server.ts`, tests.
- **Acceptance:** Requests without the token get 401; with it, 200; token is read from env, never committed.

**MR-21 — Deploy API + provision Postgres**
- **Goal:** The backbone live in the cloud.
- **In scope:** Provision free Postgres; deploy the API to the chosen host; configure env/secrets (DB URL, API token); point your *local* web app at the hosted API to confirm end-to-end.
- **Out of scope:** Hosted UI, widget, cron.
- **Key files:** deploy config (e.g. `fly.toml`), `.env.example` updates, README deploy notes.
- **Acceptance:** The local web app works fully against the hosted API + Postgres; secrets are configured in the host, not the repo.

#### Epic C — Cloud reminders

**MR-22 — Reminder endpoint + GitHub Actions cron + Telegram**
- **Goal:** Overdue-aware Telegram reminders, free, in the cloud.
- **In scope:** A protected `/sweep` (or `/reminders`) trigger that runs `runSweep` against the hosted DB and sends Telegram; a GitHub Actions workflow on a cron schedule (set to your dose times) that calls it with the API token from GitHub Secrets.
- **Out of scope:** Hosted UI, widget.
- **Key files:** `.github/workflows/reminders.yml`, a trigger endpoint in `server.ts`, secrets documented.
- **Acceptance:** At a scheduled time, the workflow calls the endpoint and a real Telegram message is sent for a genuinely overdue dose; nothing fires for doses already taken.

#### Epic D — Desktop widget (supersedes original MR-10 / MR-11)

**MR-23 — Tauri shell against the hosted API**
- **Goal:** Run the React UI as a desktop app pointed at the hosted API.
- **In scope:** Initialise Tauri in `packages/web/src-tauri`; load the web build; configure the hosted API URL + token; documented build prerequisites (Rust toolchain).
- **Out of scope:** Tray behaviour, compact view.
- **Key files:** `packages/web/src-tauri/*`.
- **Acceptance:** `tauri dev` launches a native window showing the dashboard, talking to the hosted API.

**MR-24 — Tray widget: start/stop + compact view**
- **Goal:** The "spin up / turn off like Docker Desktop" widget.
- **In scope:** System-tray icon; a compact view (today's tick-boxes + refill countdown) reusing existing components; show/hide from the tray; quit closes it; optional launch-at-login; macOS packaging.
- **Out of scope:** Offline support.
- **Key files:** `packages/web/src-tauri/*`, a compact route/component in `packages/web`.
- **Acceptance:** A small widget shows current status and lets you tick today's dose against the hosted DB; closing to tray and reopening works; quitting fully stops it.

#### Epic B — Hosted web UI

**MR-25 — Production build + GitHub Pages deploy**
- **Goal:** A hosted URL you can open on any device.
- **In scope:** `vite build` configured with the hosted API URL; a GitHub Actions workflow deploying the static build to GitHub Pages.
- **Out of scope:** —
- **Key files:** `.github/workflows/pages.yml`, web build config.
- **Acceptance:** The Pages URL loads the dashboard against the hosted API.
- **⚠️ Security wrinkle:** a public static site cannot hide the API token (anyone can read it from the JS). Securing the public UI needs a small login (password → token) or keeping the page password-gated. Decide the approach in this MR; until then, prefer the widget for daily use.

#### Epic E — Polish (optional, as needed)

**MR-26 — Timezone-correct scheduling (+ optional offline widget queue)**
- **Goal:** Reminders and displayed times correct in your local timezone, DST included.
- **In scope:** Store/interpret schedule times against a timezone rather than naive UTC; fix display/“upcoming” logic accordingly. *Optional:* offline write-queue in the widget that syncs when reconnected ("write to the DB later").
- **Out of scope:** —
- **Key files:** `packages/core/*` (time handling), widget sync if attempted.
- **Acceptance:** A dose set for 21:00 local fires/display at 21:00 local year-round; (if built) ticks made offline reach the DB once reconnected.

### 10.5 Recommended order

**A → C → D → B**, with E as needed. Build Epic A locally first (MR-18–20 against a local Postgres) before deploying anything — it de-risks the backbone where it's easy to debug and nothing is exposed. Then reminders (high value, low effort once data is hosted), then the widget you most want, then the public web UI last (it's the fiddliest on security). One MR per section, dependencies merged first, as in §7.
