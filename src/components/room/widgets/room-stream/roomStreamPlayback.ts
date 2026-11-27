import { useSyncExternalStore } from 'react';

export interface RoomStreamPlayback {
    url: string;
    kind: 'stream' | 'soundcloud' | 'youtube';
    title: string;
    artist: string;
    artwork: string | null;
    paused: boolean;
}

// What the room music is playing right now, so a Video Screen can show it. The position is read when needed and never triggers a render.
let playback: RoomStreamPlayback | null = null;
let position = 0;
const listeners = new Set<() => void>();

export const setRoomStreamPlayback = (next: RoomStreamPlayback | null) => {
    const same =
        playback === next ||
        (!!playback &&
            !!next &&
            playback.url === next.url &&
            playback.kind === next.kind &&
            playback.title === next.title &&
            playback.artist === next.artist &&
            playback.artwork === next.artwork &&
            playback.paused === next.paused);

    if (same) return;

    playback = next;
    listeners.forEach((listener) => listener());
};

export const setRoomStreamPosition = (seconds: number) => {
    position = seconds;
};

export const getRoomStreamPosition = () => position;

const subscribe = (listener: () => void) => {
    listeners.add(listener);

    return () => listeners.delete(listener);
};

export const useRoomStreamPlayback = () => useSyncExternalStore(subscribe, () => playback);
