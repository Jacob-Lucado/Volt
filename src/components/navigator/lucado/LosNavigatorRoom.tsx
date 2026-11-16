import { RoomDataParser } from '@volt/renderer';
import { FC, MouseEvent, useRef } from 'react';
import { getNavigatorUserCountColor, LocalizeText } from '../../../api';
import { LayoutRoomThumbnailView } from '../../../common';
import { LosIcon, LosIconName } from '../../../common/lucadoos';
import { useNavigatorRoomInfoPopupStore } from '../../../hooks';
import { useVisitRoom } from './useVisitRoom';

interface LosNavigatorRoomProps {
    room: RoomDataParser;
    tile?: boolean;
    /** Event lists show the promotion's name in place of the room's. */
    eventTitle?: boolean;
}

const DOOR_ICONS: Record<number, LosIconName> = {
    [RoomDataParser.DOORBELL_STATE]: 'bell',
    [RoomDataParser.PASSWORD_STATE]: 'lock',
    [RoomDataParser.INVISIBLE_STATE]: 'hidden'
};

export const LosNavigatorRoom: FC<LosNavigatorRoomProps> = ({ room, tile = false, eventTitle = false }) => {
    const visitRoom = useVisitRoom();
    const infoRef = useRef<HTMLButtonElement>(null);
    const title = eventTitle && room.roomAdName ? room.roomAdName : room.roomName;
    const door = DOOR_ICONS[room.doorMode];

    const showInfo = (event: MouseEvent) => {
        event.stopPropagation();
        if (infoRef.current) useNavigatorRoomInfoPopupStore.getState().toggleFromInfo(room, infoRef.current.getBoundingClientRect());
    };

    const count = (
        <span className="los-nav-room__count" style={{ backgroundColor: getNavigatorUserCountColor(room.userCount, room.maxUserCount) }}>
            <LosIcon name="user" size={11} />
            {room.userCount}
        </span>
    );

    const info = (
        <button
            type="button"
            ref={infoRef}
            className="los-icon-button los-nav-room__info"
            aria-label={LocalizeText('navigator.room.popup.room.info')}
            onClick={showInfo}
        >
            <LosIcon name="info" size={15} />
        </button>
    );

    if (tile)
        return (
            <div className="los-nav-tile">
                <button type="button" className="los-nav-tile__enter" aria-label={title} onClick={() => visitRoom(room)}>
                    <LayoutRoomThumbnailView className="los-nav-tile__thumb" customUrl={room.officialRoomPicRef} roomId={room.roomId} />
                    {count}
                    <span className="los-nav-tile__name">{title}</span>
                </button>
                {info}
            </div>
        );

    return (
        <div className="los-nav-room">
            <button type="button" className="los-nav-room__enter" aria-label={title} onClick={() => visitRoom(room)}>
                {count}
                <span className="los-nav-room__name">{title}</span>
                {door && <LosIcon name={door} size={14} />}
                {room.habboGroupId > 0 && <LosIcon name="group" size={14} />}
            </button>
            {info}
        </div>
    );
};
