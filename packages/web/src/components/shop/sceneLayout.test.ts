import { describe, expect, it } from 'vitest';
import { sceneLayout, shelfRows } from './sceneLayout.js';

describe('sceneLayout', () => {
  it('should put the window to the right of the cabinet on desktop', () => {
    const l = sceneLayout(3, false);
    expect(l.width).toBe(680);
    expect(l.windowBox.x).toBeGreaterThan(l.cabinet.x + l.cabinet.w);
  });

  it('should stack the window below the cabinet when compact', () => {
    const l = sceneLayout(3, true);
    expect(l.width).toBe(380);
    expect(l.windowBox.y).toBeGreaterThanOrEqual(l.cabinet.baseY);
  });

  it('should always show at least two shelves', () => {
    expect(sceneLayout(0, false).shelfYs).toHaveLength(2);
    expect(sceneLayout(1, false).shelfYs).toHaveLength(2);
  });

  it('should add shelves as the stock grows', () => {
    expect(sceneLayout(4, false).shelfYs).toHaveLength(2); // still fits min-2
    expect(sceneLayout(9, false).shelfYs).toHaveLength(3); // ceil(9/4)
    expect(sceneLayout(13, false).shelfYs).toHaveLength(4);
  });

  it('should grow the scene height with more shelves', () => {
    expect(sceneLayout(13, false).height).toBeGreaterThan(sceneLayout(3, false).height);
  });

  it('should keep the interior inside the cabinet frame', () => {
    const l = sceneLayout(3, false);
    expect(l.interiorX).toBeGreaterThan(l.cabinet.x);
    expect(l.interiorX + l.interiorW).toBeLessThan(l.cabinet.x + l.cabinet.w);
  });

  it('should sit the table at the cabinet base on desktop', () => {
    const l = sceneLayout(3, false);
    expect(l.tableY).toBe(l.cabinet.baseY);
  });
});

describe('shelfRows', () => {
  it('should chunk bottles top-first into rows of perShelf', () => {
    expect(shelfRows([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('should return no rows for an empty shelf', () => {
    expect(shelfRows([], 4)).toEqual([]);
  });
});
