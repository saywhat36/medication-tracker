import { describe, it, expect } from 'vitest';
import { signDoseToken, verifyDoseToken } from './doseToken.js';

const SECRET = 'test-secret';
const MED_ID = 'med-1';
const SCHEDULED_FOR = '2026-06-25T08:00:00Z';
const FUTURE_EXPIRY = Date.parse('2026-06-30T00:00:00Z');
const NOW = Date.parse('2026-06-25T12:00:00Z');

describe('signDoseToken / verifyDoseToken', () => {
  it('round-trips a valid token back to the same dose', () => {
    const token = signDoseToken(MED_ID, SCHEDULED_FOR, FUTURE_EXPIRY, SECRET);
    const result = verifyDoseToken(token, SECRET, NOW);
    expect(result).toEqual({ medicationId: MED_ID, scheduledFor: SCHEDULED_FOR });
  });

  it('rejects a token verified with the wrong secret', () => {
    const token = signDoseToken(MED_ID, SCHEDULED_FOR, FUTURE_EXPIRY, SECRET);
    expect(verifyDoseToken(token, 'wrong-secret', NOW)).toBeNull();
  });

  it('rejects an expired token', () => {
    const pastExpiry = Date.parse('2026-06-25T00:00:00Z'); // before NOW
    const token = signDoseToken(MED_ID, SCHEDULED_FOR, pastExpiry, SECRET);
    expect(verifyDoseToken(token, SECRET, NOW)).toBeNull();
  });

  it('accepts a token exactly at its expiry instant', () => {
    const token = signDoseToken(MED_ID, SCHEDULED_FOR, NOW, SECRET);
    expect(verifyDoseToken(token, SECRET, NOW)).not.toBeNull();
  });

  it('rejects a token with a tampered payload', () => {
    const token = signDoseToken(MED_ID, SCHEDULED_FOR, FUTURE_EXPIRY, SECRET);
    const [, signature] = token.split('.');
    const tamperedPayload = Buffer.from('med-2|2026-06-25T08:00:00Z|' + FUTURE_EXPIRY, 'utf8').toString(
      'base64url'
    );
    const tampered = `${tamperedPayload}.${signature}`;
    expect(verifyDoseToken(tampered, SECRET, NOW)).toBeNull();
  });

  it('rejects a token with a tampered signature', () => {
    const token = signDoseToken(MED_ID, SCHEDULED_FOR, FUTURE_EXPIRY, SECRET);
    const [encoded] = token.split('.');
    expect(verifyDoseToken(`${encoded}.notarealsignature`, SECRET, NOW)).toBeNull();
  });

  it('rejects malformed tokens without throwing', () => {
    expect(verifyDoseToken('', SECRET, NOW)).toBeNull();
    expect(verifyDoseToken('no-separator-here', SECRET, NOW)).toBeNull();
    expect(verifyDoseToken('.', SECRET, NOW)).toBeNull();
    expect(verifyDoseToken('not-base64!!!.sig', SECRET, NOW)).toBeNull();
  });

  it('produces different tokens for different doses', () => {
    const a = signDoseToken('med-1', SCHEDULED_FOR, FUTURE_EXPIRY, SECRET);
    const b = signDoseToken('med-2', SCHEDULED_FOR, FUTURE_EXPIRY, SECRET);
    expect(a).not.toBe(b);
  });
});
