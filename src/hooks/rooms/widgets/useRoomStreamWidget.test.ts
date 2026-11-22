import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
    roomId: 1,
    handler: null
}));

vi.mock('@volt/renderer', () => ({ RoomStreamMessageEvent: class
{} }));
vi.mock('../../events', () => ({
    useMessageEvent: (_event: unknown, callback: (event: { getParser: () => unknown }) => void) =>
    {
        state.handler = callback;
    }
}));
vi.mock('../useRoom', () => ({ useRoom: () => ({ roomSession: { roomId: state.roomId } }) }));

import { useRoomStreamWidget } from './useRoomStreamWidget';

const send = (roomId: number, kind: string, url: string, setBy = 'Jacob') => act(() => state.handler({ getParser: () => ({ roomId, kind, url, setBy }) }));

describe('useRoomStreamWidget', () =>
{
    beforeEach(() =>
    {
        state.roomId = 1;
    });

    it('plays the stream of the room the person is in', () =>
    {
        const { result } = renderHook(() => useRoomStreamWidget());

        send(1, 'soundcloud', 'https://soundcloud.com/a/b');

        expect(result.current.stream?.url).toBe('https://soundcloud.com/a/b');
    });

    it('ignores a stream sent for another room', () =>
    {
        const { result } = renderHook(() => useRoomStreamWidget());

        send(2, 'stream', 'https://radio.example.com/live.mp3');

        expect(result.current.stream).toBeNull();
    });

    it('stops playing in another room and returns with the one that sent it', () =>
    {
        const { result, rerender } = renderHook(() => useRoomStreamWidget());

        send(1, 'stream', 'https://radio.example.com/live.mp3');
        state.roomId = 2;
        rerender();

        expect(result.current.stream).toBeNull();

        state.roomId = 1;
        rerender();

        expect(result.current.stream?.roomId).toBe(1);
    });

    it('lets a stop for one room leave the stream of another alone', () =>
    {
        const { result } = renderHook(() => useRoomStreamWidget());

        send(1, 'stream', 'https://radio.example.com/live.mp3');
        send(2, '', '');

        expect(result.current.stream?.roomId).toBe(1);

        send(1, '', '');

        expect(result.current.stream).toBeNull();
    });
});
