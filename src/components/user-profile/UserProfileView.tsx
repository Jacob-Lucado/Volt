import {
    ExtendedProfileChangedMessageEvent,
    GetSessionDataManager,
    IUserCurrentBadgeData,
    RelationshipStatusInfoEvent,
    RelationshipStatusInfoMessageParser,
    RoomEngineObjectEvent,
    RoomObjectCategory,
    RoomObjectType,
    UserCurrentBadgesComposer,
    UserCurrentBadgesEvent,
    UserProfileEvent,
    UserProfileParser,
    UserRelationshipsComposer
} from '@volt/renderer';
import { FC, useState } from 'react';
import { CreateLinkEvent, GetRoomSession, GetUserProfile, LocalizeText, localizeWithFallback, SendMessageComposer } from '../../api';
import { useIsUserBlocked, useMessageEvent, useNotification, useVoltEvent } from '../../hooks';
import { LosProfile } from './lucado/LosProfile';

export const UserProfileView: FC<{}> = () => {
    const [userProfile, setUserProfile] = useState<UserProfileParser>(null);
    const [userBadges, setUserBadges] = useState<IUserCurrentBadgeData[]>([]);
    const [userRelationships, setUserRelationships] = useState<RelationshipStatusInfoMessageParser>(null);
    const [windowPosition, setWindowPosition] = useState<{ x: number; y: number } | null>(null);
    // Official ExtendedProfileWindowCtrl: block_button / blocked_container run off the session
    // block list (BlockedUsersManager), not off the ignore list.
    const isBlocked = useIsUserBlocked(userProfile?.id ?? -1);
    const { showConfirm = null } = useNotification();

    const onClose = () => {
        setUserProfile(null);
        setUserBadges([]);
        setUserRelationships(null);
    };

    // Official blockUser / unblockUser by user id, each behind its confirm
    // (extendedprofile.block_player / unblock_player).
    const toggleBlock = () => {
        if (!userProfile) return;

        const userId = userProfile.id;
        const key = isBlocked ? 'extendedprofile.unblock_player' : 'extendedprofile.block_player';
        const apply = () => (isBlocked ? GetSessionDataManager().unblockUser(userId) : GetSessionDataManager().blockUser(userId));

        showConfirm(
            // The pack stores the line breaks as literal "\n".
            localizeWithFallback(`${key}.desc`, isBlocked ? 'Unblock this user?' : 'Block this user?').replace(/\\n/g, '\n'),
            apply,
            null,
            null,
            null,
            localizeWithFallback(`${key}.title`, isBlocked ? 'Unblock user' : 'Block user')
        );
    };

    const onLeaveGroup = () => {
        if (!userProfile || userProfile.id !== GetSessionDataManager().userId) return;

        GetUserProfile(userProfile.id);
    };

    const onOpenRooms = () => {
        if (!userProfile) return;

        CreateLinkEvent(`navigator/search/hotel_view/owner:${userProfile.username}`);
    };

    useMessageEvent<UserCurrentBadgesEvent>(UserCurrentBadgesEvent, (event) => {
        const parser = event.getParser();

        if (!userProfile || parser.userId !== userProfile.id) return;

        setUserBadges(parser.badgeDetails);
    });

    useMessageEvent<RelationshipStatusInfoEvent>(RelationshipStatusInfoEvent, (event) => {
        const parser = event.getParser();

        if (!userProfile || parser.userId !== userProfile.id) return;

        setUserRelationships(parser);
    });

    useMessageEvent<UserProfileEvent>(UserProfileEvent, (event) => {
        const parser = event.getParser();

        const isSameProfile = userProfile?.id === parser.id;
        setUserProfile(parser);
        if (!windowPosition) setWindowPosition({ x: (window.innerWidth - 521) / 2, y: (window.innerHeight - 537) / 2 });

        if (!isSameProfile) {
            setUserBadges([]);
            setUserRelationships(null);
        }

        SendMessageComposer(new UserCurrentBadgesComposer(parser.id));
        SendMessageComposer(new UserRelationshipsComposer(parser.id));
    });

    useMessageEvent<ExtendedProfileChangedMessageEvent>(ExtendedProfileChangedMessageEvent, (event) => {
        const parser = event.getParser();

        if (parser.userId != userProfile?.id) return;

        GetUserProfile(parser.userId);
    });

    useVoltEvent<RoomEngineObjectEvent>(RoomEngineObjectEvent.SELECTED, (event) => {
        if (!userProfile) return;

        if (event.category !== RoomObjectCategory.UNIT) return;

        const userData = GetRoomSession().userDataManager.getUserDataByIndex(event.objectId);

        if (userData.type !== RoomObjectType.USER) return;

        GetUserProfile(userData.webID);
    });

    if (!userProfile) return null;
    const isProfileHidden = userProfile.hasNativeProfileFields && userProfile.isHidden && userProfile.id !== GetSessionDataManager().userId;

    return (
        <LosProfile
            userProfile={userProfile}
            userBadges={userBadges}
            userRelationships={userRelationships}
            isBlocked={isBlocked}
            isProfileHidden={isProfileHidden}
            windowPosition={windowPosition}
            onPositionChange={setWindowPosition}
            onToggleBlock={toggleBlock}
            onOpenRooms={onOpenRooms}
            onLeaveGroup={onLeaveGroup}
            onClose={onClose}
        />
    );
};
