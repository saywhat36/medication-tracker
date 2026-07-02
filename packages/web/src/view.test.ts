import { describe, expect, it } from 'vitest';
import { parseViewMode } from './view.js';

describe('parseViewMode', () => {
  it('should return shop when the stored value is shop', () => {
    expect(parseViewMode('shop')).toBe('shop');
  });

  it('should return classic when the stored value is classic', () => {
    expect(parseViewMode('classic')).toBe('classic');
  });

  it('should default to classic when nothing is stored', () => {
    expect(parseViewMode(null)).toBe('classic');
  });

  it('should default to classic for unrecognised values', () => {
    expect(parseViewMode('garbage')).toBe('classic');
    expect(parseViewMode('')).toBe('classic');
    expect(parseViewMode('SHOP')).toBe('classic');
  });
});
