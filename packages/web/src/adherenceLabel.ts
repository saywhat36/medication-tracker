// Adherence streak/percentage wording. Shared by the classic view's
// AdherenceList and the shop view's REMEMBER note so the two views can never
// disagree about the text.

// "5-day streak", or "No streak yet" once a streak breaks (currentStreakDays
// is 0 both for "never had a streak" and "streak just broke" — the data
// doesn't distinguish the two, so neither does the label).
export function streakLabel(currentStreakDays: number): string {
  return currentStreakDays > 0 ? `${currentStreakDays}-day streak` : 'No streak yet';
}

// "90% of doses taken (last 30 days)". adherencePercentage is null when
// scheduledCount is 0 (no doses scheduled yet in the window) — never render
// that as "0%" or "NaN%".
export function adherenceSummary(adherencePercentage: number | null, windowDays: number): string {
  return adherencePercentage === null
    ? 'No data yet'
    : `${adherencePercentage}% of doses taken (last ${windowDays} days)`;
}
