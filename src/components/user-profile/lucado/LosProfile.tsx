import {
    FindNewFriendsMessageComposer,
    GetSessionDataManager,
    GroupInformationComposer,
    GroupInformationEvent,
    GroupInformationParser,
    GroupRemoveMemberComposer,
    IUserCurrentBadgeData,
    RelationshipStatusEnum,
    RelationshipStatusInfoMessageParser,
    UserProfileParser
} from '@volt/renderer';
import { FC, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import {
    CatalogPageName,
    CreateLinkEvent,
    FriendlyTime,
    GetConfigurationValue,
    GetGroupManager,
    GetGroupMembers,
    GetUserProfile,
    GroupMembershipType,
    GroupType,
    LocalizeBadgeDescription,
    LocalizeBadgeName,
    LocalizeText,
    localizeWithFallback,
    SendMessageComposer,
    ToggleFavoriteGroup,
    TryJoinGroup,
    TryVisitRoom
} from '../../../api';
import { DraggableWindow, LayoutAvatarImageView, LayoutBadgeImageView } from '../../../common';
import { LosIcon, LosIconName, LosWindow } from '../../../common/lucadoos';
import { useFriendsActions, useFriendsState, useMessageEvent, useNotification } from '../../../hooks';
import { ProfileAvatarImage } from '../ProfileAvatarImage';

interface LosProfileProps {
    userProfile: UserProfileParser;
    userBadges: IUserCurrentBadgeData[];
    userRelationships: RelationshipStatusInfoMessageParser | null;
    isBlocked: boolean;
    isProfileHidden: boolean;
    windowPosition: { x: number; y: number } | null;
    onPositionChange: (position: { x: number; y: number }) => void;
    onToggleBlock: () => void;
    onOpenRooms: () => void;
    onLeaveGroup: () => void;
    onClose: () => void;
}

const REL: { type: number; icon: LosIconName; label: string }[] = [
    { type: RelationshipStatusEnum.HEART, icon: 'heart', label: 'heart' },
    { type: RelationshipStatusEnum.SMILE, icon: 'info', label: 'smile' },
    { type: RelationshipStatusEnum.BOBBA, icon: 'hidden', label: 'bobba' }
];

const Stat: FC<{ icon: LosIconName; label: string; value?: ReactNode; onClick?: () => void }> = ({ icon, label, value, onClick }) => {
    const Tag = onClick ? 'button' : 'div';

    return (
        <Tag className="los-pf__stat" {...(onClick ? { type: 'button', onClick } : {})}>
            <LosIcon name={icon} />
            <span>{label}</span>
            {value !== undefined && <b>{value}</b>}
        </Tag>
    );
};

const Relationships: FC<{ relationships: RelationshipStatusInfoMessageParser; onClose: () => void }> = ({ relationships, onClose }) => {
    const { showConfirm } = useNotification();
    const findFriends = () =>
        showConfirm(
            localizeWithFallback(
                'extendedprofile.add.friends.alert.body',
                'Following this link takes you out of the room you are in, to a room where you can meet new friends.'
            ),
            () => {
                SendMessageComposer(new FindNewFriendsMessageComposer());
                onClose();
            },
            null,
            null,
            null,
            localizeWithFallback('extendedprofile.add.friends.alert.title', 'Leave the room?')
        );

    return (
        <div className="los-pf__rels">
            {REL.map((item) => {
                const info = relationships.relationshipStatusMap.hasKey(item.type) ? relationships.relationshipStatusMap.getValue(item.type) : null;
                const has = !!info && info.friendCount >= 1;

                return (
                    <button
                        key={item.type}
                        type="button"
                        className="los-pf__rel"
                        onClick={() => (has && info.randomFriendId >= 1 ? GetUserProfile(info.randomFriendId) : findFriends())}
                    >
                        <span className={`los-pf__rel-icon is-${item.label}`}>
                            <LosIcon name={item.icon} size={15} />
                        </span>
                        <span className="los-pf__rel-text">
                            <b>{has ? info.randomFriendName : LocalizeText('extendedprofile.add.friends')}</b>
                            <small>
                                {!has && LocalizeText('extendedprofile.no.friends.in.this.category')}
                                {has &&
                                    info.friendCount > 1 &&
                                    LocalizeText(`extendedprofile.relstatus.others.${item.label}`, ['count'], [(info.friendCount - 1).toString()])}
                            </small>
                        </span>
                        {has && (
                            <span className="los-pf__rel-head">
                                <LayoutAvatarImageView direction={4} figure={info.randomFriendFigure} headOnly nativeCroppedHead />
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
};

const GroupDetails: FC<{ group: GroupInformationParser; onLeaveGroup: () => void }> = ({ group, onLeaveGroup }) => {
    const { showConfirm } = useNotification();
    const isOwner = group.isOwner || group.ownerName === GetSessionDataManager().userName;
    const isMember = group.membershipType === GroupMembershipType.MEMBER;
    const isPending = group.membershipType === GroupMembershipType.REQUEST_PENDING;
    const canJoin =
        !isOwner &&
        group.membershipType === GroupMembershipType.NOT_MEMBER &&
        (group.type === GroupType.REGULAR || group.type === GroupType.EXCLUSIVE || group.type === 4);

    const leave = () =>
        showConfirm(
            LocalizeText('group.leaveconfirm.desc'),
            () => {
                SendMessageComposer(new GroupRemoveMemberComposer(group.id, GetSessionDataManager().userId));
                onLeaveGroup();
            },
            null
        );

    return (
        <div className="los-pf__group">
            <div className="los-pf__group-head">
                <LayoutBadgeImageView badgeCode={group.badge} isGroup />
                <div>
                    <b>{group.title}</b>
                    <small>{LocalizeText('group.created', ['date', 'owner'], [group.createdAt, group.ownerName])}</small>
                </div>
            </div>
            {!!group.description && <p className="los-pf__group-desc">{group.description}</p>}
            <div className="los-pf__links">
                <button type="button" onClick={() => GetGroupMembers(group.id, 0)}>
                    {LocalizeText('group.membercount', ['totalMembers'], [group.membersCount.toString()])}
                </button>
                {group.pendingRequestsCount > 0 && (
                    <button type="button" onClick={() => GetGroupMembers(group.id, 2)}>
                        {LocalizeText('group.pendingmembercount', ['amount'], [group.pendingRequestsCount.toString()])}
                    </button>
                )}
                {group.roomId > -1 && (
                    <button type="button" onClick={() => TryVisitRoom(group.roomId)}>
                        {LocalizeText('group.linktobase', ['room_name'], [group.roomName])}
                    </button>
                )}
                <button type="button" onClick={() => CreateLinkEvent(`catalog/open/${CatalogPageName.GUILD_CUSTOM_FURNI}`)}>
                    {LocalizeText('group.buyfurni')}
                </button>
                {group.hasForum && (
                    <button type="button" onClick={() => CreateLinkEvent(`groupforum/${group.id}`)}>
                        {LocalizeText('group.showforum')}
                    </button>
                )}
                {isOwner && (
                    <button type="button" onClick={() => GetGroupManager(group.id)}>
                        {LocalizeText('group.manage')}
                    </button>
                )}
            </div>
            {isPending && <span className="los-pf__note">{LocalizeText('group.membershippending')}</span>}
            {isOwner && <span className="los-pf__note">{LocalizeText('group.youareowner')}</span>}
            {!isOwner && isMember && (
                <button type="button" className="los-button" onClick={leave}>
                    {LocalizeText('group.leave')}
                </button>
            )}
            {canJoin && (
                <button type="button" className="los-button los-button--primary" onClick={() => TryJoinGroup(group.id)}>
                    {LocalizeText(group.type === GroupType.EXCLUSIVE ? 'group.requestmembership' : 'group.join')}
                </button>
            )}
        </div>
    );
};

const Groups: FC<{ userProfile: UserProfileParser; onLeaveGroup: () => void }> = ({ userProfile, onLeaveGroup }) => {
    const groups = userProfile.groups ?? [];
    const itsMe = userProfile.id === GetSessionDataManager().userId;
    const [selected, setSelected] = useState<number | null>(null);
    const [info, setInfo] = useState<GroupInformationParser | null>(null);
    const current = groups.some((group) => group.groupId === selected) ? selected : (groups[0]?.groupId ?? null);

    const onInfo = useCallback(
        (event: GroupInformationEvent) => {
            const parser = event.getParser();

            if (parser.id === current && !parser.flag) setInfo(parser);
        },
        [current]
    );

    useMessageEvent<GroupInformationEvent>(GroupInformationEvent, onInfo);

    useEffect(() => {
        setInfo(null);

        if (current) SendMessageComposer(new GroupInformationComposer(current, false));
    }, [groups, current]);

    return (
        <section className="los-pf__card">
            <h3>{LocalizeText('extendedprofile.groups.count', ['count'], [groups.length.toString()]).replace(/<[^>]+>/g, '')}</h3>
            {!groups.length ? (
                <div className="los-pf__empty">
                    <p>{LocalizeText(itsMe ? 'extendedprofile.nogroups.me' : 'extendedprofile.nogroups.user')}</p>
                    <button type="button" className="los-button" onClick={() => CreateLinkEvent('navigator/search/hotel_view/group:')}>
                        {LocalizeText('extendedprofile.nogroups.viewgroups')}
                    </button>
                </div>
            ) : (
                <>
                    <div className="los-pf__badges">
                        {groups.map((group) => (
                            <span key={group.groupId} className={`los-pf__gbadge${current === group.groupId ? ' is-active' : ''}`}>
                                <button type="button" aria-label={group.groupName} onClick={() => setSelected(group.groupId)}>
                                    <LayoutBadgeImageView badgeCode={group.badgeCode} isGroup />
                                </button>
                                {itsMe && (
                                    <button
                                        type="button"
                                        className="los-pf__fav"
                                        aria-label={LocalizeText(group.favourite ? 'group.clearfavourite' : 'group.makefavourite')}
                                        onClick={() => ToggleFavoriteGroup(group)}
                                    >
                                        <LosIcon name="bookmark" size={12} />
                                    </button>
                                )}
                            </span>
                        ))}
                    </div>
                    {info?.id === current && <GroupDetails group={info} onLeaveGroup={onLeaveGroup} />}
                </>
            )}
        </section>
    );
};

export const LosProfile: FC<LosProfileProps> = (props) => {
    const {
        userProfile,
        userBadges,
        userRelationships,
        isBlocked,
        isProfileHidden,
        windowPosition,
        onPositionChange,
        onToggleBlock,
        onOpenRooms,
        onLeaveGroup,
        onClose
    } = props;
    const { canRequestFriend } = useFriendsState();
    const { requestFriend } = useFriendsActions();
    const [requestSent, setRequestSent] = useState(userProfile.requestSent);
    const isOwn = userProfile.id === GetSessionDataManager().userId;
    const canAdd = !requestSent && !isOwn && !userProfile.isMyFriend && !userProfile.requestSent && canRequestFriend(userProfile.id);
    const native = userProfile.hasNativeProfileFields;
    const showPoints = GetConfigurationValue<boolean>('activity.point.display.enabled', false);
    const slots = useMemo(() => {
        const list: (IUserCurrentBadgeData | null)[] = Array(5).fill(null);

        for (const badge of userBadges) {
            const index = badge.slotId - 1;

            if (index >= 0 && index < list.length) list[index] = badge;
        }

        return list;
    }, [userBadges]);

    useEffect(() => {
        setRequestSent(userProfile.requestSent);
    }, [userProfile]);

    const status = userProfile.onlineStatus === 1 ? 'is-online' : userProfile.onlineStatus === 2 ? 'is-hidden' : '';

    return (
        <DraggableWindow
            uniqueKey="volt-user-profile"
            handleSelector=".los-window__bar"
            initialPosition={windowPosition}
            onPositionChange={onPositionChange}
            unconstrainedPosition
        >
            <LosWindow
                className="los-pf"
                icon="user"
                title={LocalizeText('extendedprofile.caption')}
                onClose={onClose}
                actions={
                    !isOwn && (
                        <button
                            type="button"
                            className={`los-window__button${isBlocked ? ' is-on' : ''}`}
                            aria-pressed={isBlocked}
                            title={
                                isBlocked
                                    ? localizeWithFallback('extendedprofile.unblock_player.title', 'Unblock user')
                                    : localizeWithFallback('extendedprofile.block_player.title', 'Block user')
                            }
                            onClick={onToggleBlock}
                        >
                            <LosIcon name="lock" size={14} />
                        </button>
                    )
                }
            >
                <div className="los-pf__body los-scroll">
                    <section className="los-pf__hero">
                        <div className="los-pf__avatar">
                            <ProfileAvatarImage figure={userProfile.figure} />
                        </div>
                        <div className="los-pf__who">
                            <h2>
                                {userProfile.username}
                                <i className={`los-pf__presence ${status}`} />
                            </h2>
                            <p className="los-pf__motto">{userProfile.motto}</p>
                            <p className="los-pf__meta">
                                {LocalizeText('extendedprofile.created')
                                    .replace(/%\w+%/g, '')
                                    .replace(/<[^>]+>/g, '')
                                    .trim()}{' '}
                                {userProfile.registration}
                            </p>
                            <p className="los-pf__meta">
                                {LocalizeText('extendedprofile.last.login')
                                    .replace(/%\w+%/g, '')
                                    .replace(/<[^>]+>/g, '')
                                    .trim()}{' '}
                                {userProfile.secondsSinceLastVisit < 0 ? '-' : FriendlyTime.format(userProfile.secondsSinceLastVisit, '.ago', 2)}
                            </p>
                            {showPoints && (
                                <p className="los-pf__meta">
                                    {LocalizeText('extendedprofile.activitypoints', ['activitypoints'], [userProfile.achievementPoints.toString()]).replace(
                                        /<[^>]+>/g,
                                        ''
                                    )}
                                </p>
                            )}
                            <div className="los-pf__actions">
                                {canAdd && (
                                    <button
                                        type="button"
                                        className="los-button los-button--primary"
                                        onClick={() => {
                                            requestFriend(userProfile.id, userProfile.username);
                                            setRequestSent(true);
                                        }}
                                    >
                                        <LosIcon name="plus" size={14} /> {LocalizeText('extendedprofile.addasafriend')}
                                    </button>
                                )}
                                {(isOwn || userProfile.isMyFriend) && (
                                    <span className="los-pf__tag">
                                        {LocalizeText(userProfile.isMyFriend ? 'extendedprofile.friend' : 'extendedprofile.me')}
                                    </span>
                                )}
                                {(requestSent || userProfile.requestSent) && (
                                    <span className="los-pf__tag">{LocalizeText('extendedprofile.friendrequestsent')}</span>
                                )}
                                {isOwn && (
                                    <>
                                        <button type="button" className="los-button" onClick={() => CreateLinkEvent('avatar-editor/show')}>
                                            {LocalizeText('extended.profile.change.looks')}
                                        </button>
                                        <button type="button" className="los-button" onClick={() => CreateLinkEvent('inventory/show/badges')}>
                                            {LocalizeText('extended.profile.change.badges')}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </section>
                    <div className="los-pf__slots">
                        {slots.map((badge, index) => (
                            <span
                                key={index}
                                className="los-pf__slot"
                                title={badge ? `${LocalizeBadgeName(badge.badgeCode)} - ${LocalizeBadgeDescription(badge.badgeCode)}` : undefined}
                            >
                                {badge && <LayoutBadgeImageView badgeCode={badge.badgeCode} />}
                            </span>
                        ))}
                    </div>
                    <div className="los-pf__stats">
                        <Stat icon="hotel" label={LocalizeText('extendedprofile.rooms')} onClick={onOpenRooms} />
                        <Stat
                            icon="trophy"
                            label={LocalizeText('inventory.badges')}
                            value={native ? userProfile.totalBadges : userBadges.length}
                            onClick={() => CreateLinkEvent('badge_leaderboard/0/-1/0')}
                        />
                        <Stat
                            icon="chart"
                            label={LocalizeText(native ? 'generic.level' : 'extendedprofile.achievementscore')}
                            value={native ? userProfile.level : userProfile.achievementPoints}
                        />
                        <Stat icon="group" label={LocalizeText('friendlist.friends')} value={userProfile.friendsCount < 0 ? '-' : userProfile.friendsCount} />
                    </div>
                    <section className="los-pf__card">
                        <h3>{LocalizeText('extendedprofile.relstatus')}</h3>
                        {userRelationships && <Relationships relationships={userRelationships} onClose={onClose} />}
                    </section>
                    {isProfileHidden ? (
                        <section className="los-pf__card">
                            <p className="los-pf__empty">{localizeWithFallback('profile.full_profile_hidden', 'The full profile of this user is hidden')}</p>
                        </section>
                    ) : (
                        <Groups userProfile={userProfile} onLeaveGroup={onLeaveGroup} />
                    )}
                </div>
            </LosWindow>
        </DraggableWindow>
    );
};
