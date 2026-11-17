import { describe, expect, it } from 'vitest';
import { readXsrfToken } from './HubApi';

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
