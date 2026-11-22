import { RoomStreamMessageEvent } from '@volt/renderer';
import { useState } from 'react';
import { useMessageEvent } from '../../events';
import { useRoom } from '../useRoom';

export interface RoomStream {
    roomId: number;
    kind: 'stream' | 'soundcloud' | 'youtube';
    url: string;
    setBy: string;
    token: number;
    queued: number;
}

const useRoomStreamWidgetState = () => {
    const { roomSession = null } = useRoom();
    const [stream, setStream] = useState<RoomStream>(null);

    useMessageEvent<RoomStreamMessageEvent>(RoomStreamMessageEvent, (event) => {
        const parser = event.getParser();
        const valid = !!parser.url && (parser.kind === 'stream' || parser.kind === 'soundcloud' || parser.kind === 'youtube');

        // A stop only ends the stream of its own room.
        setStream((current) => {
            if (!valid) return current && current.roomId === parser.roomId ? null : current;

            return { roomId: parser.roomId, kind: parser.kind, url: parser.url, setBy: parser.setBy, token: parser.token ?? 0, queued: parser.queued ?? 0 };
        });
    });

    // A stream belongs to the room it was sent for, so it stops when the person leaves that room.
    return { stream: stream && roomSession && stream.roomId === roomSession.roomId ? stream : null };
};

export const useRoomStreamWidget = useRoomStreamWidgetState;
