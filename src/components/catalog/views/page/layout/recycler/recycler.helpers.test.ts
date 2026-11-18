import { describe, expect, it } from 'vitest';
import { normalizeRecyclerSlotCount } from './recycler.helpers';

describe('recycler helpers', () => {
    it('bounds configuration before creating slots', () => {
        expect(normalizeRecyclerSlotCount(5)).toBe(5);
        expect(normalizeRecyclerSlotCount(99)).toBe(12);
        expect(normalizeRecyclerSlotCount('invalid')).toBe(8);
    });
});
