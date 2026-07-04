# CLAUDE.md

Operational guide for Claude Code (or any contributor) working on this repo.
`PLAN.md` is the historical build log and original design principles;
`SCOPE.md` says what the app currently is and isn't; `DEPLOY.md` covers
Render setup. This file is the "how work actually gets done here" reference —
update it when a convention changes, rather than letting it drift stale.

## Project shape

npm workspaces monorepo, four packages:

| Package | Owns | Depends on |
|---|---|---|
| `packages/core` | Pure domain logic and types (`Medication`, `Dose`, `RefillStatus`) — no I/O, no clock reads inside functions | nothing |
| `packages/api` | Express server, the `MedicationRepository` interface and its three implementations, dose-token signing | `core` |
| `packages/web` | React + Vite + Tailwind dashboard (classic view + apothecary shop view, behind a toggle) | `core` |
| `packages/sweep` | Hourly reminder sweep — due/missed/taken email tiers, refill reminders | `core`, `api` |

Dependencies point toward `core`, never out of it. `core` stays pure — no
network, no filesystem, no `new Date()` inside a function; time is always an
explicit parameter (`now: string`, ISO 8601).

## The invariant that's easy to half-do: three backends, one interface

`MedicationRepository` has three implementations — SQLite (`sqliteRepository.ts`,
local dev), Postgres (`postgresRepository.ts`, production via Render/Neon), and
in-memory (`inMemoryRepository.ts`, tests). **Any change to what a `Medication`
or `Dose` stores needs all of:**

1. The field added to the type in `packages/core/src/types.ts`
2. `sqliteRepository.ts` — schema (`CREATE TABLE` block), the `ensureRecipientColumns`-style
   defensive `ALTER TABLE` fallback for pre-existing local `.db` files, insert/update SQL, and `toMedication`/`toDose` mapping
3. `postgresRepository.ts` — a new numbered migration in `packages/api/migrations/`
   (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, additive only), insert/update SQL, and mapping
4. `packages/api/src/repository.test.ts` — the **shared** suite, which runs
   against all three backends (Postgres skipped unless `TEST_DATABASE_URL` is set).
   Add round-trip coverage here, not per-backend test files.

`inMemoryRepository.ts` usually needs no change — it spreads whatever's on the
object generically.

Forgetting one of these doesn't fail loudly; it silently drops the field on
whichever backend you didn't touch. This has bitten every schema change so far.

## Verification bar before opening a PR

Every PR in this repo's history has gone through, in order:

1. `npm run typecheck` (root — runs `tsc --build` across all packages)
2. `npm run lint`
3. `npm test` (root — runs the full Vitest suite; Postgres-backed tests
   auto-skip without `TEST_DATABASE_URL`)
4. A CI-simulated production web build:
   `VITE_API_URL=<render-url> VITE_BASE=/medication-tracker/ npm run build --workspace @medication-tracker/web`
5. **A real browser check**, not just the above. Set `VITE_MOCK=true` in
   `packages/web/.env.local` and use the preview MCP (or `npx vite`) against
   the mock client in `packages/web/src/mockData.ts`. Typecheck and tests
   verify correctness; only opening the app verifies the feature actually
   works and looks right.

For anything touching the repository layer, a real migration run against a
throwaway local Postgres (`docker run postgres:16-alpine` + `runMigrations`)
is worth doing once per schema change — the shared test suite catches logic
bugs, not "does this SQL actually apply cleanly."

## Deploy topology and where env vars live

Three independent surfaces, each with its own env var story:

- **Render** (`render.yaml`) — hosts the API only. Dashboard env vars here
  never reach GitHub Actions.
- **GitHub Pages** (`.github/workflows/pages.yml`) — builds and deploys the
  web app on push to `main`. No secrets of its own.
- **GitHub Actions** (`.github/workflows/reminders.yml`) — runs the hourly
  sweep. Reads its own repo-level **Secrets** (sensitive: `DATABASE_URL`,
  `GMAIL_APP_PASSWORD`, `RESEND_API_KEY`, `LINK_SIGNING_SECRET`,
  `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`) and **Variables** (non-sensitive:
  `GMAIL_USER`, `APP_TIMEZONE`, `API_PUBLIC_URL`, `NOTIFY_EMAIL`,
  `RESEND_FROM_EMAIL`) — Settings → Secrets and variables → Actions, two
  separate tabs. Mixing these up (or assuming a Render dashboard value
  reaches the cron) is a repeat mistake.

**`LINK_SIGNING_SECRET` must be byte-identical on both Render and GitHub
Actions** — the API verifies tap-to-take tokens the sweep signs. A mismatch
fails silently as "expired link," not an obvious auth error.

Notification transport priority (see `packages/sweep/src/emailSender.ts`):
Gmail SMTP (`GMAIL_USER`/`GMAIL_APP_PASSWORD` — free, sends to anyone) →
Resend (`RESEND_API_KEY` — sandboxed to your own address until a domain is
verified) → Telegram (legacy fallback) → console. `EmailSender` and
`Notifier` are the seams; a new transport is a new class implementing one of
those interfaces, not a change to `sweep.ts`'s reminder/missed/taken logic.

## Conventions

- **Branches**: `feat/`, `fix/`, `chore/` prefixes with a short slug (e.g.
  `feat/tap-to-take-link`). `PLAN.md`'s original `mr-<n>-<slug>` scheme is
  historical — current work uses the prefix style.
- **Commits**: explain *why*, not just what; multi-paragraph bodies are
  normal here. End with `Co-Authored-By: Claude <model> <noreply@anthropic.com>`.
- **PRs**: What / Changes / Notes sections (what problem + why it matters,
  one bullet per file, anything worth flagging for the reviewer). Only
  include a Notes section if there's something genuinely worth flagging.
- **`gh` CLI**: this repo's collaborator account is `saywhat36`. If a `gh pr
  create`/`gh pr edit` fails with a permissions error, the active `gh`
  account has probably drifted — run
  `gh auth switch --hostname github.com --user saywhat36` first.
- Ignore `SQLite is an experimental feature` and the `pg` SSL-mode deprecation
  warning in logs — both are noise, not errors.

## Two dashboard views, one feature set

Classic view is the default; the apothecary shop view
(`packages/web/src/components/shop/`) is opt-in via a `localStorage` toggle
(`medication-tracker:view`, key defaults to `'classic'` for anything not
exactly `'shop'` — see `view.ts`). Both share the same data and API calls;
neither is a fallback being phased out as of this writing — check with the
user before assuming one direction over the other. Dashboard features
(add/edit medication, tick a dose) exist in both views today; keep it that
way rather than letting one drift ahead.
