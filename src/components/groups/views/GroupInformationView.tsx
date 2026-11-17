import {
    CreateLinkEvent,
    GetSessionDataManager,
    GroupConfirmMemberRemoveEvent,
    GroupDeleteComposer,
    GroupInformationParser,
    GroupRemoveMemberComposer
} from '@volt/renderer';
import { FC, useEffect, useLayoutEffect, useRef } from 'react';
import {
    CatalogPageName,
    GetGroupManager,
    GetGroupMembers,
    GroupMembershipType,
    GroupType,
    LocalizeText,
    SendMessageComposer,
    TryJoinGroup,
    TryVisitRoom
} from '../../../api';
import decorateIcon from '../../../assets/images/groups/native/group_decorate_icon.png';
import typeIconExclusive from '../../../assets/images/groups/native/grouptype_icon_1.png';
import typeIconPrivate from '../../../assets/images/groups/native/grouptype_icon_2.png';
import typeIconRegular from '../../../assets/images/groups/native/grouptype_icon_5.png';
import { LayoutBadgeImageView } from '../../../common';
import { LosIcon } from '../../../common/lucadoos';
import { useGroupMemberRemoval, useMessageEvent, useNotification } from '../../../hooks';

const TYPE_ICONS: string[] = [typeIconRegular, typeIconExclusive, typeIconPrivate];
const TYPE_HELP: string[] = ['regular', 'exclusive', 'private'];

interface GroupInformationViewProps {
    groupInformation: GroupInformationParser;
}

