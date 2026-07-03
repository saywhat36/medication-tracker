import { describe, expect, it } from 'vitest';
import { skyPalettes, skyPhaseForHour } from './skyPhase.js';

describe('skyPhaseForHour', () => {
  it('should be dawn from 05:00 to 07:59', () => {
    expect(skyPhaseForHour(5)).toBe('dawn');
    expect(skyPhaseForHour(7)).toBe('dawn');
  });

  it('should be day from 08:00 to 16:59', () => {
    expect(skyPhaseForHour(8)).toBe('day');
    expect(skyPhaseForHour(12)).toBe('day');
    expect(skyPhaseForHour(16)).toBe('day');
  });

  it('should be dusk from 17:00 to 19:59', () => {
    expect(skyPhaseForHour(17)).toBe('dusk');
    expect(skyPhaseForHour(19)).toBe('dusk');
  });

  it('should be night from 20:00 through to 04:59', () => {
    expect(skyPhaseForHour(20)).toBe('night');
    expect(skyPhaseForHour(23)).toBe('night');
    expect(skyPhaseForHour(0)).toBe('night');
    expect(skyPhaseForHour(4)).toBe('night');
  });

  it('should only show stars at night', () => {
    expect(skyPalettes.night.stars).toBe(true);
    expect(skyPalettes.day.stars).toBe(false);
    expect(skyPalettes.dusk.stars).toBe(false);
    expect(skyPalettes.dawn.stars).toBe(false);
  });

  it('should hide garden flowers after dark', () => {
    expect(skyPalettes.night.flowers).toBe(false);
    expect(skyPalettes.day.flowers).toBe(true);
  });
});
