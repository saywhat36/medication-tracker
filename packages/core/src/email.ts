// A loose format check, not full RFC 5322 validation — this app is trusting
// people to type their own address correctly; the goal is just to catch
// obvious typos before they end up silently in the database.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

// Parse a comma-separated list of addresses (as typed into a single input),
// trimming whitespace and dropping anything blank or invalid.
export function parseEmailList(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && isValidEmail(s));
}
