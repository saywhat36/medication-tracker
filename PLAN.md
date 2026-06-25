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
