import { BannedUserData, BannedUsersFromRoomEvent, RoomBannedUsersComposer, RoomModerationSettings, RoomUnbanUserComposer } from '@volt/renderer';
import { FC, useEffect, useState } from 'react';
import { IRoomData, LocalizeText, SendMessageComposer } from '../../../../api';
import { UserProfileIconView } from '../../../../common';
import { LosField, LosSelect } from '../../../../common/lucadoos';
import { useMessageEvent } from '../../../../hooks';

interface NavigatorRoomSettingsTabViewProps {
    roomData: IRoomData;
    handleChange: (field: string, value: string | number | boolean) => void;
}

export const NavigatorRoomSettingsModTabView: FC<NavigatorRoomSettingsTabViewProps> = (props) => {
    const { roomData = null, handleChange = null } = props;
    const [selectedUserId, setSelectedUserId] = useState<number>(-1);
    const [bannedUsers, setBannedUsers] = useState<BannedUserData[]>([]);

    const unBanUser = (userId: number) => {
        setBannedUsers((prevValue) => {
            const newValue = [...prevValue];

            const index = newValue.findIndex((value) => value.userId === userId);

            if (index >= 0) newValue.splice(index, 1);

            return newValue;
        });

        SendMessageComposer(new RoomUnbanUserComposer(userId, roomData.roomId));

        setSelectedUserId(-1);
    };

    useMessageEvent<BannedUsersFromRoomEvent>(BannedUsersFromRoomEvent, (event) => {
        const parser = event.getParser();

        if (!roomData || roomData.roomId !== parser.roomId) return;

        setBannedUsers(parser.bannedUsers);
    });

    useEffect(() => {
        SendMessageComposer(new RoomBannedUsersComposer(roomData.roomId));
    }, [roomData.roomId]);

    return (
        <div className="los-ros__tab">
            <p className="los-ros__note">{LocalizeText('navigator.roomsettings.moderation.header')}</p>
            <LosField label={LocalizeText('navigator.roomsettings.moderation.mute.header')}>
                <LosSelect
                    value={roomData.moderationSettings.allowMute}
                    options={[
                        { value: RoomModerationSettings.MODERATION_LEVEL_NONE, label: LocalizeText('navigator.roomsettings.moderation.none') },
                        { value: RoomModerationSettings.MODERATION_LEVEL_USER_WITH_RIGHTS, label: LocalizeText('navigator.roomsettings.moderation.rights') }
                    ]}
                    onChange={(value) => handleChange('moderation_mute', value)}
                />
            </LosField>
            <LosField label={LocalizeText('navigator.roomsettings.moderation.kick.header')}>
                <LosSelect
                    value={roomData.moderationSettings.allowKick}
                    options={[
                        { value: RoomModerationSettings.MODERATION_LEVEL_NONE, label: LocalizeText('navigator.roomsettings.moderation.none') },
                        { value: RoomModerationSettings.MODERATION_LEVEL_USER_WITH_RIGHTS, label: LocalizeText('navigator.roomsettings.moderation.rights') },
                        { value: RoomModerationSettings.MODERATION_LEVEL_ALL, label: LocalizeText('navigator.roomsettings.moderation.all') }
                    ]}
                    onChange={(value) => handleChange('moderation_kick', value)}
                />
            </LosField>
            <LosField label={LocalizeText('navigator.roomsettings.moderation.ban.header')}>
                <LosSelect
                    value={roomData.moderationSettings.allowBan}
                    options={[
                        { value: RoomModerationSettings.MODERATION_LEVEL_NONE, label: LocalizeText('navigator.roomsettings.moderation.none') },
                        { value: RoomModerationSettings.MODERATION_LEVEL_USER_WITH_RIGHTS, label: LocalizeText('navigator.roomsettings.moderation.rights') }
                    ]}
                    onChange={(value) => handleChange('moderation_ban', value)}
                />
            </LosField>
            <LosField label={LocalizeText('navigator.roomsettings.moderation.banned.users')}>
                <div className="los-ros__users los-scroll is-short">
                    {bannedUsers.map((user) => (
                        <div key={user.userId} className={`los-ros__user${selectedUserId === user.userId ? ' is-selected' : ''}`}>
                            <button type="button" onClick={() => setSelectedUserId(user.userId)}>
                                <span>{user.userName}</span>
                            </button>
                            <UserProfileIconView className="ros-user-eye" userId={user.userId} />
                        </div>
                    ))}
                </div>
            </LosField>
            <button type="button" className="los-button" disabled={selectedUserId <= 0} onClick={() => selectedUserId > 0 && unBanUser(selectedUserId)}>
                {LocalizeText('navigator.roomsettings.moderation.unban')}
            </button>
        </div>
    );
};
