import { RoomStreamMessageEvent } from '@volt/renderer';
import { useState } from 'react';
import { useMessageEvent } from '../../events';
import { useRoom } from '../useRoom';

export interface RoomStream {
    roomId: number;
    kind: 'stream' | 'soundcloud';
    url: string;
    setBy: string;
}

const useRoomStreamWidgetState = () => {
    const { roomSession = null } = useRoom();
    const [stream, setStream] = useState<RoomStream>(null);

    useMessageEvent<RoomStreamMessageEvent>(RoomStreamMessageEvent, (event) => {
        const parser = event.getParser();
        const valid = !!parser.url && (parser.kind === 'stream' || parser.kind === 'soundcloud');

        // A stop only ends the stream of its own room.
        setStream((current) => {
            if (!valid) return current && current.roomId === parser.roomId ? null : current;

            return { roomId: parser.roomId, kind: parser.kind as RoomStream['kind'], url: parser.url, setBy: parser.setBy };
        });
    });

    // A stream belongs to the room it was sent for, so it stops when the person leaves that room.
    return { stream: stream && roomSession && stream.roomId === roomSession.roomId ? stream : null };
};

export const useRoomStreamWidget = useRoomStreamWidgetState;
