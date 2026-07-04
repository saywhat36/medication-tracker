# SCOPE.md

What this app currently is and isn't. `PLAN.md` is the historical build
log — some of its original scope boundaries have since been deliberately
revised as the project grew (e.g. "no auth" was true for Phase 1's local-only
app, then reversed once the API went public in Phase 2). This file reflects
*current* scope; update it when scope actually changes, not PLAN.md.

## What it is

A single-user, single-person medication tracker:

- Track medications, pills remaining, and dose schedule; compute refill dates
- Tick doses taken/untaken for today; history persists
- Two dashboard views sharing one feature set — classic (default) and an
  apothecary-themed shop view (opt-in, `localStorage` toggle)
- Notifications for a due, missed, or taken dose, and for an approaching
  refill — delivered by email (Gmail SMTP preferred, Resend as a fallback
  that needs a verified domain to reach anyone but you, Telegram as a legacy
  fallback), via an hourly GitHub Actions sweep
- Optional **recipient** (who the medication is for) and **companion**
  (who else wants to know) email addresses per medication, with differently
  worded messages for each audience
- A signed "tap to mark as taken" link in reminder/missed emails — no login,
  works from a phone lock screen — visible only to the recipient, never to
  companions (marking a dose taken is the recipient's action, not something
  a companion should be able to do to someone else's record)

## Explicit non-goals (for now)

- **No multi-user accounts.** Recipient/companion are just email addresses
  attached to a medication, not user identities — there's no login, no
  per-person data, no way for a companion to see or act on anything beyond
  what's in their notification email.
- **No native mobile app.** The tap-to-take link is the deliberate answer to
  "a simpler way to tick a dose on the move," chosen specifically to avoid
  building one.
- **Telegram is legacy, not a channel to build on.** It stays wired up as a
  fallback for anyone who hasn't configured email; new notification work
  should assume email.
- **No requirement to buy anything.** Gmail SMTP exists specifically so
  companion notifications work without a paid domain. Don't reintroduce a
  hard dependency on Resend's sandbox-lifted (paid-adjacent) mode as the only
  path.

## Ideas raised but not committed

Discussed, not scheduled — don't assume any of these are "next" without
asking:

- **Adherence streaks / weekly history** — "you took every dose N days in a
  row," using existing `Dose.takenAt` data. Would need a new repository
  method (`getDosesInRange` or similar) across all three backends — see
  CLAUDE.md's three-backend rule.
- Weekly digest email summarising the week's adherence
- Full Telegram removal, once email has been trusted for a while
