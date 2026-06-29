// Timezone helpers. The app treats medication schedule times as wall-clock times
// in a single configured timezone (e.g. "13:00" means 1pm in Europe/London), but
// stores each dose as a true UTC instant. These helpers convert between the two.
//
// Implemented with Intl (no dependencies) so the core package stays pure.

// Offset (ms) of a timezone at a given UTC instant: localWallClock - utc.
function tzOffsetMs(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(utcMs));

  const part: Record<string, number> = {};
  for (const p of parts) {
    if (p.type !== 'literal') part[p.type] = Number(p.value);
  }
  const asUtc = Date.UTC(
    part['year'],
    part['month'] - 1,
    part['day'],
    part['hour'],
    part['minute'],
    part['second']
  );
  return asUtc - utcMs;
}

// The UTC instant (ISO, seconds precision) whose wall-clock time in `timeZone`
// is the given local date and time. e.g. ("2026-06-28","13:00","Europe/London")
// -> "2026-06-28T12:00:00Z" in summer (BST, +1).
export function zonedTimeToUtc(date: string, time: string, timeZone: string): string {
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  const naiveUtcMs = Date.UTC(y, mo - 1, d, h, mi, 0);

  // The offset can depend on the instant (DST), so approximate then correct once.
  const offset1 = tzOffsetMs(naiveUtcMs, timeZone);
  let utcMs = naiveUtcMs - offset1;
  const offset2 = tzOffsetMs(utcMs, timeZone);
  if (offset2 !== offset1) utcMs = naiveUtcMs - offset2;

  return new Date(utcMs).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

// The wall-clock time (HH:MM) of a UTC instant in the given timezone.
export function formatInZone(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso));
}

// The calendar date (YYYY-MM-DD) of a UTC instant in the given timezone.
export function dateInZone(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
}
