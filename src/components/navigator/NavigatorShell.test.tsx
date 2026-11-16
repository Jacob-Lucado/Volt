import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
const view = read('src/components/navigator/NavigatorView.tsx');
const shell = read('src/components/navigator/lucado/LosNavigatorWindow.tsx');

describe('navigator shell', () => {
    it('opens the LucadoOS navigator window', () => {
        expect(view).toContain('<LosNavigatorWindow');
        expect(view).toContain('showSaved={isOpenSavesSearches}');
    });

    it('exposes a collapsible quick-links navigation beside the room list', () => {
        expect(shell).toContain('handleSelector=".los-window__bar"');
        expect(shell).toContain('aria-pressed={showSaved}');
        expect(shell).toContain('className="los-navigator__saved los-scroll"');
        expect(shell).toContain('role="tablist"');
    });
});
