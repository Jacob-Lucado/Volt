import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setRoomStreamPlayback } from '../room-stream/roomStreamPlayback';
import { VideoScreenWidgetView } from './VideoScreenWidgetView';

const state = vi.hoisted(() => ({
    objects: [] as { id: number; type: string }[],
    handler: null as ((event: unknown) => void) | null,
    sent: [] as unknown[]
}));

vi.mock('@volt/renderer', async (importOriginal) => ({
    ...(await importOriginal<object>()),
    GetRoomEngine: () => ({ getRoomObjects: () => state.objects })
}));
vi.mock('../../../../hooks', () => ({
    useRoom: () => ({ roomSession: { roomId: 5 } }),
    useMessageEvent: (_event: unknown, handler: (event: unknown) => void) => {
        state.handler = handler;
    }
}));
vi.mock('../../../../api', () => ({
    SendMessageComposer: (composer: unknown) => state.sent.push(composer),
    GetRoomObjectBounds: () => ({ left: 100, top: 50, width: 400, height: 250 }),
    AddAnimationTickerCallback: () => () => undefined
}));

const tell = (furniId: number, videoId: string) => act(async () => state.handler?.({ getParser: () => ({ furniId, videoId }) }));

beforeEach(() => {
    window.localStorage.clear();
});

afterEach(() => {
    cleanup();
    setRoomStreamPlayback(null);
    state.objects = [];
    state.handler = null;
    state.sent = [];
});

describe('VideoScreenWidgetView', () => {
    it('asks the server once what each Video Screen shows', async () => {
        state.objects = [
            { id: 7, type: 'ads_videoplayer' },
            { id: 8, type: 'chair' }
        ];

        render(<VideoScreenWidgetView />);

        expect(state.sent).toHaveLength(1);
        expect(state.sent[0]).toMatchObject({ objectId: 7 });
    });

    it('plays a screen its own video at the room music volume', async () => {
        state.objects = [{ id: 7, type: 'ads_videoplayer' }];

        const { container } = render(<VideoScreenWidgetView />);

        await tell(7, 'dQw4w9WgXcQ');

        const frame = container.querySelector('iframe');

        expect(frame.getAttribute('src')).toContain('/embed/dQw4w9WgXcQ');
        expect(frame.getAttribute('src')).not.toContain('mute=1');
    });

    it('shows the room music video muted when the screen follows the music', async () => {
        state.objects = [{ id: 7, type: 'ads_videoplayer' }];
        setRoomStreamPlayback({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', kind: 'youtube', title: 'Song', artist: '', artwork: null, paused: false });

        const { container } = render(<VideoScreenWidgetView />);

        await tell(7, '@music');

        expect(container.querySelector('iframe').getAttribute('src')).toContain('mute=1');
    });

    it('shows the song card when the music has no video', async () => {
        state.objects = [{ id: 7, type: 'ads_videoplayer' }];
        setRoomStreamPlayback({ url: 'https://soundcloud.com/a/b', kind: 'soundcloud', title: 'Crazy in Love', artist: 'Beyonce', artwork: null, paused: false });

        const { container, getByText } = render(<VideoScreenWidgetView />);

        await tell(7, '@music');

        expect(container.querySelector('iframe')).toBeNull();
        expect(getByText('Crazy in Love')).toBeTruthy();
        expect(getByText('Beyonce')).toBeTruthy();
    });

    it('shows nothing when the screen is off', async () => {
        state.objects = [{ id: 7, type: 'ads_videoplayer' }];

        const { container } = render(<VideoScreenWidgetView />);

        await tell(7, '');

        expect(container.querySelector('iframe')).toBeNull();
        expect(container.querySelector('.volt-video-screen__card')).toBeNull();
    });
});
