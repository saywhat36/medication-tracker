import { describe, expect, it } from 'vitest';
import { refillUrgency, urgencyRank } from './refillUrgency.js';

describe('refillUrgency', () => {
  it('should be out when there are no days of supply left, regardless of the deadline', () => {
    expect(refillUrgency(5, 0)).toBe('out');
    expect(refillUrgency(-3, -2)).toBe('out');
  });

  it('should be reorder-now once the reorder deadline has passed but pills remain', () => {
    expect(refillUrgency(0, 3)).toBe('reorder-now');
    expect(refillUrgency(-1, 4)).toBe('reorder-now');
  });

  it('should be order-soon within a week of the reorder deadline', () => {
    expect(refillUrgency(1, 8)).toBe('order-soon');
    expect(refillUrgency(7, 14)).toBe('order-soon');
  });

  it('should be ok with more than a week until the reorder deadline', () => {
    expect(refillUrgency(8, 15)).toBe('ok');
    expect(refillUrgency(23, 30)).toBe('ok');
  });

  it('should rank urgencies from most to least urgent', () => {
    expect(urgencyRank.out).toBeLessThan(urgencyRank['reorder-now']);
    expect(urgencyRank['reorder-now']).toBeLessThan(urgencyRank['order-soon']);
    expect(urgencyRank['order-soon']).toBeLessThan(urgencyRank.ok);
  });
});
