import { beforeEach, describe, expect, it } from 'vitest';
import { FavoriteSong, isFavorite, readFavorites, safeLink, saveFavorites, toggleFavorite } from './roomStreamFavorites';

const song = (n: number): FavoriteSong => ({ url: `https://example.com/${n}`, kind: 'stream', title: `Song ${n}`, artist: 'Artist' });

beforeEach(() => window.localStorage.clear());

describe('roomStreamFavorites', () => {
    it('adds a song to the front and removes it when toggled again', () => {
        const added = toggleFavorite(toggleFavorite([], song(1)), song(2));

        expect(added.map((entry) => entry.title)).toEqual(['Song 2', 'Song 1']);
        expect(isFavorite(added, 'https://example.com/1')).toBe(true);
        expect(toggleFavorite(added, song(1)).map((entry) => entry.title)).toEqual(['Song 2']);
    });

    it('keeps at most 50 songs and drops the oldest', () => {
        const favorites = Array.from({ length: 55 }, (_, index) => song(index)).reduce((list, entry) => toggleFavorite(list, entry), [] as FavoriteSong[]);

        expect(favorites).toHaveLength(50);
        expect(favorites[0].title).toBe('Song 54');
        expect(isFavorite(favorites, 'https://example.com/0')).toBe(false);
    });

    it('saves and reads the list back', () => {
        saveFavorites([song(1)]);

        expect(readFavorites()).toEqual([song(1)]);
    });

    it('ignores saved entries that are damaged', () => {
        window.localStorage.setItem('room-stream-favorites', JSON.stringify([song(1), { url: 5 }, null, { ...song(2), kind: 'other' }]));

        expect(readFavorites()).toEqual([song(1)]);

        window.localStorage.setItem('room-stream-favorites', 'not json');

        expect(readFavorites()).toEqual([]);
    });

    it('only opens web links', () => {
        expect(safeLink('https://example.com/a')).toBe('https://example.com/a');
        expect(safeLink('javascript:alert(1)')).toBeNull();
        expect(safeLink('nonsense')).toBeNull();
    });
});
