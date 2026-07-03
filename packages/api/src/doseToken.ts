import { createHmac, timingSafeEqual } from 'node:crypto';

// A signed, self-contained token identifying one dose and when it expires —
// carries no server-side state, so the tap-to-take link in a reminder email
// works without the recipient ever logging in. Format:
//   base64url(medicationId|scheduledFor|expiresAtMs).base64url(hmac-sha256)
const SEPARATOR = '.';

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function signDoseToken(
  medicationId: string,
  scheduledFor: string,
  expiresAtMs: number,
  secret: string
): string {
  const payload = `${medicationId}|${scheduledFor}|${expiresAtMs}`;
  const encoded = Buffer.from(payload, 'utf8').toString('base64url');
  return `${encoded}${SEPARATOR}${sign(encoded, secret)}`;
}

export interface DoseTokenPayload {
  medicationId: string;
  scheduledFor: string;
}

// Returns the identified dose if the token's signature is valid and it
// hasn't expired, otherwise null. Never throws on malformed input.
export function verifyDoseToken(
  token: string,
  secret: string,
  now: number = Date.now()
): DoseTokenPayload | null {
  const separatorIndex = token.indexOf(SEPARATOR);
  if (separatorIndex === -1) return null;
  const encoded = token.slice(0, separatorIndex);
  const providedSignature = token.slice(separatorIndex + 1);

  const expectedSignature = sign(encoded, secret);
  const expected = Buffer.from(expectedSignature);
  const provided = Buffer.from(providedSignature);
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    return null;
  }

  let payload: string;
  try {
    payload = Buffer.from(encoded, 'base64url').toString('utf8');
  } catch {
    return null;
  }
  const parts = payload.split('|');
  if (parts.length !== 3) return null;
  const [medicationId, scheduledFor, expiresAtStr] = parts;
  const expiresAtMs = Number(expiresAtStr);
  if (!medicationId || !scheduledFor || !Number.isFinite(expiresAtMs)) return null;
  if (now > expiresAtMs) return null;

  return { medicationId, scheduledFor };
}
