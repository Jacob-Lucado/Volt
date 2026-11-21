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

        if (!roomSession || !parser.url || (parser.kind !== 'stream' && parser.kind !== 'soundcloud')) {
            setStream(null);

            return;
        }

        setStream({ roomId: roomSession.roomId, kind: parser.kind, url: parser.url, setBy: parser.setBy });
    });

    // A stream belongs to the room it was sent for, so it stops when the person leaves that room.
    return { stream: stream && roomSession && stream.roomId === roomSession.roomId ? stream : null };
};

export const useRoomStreamWidget = useRoomStreamWidgetState;
