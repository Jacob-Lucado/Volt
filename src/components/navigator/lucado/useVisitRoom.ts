import { GetSessionDataManager, RoomDataParser } from '@volt/renderer';
import { useCallback } from 'react';
import { CreateRoomSession, DoorStateType, TryVisitRoom } from '../../../api';
import { useDoorState } from '../../../hooks';

/** Enters a room, going through the doorbell or password prompt first when the room asks for one. */
export const useVisitRoom = () => {
    const { setSnapshot } = useDoorState();

    return useCallback(
        (room: RoomDataParser) => {
            if (room.ownerId !== GetSessionDataManager().userId) {
                if (room.habboGroupId !== 0) {
                    TryVisitRoom(room.roomId);
                    return;
                }

                const prompt =
                    room.doorMode === RoomDataParser.DOORBELL_STATE
                        ? DoorStateType.START_DOORBELL
                        : room.doorMode === RoomDataParser.PASSWORD_STATE
                          ? DoorStateType.START_PASSWORD
                          : null;

                if (prompt !== null) {
                    setSnapshot((previous) => ({ ...previous, roomInfo: room, state: prompt }));
                    return;
                }
            }

            CreateRoomSession(room.roomId);
        },
        [setSnapshot]
    );
};
