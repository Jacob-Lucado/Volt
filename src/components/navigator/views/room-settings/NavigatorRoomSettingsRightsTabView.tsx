import {
    FlatControllerAddedEvent,
    FlatControllerRemovedEvent,
    FlatControllersEvent,
    RoomGiveRightsComposer,
    RoomTakeRightsComposer,
    RoomUsersWithRightsComposer
} from '@volt/renderer';
import { FC, useEffect, useRef, useState } from 'react';
import { IRoomData, LocalizeText, SendMessageComposer } from '../../../../api';
import { UserProfileIconView } from '../../../../common';
import { LosField, LosIcon } from '../../../../common/lucadoos';
import { useFriends, useMessageEvent } from '../../../../hooks';

interface NavigatorRoomSettingsTabViewProps {
    roomData: IRoomData;
    handleChange: (field: string, value: string | number | boolean) => void;
    onRemoveAll: () => void;
}

// Polaris Staff Chat is not a real friend; keep it out of the rights picker.
const STAFF_CHAT_ID = -1;
const STAFF_CHAT_NAME = 'Staff Chat';

export const NavigatorRoomSettingsRightsTabView: FC<NavigatorRoomSettingsTabViewProps> = (props) => {
    const { roomData = null, onRemoveAll = null } = props;
    const [usersWithRights, setUsersWithRights] = useState<Map<number, string>>(new Map());
    const [filter, setFilter] = useState<string>('');
    const { onlineFriends = [], offlineFriends = [] } = useFriends();
    const pendingActionsRef = useRef<Set<string>>(new Set());

    const guardedSend = (key: string, composer: any) => {
        if (pendingActionsRef.current.has(key)) return;

        pendingActionsRef.current.add(key);
        SendMessageComposer(composer);

        setTimeout(() => pendingActionsRef.current.delete(key), 2000);
    };

    const allFriendsRaw = [...onlineFriends, ...offlineFriends];

    const allFriends = allFriendsRaw.filter((friend) => {
        if (friend.id === STAFF_CHAT_ID) return false;
        if (friend.name === STAFF_CHAT_NAME) return false;
        if (friend.id <= 0) return false;

        return true;
    });

    const filteredUsersWithRights = new Map(
        Array.from(usersWithRights.entries()).filter(([id, name]) => {
            if (id === STAFF_CHAT_ID) return false;
            if (name === STAFF_CHAT_NAME) return false;
            if (id <= 0) return false;

            return true;
        })
    );

    const friendsWithoutRights = allFriends.filter((friend) => !filteredUsersWithRights.has(friend.id));

    // The v75 filter box narrows both lists by name (`_r890bf3b741b447`).
    const query = filter.trim().toLowerCase();
    const shownUsersWithRights = Array.from(filteredUsersWithRights.entries()).filter(([id, name]) => !query || name.toLowerCase().includes(query));
    const shownFriends = friendsWithoutRights.filter((friend) => !query || friend.name.toLowerCase().includes(query));

    useMessageEvent<FlatControllersEvent>(FlatControllersEvent, (event) => {
        const parser = event.getParser();

        if (!roomData || roomData.roomId !== parser.roomId) return;

        setUsersWithRights(parser.users);
    });

    useMessageEvent<FlatControllerAddedEvent>(FlatControllerAddedEvent, (event) => {
        const parser = event.getParser();

        if (!roomData || roomData.roomId !== parser.roomId) return;

        setUsersWithRights((prevValue) => {
            const newValue = new Map(prevValue);

            newValue.set(parser.data.userId, parser.data.userName);

            return newValue;
        });
    });

    useMessageEvent<FlatControllerRemovedEvent>(FlatControllerRemovedEvent, (event) => {
        const parser = event.getParser();

        if (!roomData || roomData.roomId !== parser.roomId) return;

        setUsersWithRights((prevValue) => {
            const newValue = new Map(prevValue);

            newValue.delete(parser.userId);

            return newValue;
        });
    });

    useEffect(() => {
        if (!roomData) return;

        SendMessageComposer(new RoomUsersWithRightsComposer(roomData.roomId));
    }, [roomData]);

    return (
        <div className="los-ros__tab">
            <LosField label={LocalizeText('navigator.flatctrls.filter')}>
                <input className="los-input" value={filter} onChange={(event) => setFilter(event.target.value)} />
            </LosField>
            <div className="los-ros__cols">
                <div className="los-ros__col">
                    <b>
                        {LocalizeText(
                            'navigator.flatctrls.userswithrights',
                            ['displayed', 'total'],
                            [shownUsersWithRights.length.toString(), filteredUsersWithRights.size.toString()]
                        )}
                    </b>
                    <div className="los-ros__users los-scroll">
                        {shownUsersWithRights.map(([id, name]) => (
                            <div key={id} className="los-ros__user">
                                <button type="button" onClick={() => guardedSend(`take_${id}`, new RoomTakeRightsComposer(id))} title={name}>
                                    <span>{name}</span>
                                    <LosIcon name="chevron" size={14} />
                                </button>
                                <UserProfileIconView className="ros-user-eye" userId={id} />
                            </div>
                        ))}
                    </div>
                    <button type="button" className="los-button" disabled={!filteredUsersWithRights.size} onClick={onRemoveAll}>
                        {LocalizeText('navigator.flatctrls.clear')}
                    </button>
                </div>
                <div className="los-ros__col">
                    <b>
                        {LocalizeText(
                            'navigator.flatctrls.friends',
                            ['displayed', 'total'],
                            [shownFriends.length.toString(), friendsWithoutRights.length.toString()]
                        )}
                    </b>
                    <div className="los-ros__users los-scroll">
                        {shownFriends.map((friend) => (
                            <div key={friend.id} className="los-ros__user is-friend">
                                <button
                                    type="button"
                                    onClick={() => guardedSend(`give_${friend.id}`, new RoomGiveRightsComposer(friend.id))}
                                    title={friend.name}
                                >
                                    <LosIcon name="chevron" size={14} />
                                    <span>{friend.name}</span>
                                </button>
                                <UserProfileIconView className="ros-user-eye" userId={friend.id} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
