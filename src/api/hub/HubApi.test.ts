import { afterEach, describe, expect, it, vi } from 'vitest';
import { readXsrfToken, searchHubValues } from './HubApi';

vi.mock('@volt/renderer', () => ({
    GetConfiguration: () => {
        throw new Error('not loaded');
    }
}));

describe('readXsrfToken', () => {
    it('decodes the cookie value', () => {
        expect(readXsrfToken('a=1; XSRF-TOKEN=abc%3D%3D; b=2')).toBe('abc==');
    });

    it('returns an empty string when the cookie is missing', () => {
        expect(readXsrfToken('a=1')).toBe('');
    });

    it('does not match a cookie that only ends with the name', () => {
        expect(readXsrfToken('NOT-XSRF-TOKEN=nope')).toBe('');
    });
});

describe('searchHubValues', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('encodes the search term and returns the results', async () => {
        const fetchMock = vi.fn().mockResolvedValue({ status: 200, text: async () => JSON.stringify({ results: [{ name: 'Dragon Lamp', credits: '5', other: null, other_label: null }] }) });

        vi.stubGlobal('fetch', fetchMock);

        const results = await searchHubValues('dragon lamp');

        expect(fetchMock.mock.calls[0][0]).toContain('/values?q=dragon%20lamp');
        expect(results[0].name).toBe('Dragon Lamp');
    });

    it('throws when the hotel answers with an error', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 401, text: async () => '' }));

        await expect(searchHubValues('dragon')).rejects.toThrow('hub_401');
    });
});
