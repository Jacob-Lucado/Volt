import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RoomStreamWidgetView } from './RoomStreamWidgetView';

const state = vi.hoisted(() => ({ stream: null }));

vi.mock('../../../../hooks', () => ({ useRoomStreamWidget: () => ({ stream: state.stream }) }));

beforeEach(() =>
{
    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.pause = vi.fn();
});

afterEach(() =>
{
    cleanup();
    delete window.SC;
    delete window.YT;
    state.stream = null;
});

describe('RoomStreamWidgetView', () =>
{
    it('shows nothing without a stream', () =>
    {
        const { container } = render(<RoomStreamWidgetView />);

        expect(container.firstChild).toBeNull();
    });

    it('plays a direct stream through an audio element', () =>
    {
        state.stream = { roomId: 1, kind: 'stream', url: 'https://radio.example.com/live.mp3', setBy: 'Jacob' };

        const { container, getByText } = render(<RoomStreamWidgetView />);

        expect(container.querySelector('audio').getAttribute('src')).toBe('https://radio.example.com/live.mp3');
        expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled();
        expect(getByText('radio.example.com')).toBeTruthy();
        expect(getByText('Started by Jacob')).toBeTruthy();
    });

    it('plays a SoundCloud link in a SoundCloud player', () =>
    {
        state.stream = { roomId: 1, kind: 'soundcloud', url: 'https://soundcloud.com/artist/song', setBy: 'Jacob' };

        const { container } = render(<RoomStreamWidgetView />);
        const source = container.querySelector('iframe').getAttribute('src');

        expect(source.startsWith('https://w.soundcloud.com/player/?url=')).toBe(true);
        expect(source).toContain(encodeURIComponent('https://soundcloud.com/artist/song'));
        expect(container.querySelector('audio')).toBeNull();
    });

    it('lets a person turn the music off for themselves', () =>
    {
        state.stream = { roomId: 1, kind: 'stream', url: 'https://radio.example.com/live.mp3', setBy: 'Jacob' };

        const { container, getByLabelText } = render(<RoomStreamWidgetView />);

        fireEvent.click(getByLabelText('Turn the room music off for me'));

        expect(container.firstChild).toBeNull();
    });

    it('asks for a tap when the browser blocks autoplay', async () =>
    {
        window.HTMLMediaElement.prototype.play = vi.fn().mockRejectedValue(new Error('blocked'));
        state.stream = { roomId: 1, kind: 'stream', url: 'https://radio.example.com/live.mp3', setBy: 'Jacob' };

        const { findByText } = render(<RoomStreamWidgetView />);

        expect(await findByText('Press play to listen')).toBeTruthy();
    });

    it('shows the artwork, title and artist of the SoundCloud track', async () =>
    {
        const handlers: Record<string, (data?: unknown) => void> = {};
        const widget = {
            bind: (event: string, callback: (data?: unknown) => void) =>
            {
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
            Widget: Object.assign(() => widget, { Events: { READY: 'ready', PLAY: 'play', PLAY_PROGRESS: 'progress' } })
        });
        state.stream = { roomId: 1, kind: 'soundcloud', url: 'https://soundcloud.com/forss/flickermood', setBy: 'Jacob' };

        const { container, findByText, getByLabelText } = render(<RoomStreamWidgetView />);

        await act(async () =>
        {
            await Promise.resolve();
        });
        await act(async () =>
        {
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

    it('names a stream file and shows how far along it is', () =>
    {
        state.stream = { roomId: 1, kind: 'stream', url: 'https://cdn.example.com/music/night-drive.mp3', setBy: 'Jacob' };

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

    it('marks an endless stream as live', () =>
    {
        state.stream = { roomId: 1, kind: 'stream', url: 'https://radio.example.com/live.mp3', setBy: 'Jacob' };

        const { container, getAllByText } = render(<RoomStreamWidgetView />);
        const audio = container.querySelector('audio');

        Object.defineProperty(audio, 'duration', { configurable: true, value: Infinity });
        Object.defineProperty(audio, 'currentTime', { configurable: true, writable: true, value: 5 });
        fireEvent.loadedMetadata(audio);

        expect(getAllByText('Live').length).toBeGreaterThan(0);
        expect(container.querySelector('.room-stream-seek')).toBeNull();
    });

    it('plays a YouTube video with its title, author and a button to show the video', async () =>
    {
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
            Player: function (_element: HTMLElement, given: typeof options)
            {
                Object.assign(options, given);

                return player;
            } as never
        };
        state.stream = { roomId: 1, kind: 'youtube', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', setBy: 'Jacob' };

        const { container, findByText, getByText, getByLabelText } = render(<RoomStreamWidgetView />);

        await act(async () =>
        {
            await Promise.resolve();
        });
        await act(async () =>
        {
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

    it('offers no video button for audio links', () =>
    {
        state.stream = { roomId: 1, kind: 'stream', url: 'https://radio.example.com/live.mp3', setBy: 'Jacob' };

        const { queryByText } = render(<RoomStreamWidgetView />);

        expect(queryByText('Show video')).toBeNull();
    });

    it('lets the video be resized with the keyboard and remembers the size', async () =>
    {
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
        window.YT = { Player: function ()
        {
            return player;
        } as never };
        state.stream = { roomId: 1, kind: 'youtube', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', setBy: 'Jacob' };

        const { container, getByText, getByLabelText } = render(<RoomStreamWidgetView />);

        await act(async () =>
        {
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
});
