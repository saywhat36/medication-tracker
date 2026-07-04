# medication-tracker

A personal medication-tracking app. Tracks pills remaining, daily doses, and scheduled dose times — computes when a refill is needed and alerts you if a dose goes untaken.

## Status

Work in progress. [PLAN.md](./PLAN.md) is the original build plan (mostly
complete); [SCOPE.md](./SCOPE.md) says what the app currently is/isn't;
[CLAUDE.md](./CLAUDE.md) is the operational guide for AI-assisted
contributions (architecture invariants, verification steps, deploy/env var
conventions); [DEPLOY.md](./DEPLOY.md) covers hosting the API on Render.

## Getting started

```bash
npm install
npm test          # run tests
npm run typecheck # TypeScript type check
npm run lint      # ESLint
```

## Structure

```
packages/
  core/    # pure domain logic + types (no I/O)
  api/     # Express server + SQLite repository
  web/     # React frontend (Vite)
  sweep/   # notification sweep + scheduler
```
