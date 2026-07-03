import { describe, expect, it } from 'vitest';
import { isValidEmail, parseEmailList } from './email.js';

describe('isValidEmail', () => {
  it('should accept plausible addresses', () => {
    expect(isValidEmail('sarah@example.com')).toBe(true);
    expect(isValidEmail('  gavin@family.co.uk  ')).toBe(true);
  });

  it('should reject obvious typos', () => {
    expect(isValidEmail('sarah@')).toBe(false);
    expect(isValidEmail('sarah.example.com')).toBe(false);
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('sarah @example.com')).toBe(false);
  });
});

describe('parseEmailList', () => {
  it('should split, trim, and keep only valid addresses', () => {
    expect(parseEmailList('gavin@family.co.uk, mum@family.co.uk')).toEqual([
      'gavin@family.co.uk',
      'mum@family.co.uk',
    ]);
  });

  it('should drop blanks and invalid entries', () => {
    expect(parseEmailList('gavin@family.co.uk, , not-an-email, mum@family.co.uk')).toEqual([
      'gavin@family.co.uk',
      'mum@family.co.uk',
    ]);
  });

  it('should return an empty array for an empty string', () => {
    expect(parseEmailList('')).toEqual([]);
    expect(parseEmailList('   ')).toEqual([]);
  });
});