export const GroupInformationView: FC<GroupInformationViewProps> = (props) => {
    const { groupInformation = null } = props;
    const { showConfirm = null } = useNotification();
    const userId = GetSessionDataManager().userId;
    const shownGroupId = groupInformation?.id ?? 0;
    const shownGroupIdRef = useRef<number>(shownGroupId);
    const confirmOpenRef = useRef<boolean>(false);

    // Read by the confirmation callbacks; refreshed before any of them can run.
    useLayoutEffect(() => {
        shownGroupIdRef.current = shownGroupId;
    });

    // A confirmation belongs to the group it was asked for: showing another group (or closing the window) retires it.
    useEffect(() => {
        confirmOpenRef.current = false;
    }, [shownGroupId]);

    useEffect(
        () => () => {
            shownGroupIdRef.current = 0;
        },
        []
    );

    const { request: requestMemberRemoval, claimReply, isCurrentSession } = useGroupMemberRemoval();

    // The reply names no group (see useGroupMemberRemoval): it is shown only when this window owns the one outstanding request for the group still on screen.
    useMessageEvent<GroupConfirmMemberRemoveEvent>(GroupConfirmMemberRemoveEvent, (event) => {
        const parser = event.getParser();
        const removal = claimReply(parser.userId);

        if (!removal || removal.groupId !== shownGroupIdRef.current) return;

        let isSent = false;

        confirmOpenRef.current = true;
        showConfirm(
            LocalizeText(
                parser.furnitureCount > 0 ? 'group.leaveconfirm.desc' : 'group.leaveconfirm_nofurni.desc',
                ['amount'],
                [parser.furnitureCount.toString()]
            ),
            () => {
                confirmOpenRef.current = false;

                // One removal per confirmation, whatever re-renders or repeated callback invocations happen, and only while that group is shown and the same user is signed in.
                if (isSent || removal.groupId !== shownGroupIdRef.current || !isCurrentSession(removal)) return;

                isSent = true;
                SendMessageComposer(new GroupRemoveMemberComposer(removal.groupId, removal.userId));
            },
            () => {
                confirmOpenRef.current = false;
            },
            LocalizeText('generic.ok'),
            LocalizeText('generic.cancel'),
            LocalizeText('group.leaveconfirm.title')
        );
    });

    if (!groupInformation) return null;

    const isRealOwner = groupInformation.isOwner;
    const isMember = groupInformation.membershipType === GroupMembershipType.MEMBER;
    const isPending = groupInformation.membershipType === GroupMembershipType.REQUEST_PENDING;
    const isNotMember = groupInformation.membershipType === GroupMembershipType.NOT_MEMBER;

    const leaveGroup = () => {
        if (confirmOpenRef.current) return;

        requestMemberRemoval(groupInformation.id, userId);
    };

    const hasPendingLine = groupInformation.pendingRequestsCount > 0 && (groupInformation.isOwner || groupInformation.isAdmin);

    const deleteGroup = () => {
        let isSent = false;

        showConfirm(
            LocalizeText('group.deleteconfirm.desc'),
            () => {
                // One deletion per confirmation, and only while that group is the one shown.
                if (isSent || groupInformation.id !== shownGroupIdRef.current) return;

                isSent = true;
                SendMessageComposer(new GroupDeleteComposer(groupInformation.id));
            },
            null,
            null,
            null,
            LocalizeText('group.deleteconfirm.title')
        );
    };

    const handleAction = (action: string) => {
        switch (action) {
            case 'members':
                GetGroupMembers(groupInformation.id, 0);
                break;
            case 'members_pending':
                GetGroupMembers(groupInformation.id, 2);
                break;
            case 'manage':
                GetGroupManager(groupInformation.id);
                break;
            case 'homeroom':
                TryVisitRoom(groupInformation.roomId);
                break;
            case 'furniture':
                CreateLinkEvent('catalog/open/' + CatalogPageName.GUILD_CUSTOM_FURNI);
                break;
            case 'popular_groups':
                CreateLinkEvent('navigator/search/hotel_view/group:');
                break;
            case 'forum':
                CreateLinkEvent('groupforum/' + groupInformation.id);
                break;
        }
    };

    const role = groupInformation.isAdmin ? 'admin' : 'member';

    return (
        <div className="los-grp">
            <section className="los-grp__hero">
                <div className="los-grp__badge">
                    <LayoutBadgeImageView badgeCode={groupInformation.badge} isGroup={true} scale={2} />
                </div>
                <div className="los-grp__who">
                    <h2>
                        {groupInformation.title}
                        <img
                            alt=""
                            draggable={false}
                            src={TYPE_ICONS[groupInformation.type]}
                            title={LocalizeText(`group.edit.settings.type.${TYPE_HELP[groupInformation.type]}.help`)}
                        />
                        {groupInformation.canMembersDecorate && (
                            <img alt="" draggable={false} src={decorateIcon} title={LocalizeText('group.memberscandecorate')} />
                        )}
                    </h2>
                    <small>{LocalizeText('group.created', ['date', 'owner'], [groupInformation.createdAt, groupInformation.ownerName])}</small>
                    {!!groupInformation.description && <p>{groupInformation.description}</p>}
                </div>
            </section>
            <div className="los-grp__links">
                <button type="button" onClick={() => handleAction('members')}>
                    <LosIcon name="group" size={14} /> {LocalizeText('group.membercount', ['totalMembers'], [groupInformation.membersCount.toString()])}
                </button>
                {hasPendingLine && (
                    <button type="button" onClick={() => handleAction('members_pending')}>
                        <LosIcon name="bell" size={14} />{' '}
                        {LocalizeText('group.pendingmembercount', ['amount'], [groupInformation.pendingRequestsCount.toString()])}
                    </button>
                )}
                <button type="button" onClick={() => handleAction('homeroom')}>
                    <LosIcon name="home" size={14} /> {LocalizeText('group.linktobase')}
                </button>
                <button type="button" onClick={() => handleAction('furniture')}>
                    <LosIcon name="bag" size={14} /> {LocalizeText('group.buyfurni')}
                </button>
                <button type="button" onClick={() => handleAction('popular_groups')}>
                    <LosIcon name="search" size={14} /> {LocalizeText('group.showgroups')}
                </button>
                {groupInformation.hasForum && (
                    <button type="button" onClick={() => handleAction('forum')}>
                        <LosIcon name="chat" size={14} /> {LocalizeText('group.showforum')}
                    </button>
                )}
                {groupInformation.isOwner && (
                    <>
                        <button type="button" onClick={() => handleAction('manage')}>
                            <LosIcon name="gear" size={14} /> {LocalizeText('group.manage')}
                        </button>
                        <button type="button" className="is-danger" onClick={deleteGroup}>
                            <LosIcon name="trash" size={14} /> {LocalizeText('group.delete')}
                        </button>
                    </>
                )}
            </div>
            <div className="los-grp__foot">
                {isRealOwner && <span className="los-grp__tag">{LocalizeText('group.youareowner')}</span>}
                {isMember && !isRealOwner && <span className="los-grp__tag">{LocalizeText(`group.youare${role}`)}</span>}
                {isMember && !isRealOwner && (
                    <button type="button" className="los-button" onClick={leaveGroup}>
                        {LocalizeText('group.leave')}
                    </button>
                )}
                {isNotMember && (groupInformation.type === GroupType.REGULAR || groupInformation.type === GroupType.EXCLUSIVE) && (
                    <button type="button" className="los-button los-button--primary" onClick={() => TryJoinGroup(groupInformation.id)}>
                        {LocalizeText(groupInformation.type === GroupType.EXCLUSIVE ? 'group.requestmembership' : 'group.join')}
                    </button>
                )}
                {isPending && <span className="los-grp__tag">{LocalizeText('group.membershippending')}</span>}
            </div>
        </div>
    );
};
