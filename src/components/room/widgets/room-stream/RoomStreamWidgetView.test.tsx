import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RoomStreamWidgetView } from './RoomStreamWidgetView';

const state = vi.hoisted(() => ({
    stream: null,
    roomSession: { isRoomOwner: true, controllerLevel: 4, sendChatMessage: (text: string) => state.chat.push(text) } as {
        isRoomOwner: boolean;
        controllerLevel: number;
        sendChatMessage: (text: string) => void;
    } | null,
    chat: [] as string[],
    sent: [] as unknown[]
}));

vi.mock('../../../../hooks', () => ({
    useRoom: () => ({ roomSession: state.roomSession }),
    useRoomStreamWidget: () => ({ stream: state.stream })
}));
vi.mock('../../../../api', () => ({ SendMessageComposer: (composer: unknown) => state.sent.push(composer) }));

beforeEach(() => {
    window.localStorage.clear();
    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.pause = vi.fn();
});

afterEach(() => {
    cleanup();
    delete window.SC;
    delete window.YT;
    state.stream = null;
    state.roomSession = { isRoomOwner: true, controllerLevel: 4, sendChatMessage: (text: string) => state.chat.push(text) };
    state.chat = [];
    state.sent = [];
});

describe('RoomStreamWidgetView', () => {
    it('shows nothing without a stream', () => {
        const { container } = render(<RoomStreamWidgetView />);

        expect(container.firstChild).toBeNull();
    });

    it('plays a direct stream through an audio element', () => {
        state.stream = { roomId: 1, kind: 'stream', url: 'https://radio.example.com/live.mp3', setBy: 'Jacob', token: 1, queued: 0 };

        const { container, getByText } = render(<RoomStreamWidgetView />);

        expect(container.querySelector('audio').getAttribute('src')).toBe('https://radio.example.com/live.mp3');
        expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled();
        expect(getByText('radio.example.com')).toBeTruthy();
        expect(getByText('Started by Jacob')).toBeTruthy();
    });

    it('plays a SoundCloud link in a SoundCloud player', () => {
        state.stream = { roomId: 1, kind: 'soundcloud', url: 'https://soundcloud.com/artist/song', setBy: 'Jacob', token: 1, queued: 0 };

        const { container } = render(<RoomStreamWidgetView />);
        const source = container.querySelector('iframe').getAttribute('src');

        expect(source.startsWith('https://w.soundcloud.com/player/?url=')).toBe(true);
        expect(source).toContain(encodeURIComponent('https://soundcloud.com/artist/song'));
        expect(container.querySelector('audio')).toBeNull();
    });

    it('lets a person turn the music off for themselves and back on', () => {
        state.stream = { roomId: 1, kind: 'stream', url: 'https://radio.example.com/live.mp3', setBy: 'Jacob', token: 1, queued: 0 };

        const { container, getByLabelText, getByText, queryByLabelText } = render(<RoomStreamWidgetView />);

        fireEvent.click(getByLabelText('Turn the room music off for me'));

        expect(container.querySelector('audio')).toBeNull();
        expect(getByText('Music is off for you')).toBeTruthy();
        expect(getByText('radio.example.com')).toBeTruthy();
        expect(queryByLabelText('Song position')).toBeNull();

        fireEvent.click(getByText('Turn on'));

        expect(container.querySelector('audio')).not.toBeNull();
    });

    it('saves the song to the favorites with the heart and keeps it for next time', () => {
        state.stream = { roomId: 1, kind: 'stream', url: 'https://radio.example.com/live.mp3', setBy: 'Jacob', token: 1, queued: 0 };

        const first = render(<RoomStreamWidgetView />);

        fireEvent.click(first.getByLabelText('Save this song to my favorites'));

        expect(first.getByLabelText('Remove this song from my favorites').getAttribute('aria-pressed')).toBe('true');
        expect(first.getByText('Favorites (1)')).toBeTruthy();

        first.unmount();

        const second = render(<RoomStreamWidgetView />);

        expect(second.getByText('Favorites (1)')).toBeTruthy();
        expect(second.getByLabelText('Remove this song from my favorites')).toBeTruthy();
    });

    it('lists the favorites with a link and lets a person remove one', () => {
        window.localStorage.setItem(
            'room-stream-favorites',
            JSON.stringify([
                { url: 'https://example.com/a', kind: 'stream', title: 'Song A', artist: 'Band' },
                { url: 'javascript:alert(1)', kind: 'stream', title: 'Bad', artist: '' }
            ])
        );
        state.stream = { roomId: 1, kind: 'stream', url: 'https://radio.example.com/live.mp3', setBy: 'Jacob', token: 1, queued: 0 };

        const { getByText, getByLabelText, queryByText, getAllByText } = render(<RoomStreamWidgetView />);

        fireEvent.click(getByText('Favorites (2)'));

        expect(getByText('Song A')).toBeTruthy();
        expect(getAllByText('Open')).toHaveLength(1);
        expect(getAllByText('Open')[0].getAttribute('href')).toBe('https://example.com/a');

        fireEvent.click(getByLabelText('Remove Song A from my favorites'));

        expect(queryByText('Song A')).toBeNull();
        expect(getByText('Favorites (1)')).toBeTruthy();
    });

    it('can save the song from the chip while the music is off', () => {
        state.stream = { roomId: 1, kind: 'stream', url: 'https://radio.example.com/live.mp3', setBy: 'Jacob', token: 1, queued: 0 };

        const { getByLabelText, getByText } = render(<RoomStreamWidgetView />);

        fireEvent.click(getByLabelText('Turn the room music off for me'));
        fireEvent.click(getByLabelText('Save this song to my favorites'));

        expect(getByText('Favorites (1)')).toBeTruthy();
    });

    it('asks for a tap when the browser blocks autoplay', async () => {
        window.HTMLMediaElement.prototype.play = vi.fn().mockRejectedValue(new Error('blocked'));
        state.stream = { roomId: 1, kind: 'stream', url: 'https://radio.example.com/live.mp3', setBy: 'Jacob', token: 1, queued: 0 };

        const { findByText } = render(<RoomStreamWidgetView />);

        expect(await findByText('Press play to listen')).toBeTruthy();
    });

    it('shows the artwork, title and artist of the SoundCloud track', async () => {
        const handlers: Record<string, (data?: unknown) => void> = {};
        const widget = {
            bind: (event: string, callback: (data?: unknown) => void) => {
                handlers[event] = callback;
            },
            play: vi.fn(),
            pause: vi.fn(),
            setVolume: vi.fn(),
            seekTo: vi.fn(),
            getCurrentSound: (callback: (sound: unknown) => void) =>
                callback({ title: 'Flickermood', duration: 185000, artwork_url: 'https://i1.sndcdn.com/artworks-abc-large.jpg', user: { username: 'Forss' } })
        };

        window.SC = Object.assign(() => widget, {
            Widget: Object.assign(() => widget, { Events: { READY: 'ready', PLAY: 'play', PLAY_PROGRESS: 'progress', FINISH: 'finish' } })
        });
        state.stream = { roomId: 1, kind: 'soundcloud', url: 'https://soundcloud.com/forss/flickermood', setBy: 'Jacob', token: 1, queued: 0 };

        const { container, findByText, getByLabelText } = render(<RoomStreamWidgetView />);

        await act(async () => {
            await Promise.resolve();
        });
        await act(async () => {
            handlers.ready();
            handlers.progress({ currentPosition: 65000 });
        });

        expect(await findByText('Flickermood')).toBeTruthy();
        expect(await findByText('Forss')).toBeTruthy();
        expect(container.querySelector('img').getAttribute('src')).toBe('https://i1.sndcdn.com/artworks-abc-t200x200.jpg');
        expect(await findByText('1:05')).toBeTruthy();
        expect(await findByText('3:05')).toBeTruthy();

        fireEvent.change(getByLabelText('Song position'), { target: { value: '100' } });

        expect(widget.seekTo).toHaveBeenCalledWith(100000);
    });

    it('names a stream file and shows how far along it is', () => {
        state.stream = { roomId: 1, kind: 'stream', url: 'https://cdn.example.com/music/night-drive.mp3', setBy: 'Jacob', token: 1, queued: 0 };

        const { container, getByText } = render(<RoomStreamWidgetView />);
        const audio = container.querySelector('audio');

        Object.defineProperty(audio, 'duration', { configurable: true, value: 200 });
        Object.defineProperty(audio, 'currentTime', { configurable: true, writable: true, value: 30 });
        fireEvent.loadedMetadata(audio);

        expect(getByText('night drive')).toBeTruthy();
        expect(getByText('cdn.example.com')).toBeTruthy();
        expect(getByText('0:30')).toBeTruthy();
        expect(getByText('3:20')).toBeTruthy();
    });

    it('marks an endless stream as live', () => {
        state.stream = { roomId: 1, kind: 'stream', url: 'https://radio.example.com/live.mp3', setBy: 'Jacob', token: 1, queued: 0 };

        const { container, getAllByText } = render(<RoomStreamWidgetView />);
        const audio = container.querySelector('audio');

        Object.defineProperty(audio, 'duration', { configurable: true, value: Infinity });
        Object.defineProperty(audio, 'currentTime', { configurable: true, writable: true, value: 5 });
        fireEvent.loadedMetadata(audio);

        expect(getAllByText('Live').length).toBeGreaterThan(0);
        expect(container.querySelector('.room-stream-seek')).toBeNull();
    });

    it('plays a YouTube video with its title, author and a button to show the video', async () => {
        const player = {
            playVideo: vi.fn(),
            pauseVideo: vi.fn(),
            setVolume: vi.fn(),
            seekTo: vi.fn(),
            getCurrentTime: () => 42,
            getDuration: () => 213,
            getPlayerState: () => 1,
            getVideoData: () => ({ title: 'Never Gonna Give You Up', author: 'Rick Astley' }),
            destroy: vi.fn()
        };
        const options: { videoId?: string; events?: { onReady: () => void } } = {};

        window.YT = {
            Player: function (_element: HTMLElement, given: typeof options) {
                Object.assign(options, given);

                return player;
            } as never
        };
        state.stream = { roomId: 1, kind: 'youtube', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', setBy: 'Jacob', token: 1, queued: 0 };

        const { container, findByText, getByText, getByLabelText } = render(<RoomStreamWidgetView />);

        await act(async () => {
            await Promise.resolve();
        });
        await act(async () => {
            options.events.onReady();
        });

        expect(options.videoId).toBe('dQw4w9WgXcQ');
        expect(await findByText('Never Gonna Give You Up')).toBeTruthy();
        expect(await findByText('Rick Astley')).toBeTruthy();
        expect(await findByText('0:42')).toBeTruthy();
        expect(await findByText('3:33')).toBeTruthy();
        expect(container.querySelector('.room-stream-video').classList.contains('is-hidden')).toBe(true);

        fireEvent.click(getByText('Show video'));

        expect(container.querySelector('.room-stream-video').classList.contains('is-hidden')).toBe(false);
        expect(getByText('Hide video')).toBeTruthy();

        fireEvent.change(getByLabelText('Song position'), { target: { value: '100' } });

        expect(player.seekTo).toHaveBeenCalledWith(100, true);
    });

    it('offers no video button for audio links', () => {
        state.stream = { roomId: 1, kind: 'stream', url: 'https://radio.example.com/live.mp3', setBy: 'Jacob', token: 1, queued: 0 };

        const { queryByText } = render(<RoomStreamWidgetView />);

        expect(queryByText('Show video')).toBeNull();
    });

    it('lets the video be resized with the keyboard and remembers the size', async () => {
        const player = {
            playVideo: vi.fn(),
            pauseVideo: vi.fn(),
            setVolume: vi.fn(),
            seekTo: vi.fn(),
            getCurrentTime: () => 0,
            getDuration: () => 100,
            getPlayerState: () => 1,
            getVideoData: () => ({ title: 'Song', author: 'Artist' }),
            destroy: vi.fn()
        };

        window.localStorage.removeItem('room-stream-video-width');
        window.YT = {
            Player: function () {
                return player;
            } as never
        };
        state.stream = { roomId: 1, kind: 'youtube', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', setBy: 'Jacob', token: 1, queued: 0 };

        const { container, getByText, getByLabelText } = render(<RoomStreamWidgetView />);

        await act(async () => {
            await Promise.resolve();
        });
        fireEvent.click(getByText('Show video'));

        const handle = getByLabelText('Resize the video');
        const video = () => container.querySelector<HTMLElement>('.room-stream-video');

        fireEvent.keyDown(handle, { key: 'ArrowRight' });
        fireEvent.keyDown(handle, { key: 'ArrowRight' });

        expect(video().style.width).toBe('400px');
        expect(container.querySelector<HTMLElement>('.room-stream').style.getPropertyValue('--stream-width')).toBe('400px');
        expect(window.localStorage.getItem('room-stream-video-width')).toBe('400');

        for (let i = 0; i < 20; i++) fireEvent.keyDown(handle, { key: 'ArrowLeft' });

        expect(video().style.width).toBe('240px');
    });

    it('shows how many songs are waiting', () => {
        state.stream = { roomId: 1, kind: 'stream', url: 'https://radio.example.com/live.mp3', setBy: 'Jacob', token: 4, queued: 3 };

        const { getByText } = render(<RoomStreamWidgetView />);

        expect(getByText('Started by Jacob - 3 up next')).toBeTruthy();
    });

    it('tells the room a file song ended, once, when the person has rights', () => {
        state.stream = { roomId: 7, kind: 'stream', url: 'https://cdn.example.com/music/night-drive.mp3', setBy: 'Jacob', token: 5, queued: 1 };

        const { container } = render(<RoomStreamWidgetView />);
        const audio = container.querySelector('audio');

        fireEvent.ended(audio);
        fireEvent.ended(audio);

        expect(state.sent).toHaveLength(1);
        expect(state.sent[0]).toMatchObject({ roomId: 7, token: 5 });
    });

    it('does not report the end of a song for a visitor without rights', () => {
        state.roomSession = { isRoomOwner: false, controllerLevel: 0, sendChatMessage: (text: string) => state.chat.push(text) };
        state.stream = { roomId: 7, kind: 'stream', url: 'https://cdn.example.com/music/night-drive.mp3', setBy: 'Jacob', token: 5, queued: 1 };

        const { container } = render(<RoomStreamWidgetView />);

        fireEvent.ended(container.querySelector('audio'));

        expect(state.sent).toHaveLength(0);
    });

    it('reports when a SoundCloud track finishes', async () => {
        const handlers: Record<string, (data?: unknown) => void> = {};
        const widget = {
            bind: (event: string, callback: (data?: unknown) => void) => {
                handlers[event] = callback;
            },
            play: vi.fn(),
            pause: vi.fn(),
            setVolume: vi.fn(),
            seekTo: vi.fn(),
            getCurrentSound: vi.fn()
        };

        window.SC = Object.assign(() => widget, {
            Widget: Object.assign(() => widget, { Events: { READY: 'ready', PLAY: 'play', PLAY_PROGRESS: 'progress', FINISH: 'finish' } })
        });
        state.stream = { roomId: 7, kind: 'soundcloud', url: 'https://soundcloud.com/forss/flickermood', setBy: 'Jacob', token: 6, queued: 0 };

        render(<RoomStreamWidgetView />);
        await act(async () => {
            await Promise.resolve();
        });
        await act(async () => {
            handlers.finish();
        });

        expect(state.sent).toHaveLength(1);
        expect(state.sent[0]).toMatchObject({ roomId: 7, token: 6 });
    });

    it('adds a favorite to the song line for people with rights and suggests it for everyone else', () => {
        window.localStorage.setItem('room-stream-favorites', JSON.stringify([{ url: 'https://example.com/a', kind: 'stream', title: 'Song A', artist: '' }]));
        state.stream = { roomId: 1, kind: 'stream', url: 'https://radio.example.com/live.mp3', setBy: 'Jacob', token: 1, queued: 0 };

        const owner = render(<RoomStreamWidgetView />);

        fireEvent.click(owner.getByText('Favorites (1)'));
        fireEvent.click(owner.getByText('Add to line'));

        expect(state.chat).toEqual([':music add https://example.com/a']);

        owner.unmount();
        state.roomSession = { isRoomOwner: false, controllerLevel: 0, sendChatMessage: (text: string) => state.chat.push(text) };

        const guest = render(<RoomStreamWidgetView />);

        fireEvent.click(guest.getByText('Favorites (1)'));
        fireEvent.click(guest.getByText('Suggest'));

        expect(state.chat[1]).toBe(':music suggest https://example.com/a');
    });

    it('copies the song link from the copy button', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
        state.stream = { roomId: 1, kind: 'stream', url: 'https://radio.example.com/live.mp3', setBy: 'Jacob', token: 1, queued: 0 };

        const view = render(<RoomStreamWidgetView />);

        fireEvent.click(view.getByLabelText('Copy the song link'));

        expect(writeText).toHaveBeenCalledWith('https://radio.example.com/live.mp3');
        expect(await view.findByLabelText('Link copied')).toBeTruthy();
    });

    it('mutes from the speaker icon and brings the volume back', () => {
        window.localStorage.setItem('room-stream-volume', '70');
        state.stream = { roomId: 1, kind: 'stream', url: 'https://radio.example.com/live.mp3', setBy: 'Jacob', token: 1, queued: 0 };

        const view = render(<RoomStreamWidgetView />);
        const slider = () => view.getByLabelText('Room music volume') as HTMLInputElement;

        fireEvent.click(view.getByLabelText('Mute the room music'));
        expect(slider().value).toBe('0');

        fireEvent.click(view.getByLabelText('Unmute the room music'));
        expect(slider().value).toBe('70');
    });
});
