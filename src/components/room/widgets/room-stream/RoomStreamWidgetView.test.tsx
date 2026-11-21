import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RoomStreamWidgetView } from './RoomStreamWidgetView';

const state = vi.hoisted(() => ({ stream: null as { roomId: number; kind: string; url: string; setBy: string } }));

vi.mock('../../../../hooks', () => ({ useRoomStreamWidget: () => ({ stream: state.stream }) }));

beforeEach(() => {
    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.pause = vi.fn();
});

afterEach(() => {
    cleanup();
    state.stream = null;
});

describe('RoomStreamWidgetView', () => {
    it('shows nothing without a stream', () => {
        const { container } = render(<RoomStreamWidgetView />);

        expect(container.firstChild).toBeNull();
    });

    it('plays a direct stream through an audio element', () => {
        state.stream = { roomId: 1, kind: 'stream', url: 'https://radio.example.com/live.mp3', setBy: 'Jacob' };

        const { container, getByText } = render(<RoomStreamWidgetView />);

        expect(container.querySelector('audio').getAttribute('src')).toBe('https://radio.example.com/live.mp3');
        expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled();
        expect(getByText('radio.example.com')).toBeTruthy();
        expect(getByText('Started by Jacob')).toBeTruthy();
    });

    it('plays a SoundCloud link in a SoundCloud player', () => {
        state.stream = { roomId: 1, kind: 'soundcloud', url: 'https://soundcloud.com/artist/song', setBy: 'Jacob' };

        const { container } = render(<RoomStreamWidgetView />);
        const source = container.querySelector('iframe').getAttribute('src');

        expect(source.startsWith('https://w.soundcloud.com/player/?url=')).toBe(true);
        expect(source).toContain(encodeURIComponent('https://soundcloud.com/artist/song'));
        expect(container.querySelector('audio')).toBeNull();
    });

    it('lets a person turn the music off for themselves', () => {
        state.stream = { roomId: 1, kind: 'stream', url: 'https://radio.example.com/live.mp3', setBy: 'Jacob' };

        const { container, getByLabelText } = render(<RoomStreamWidgetView />);

        fireEvent.click(getByLabelText('Turn the room music off for me'));

        expect(container.firstChild).toBeNull();
    });

    it('asks for a tap when the browser blocks autoplay', async () => {
        window.HTMLMediaElement.prototype.play = vi.fn().mockRejectedValue(new Error('blocked'));
        state.stream = { roomId: 1, kind: 'stream', url: 'https://radio.example.com/live.mp3', setBy: 'Jacob' };

        const { findByText } = render(<RoomStreamWidgetView />);

        expect(await findByText('Press play to listen')).toBeTruthy();
    });
});
