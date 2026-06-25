# medication-tracker

A personal medication-tracking app. Tracks pills remaining, daily doses, and scheduled dose times — computes when a refill is needed and alerts you if a dose goes untaken.

## Status

Work in progress — see [PLAN.md](./PLAN.md) for the build plan.

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
