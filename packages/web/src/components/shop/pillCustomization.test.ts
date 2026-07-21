import { describe, expect, it } from 'vitest';
import { withPillCustomization } from './pillCustomization';

describe('withPillCustomization', () => {
  it('creates an array padded with empty customizations up to the given index', () => {
    const result = withPillCustomization(undefined, 2, { emoji: '💊' });
    expect(result).toEqual([{}, {}, { emoji: '💊' }]);
  });

  it('merges the patch into an existing customization at that index, leaving others untouched', () => {
    const existing = [{ emoji: '⭐' }, { textLabel: 'evening' }];
    const result = withPillCustomization(existing, 0, { textLabel: 'morning' });
    expect(result).toEqual([{ emoji: '⭐', textLabel: 'morning' }, { textLabel: 'evening' }]);
  });

  it('does not mutate the array passed in', () => {
    const existing = [{ emoji: '⭐' }];
    withPillCustomization(existing, 0, { textLabel: 'morning' });
    expect(existing).toEqual([{ emoji: '⭐' }]);
  });

  it('can clear a field by patching it to undefined', () => {
    const existing = [{ emoji: '⭐', textLabel: 'morning' }];
    const result = withPillCustomization(existing, 0, { emoji: undefined, textLabel: undefined });
    expect(result[0]).toEqual({ emoji: undefined, textLabel: undefined });
  });
});
