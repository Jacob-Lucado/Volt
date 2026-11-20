import {
    AddLinkEventTracker,
    GetSessionDataManager,
    GroupAdminGiveComposer,
    GroupAdminTakeComposer,
    GroupConfirmMemberRemoveEvent,
    GroupInformationComposer,
    GroupInformationEvent,
    GroupMemberParser,
    GroupMembersComposer,
    GroupMembersEvent,
    GroupMembershipAcceptComposer,
    GroupMembershipDeclineComposer,
    GroupMembersParser,
    GroupMembersRefreshEvent,
    GroupMemberUpdateEvent,
    GroupRank,
    GroupRemoveMemberComposer,
    HabboGroupDeactivatedMessageEvent,
    ILinkEventTracker,
    RemoveLinkEventTracker
} from '@volt/renderer';
import { FC, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { GetUserProfile, LocalizeText, SendMessageComposer } from '../../../api';
import previousIcon from '../../../assets/images/avatar-menu/air/arrow-left.png';
import nextIcon from '../../../assets/images/avatar-menu/air/arrow-right.png';
import adminOnIcon from '../../../assets/images/groups/members/icon_admin_off.png';
import adminOffIcon from '../../../assets/images/groups/members/icon_admin_over.png';
import closeIcon from '../../../assets/images/groups/members/icon_close_off.png';
import closeOverIcon from '../../../assets/images/groups/members/icon_close_over.png';
import ownerIcon from '../../../assets/images/groups/members/icon_owner.png';
import { LayoutAvatarImageView, LayoutBadgeImageView, VoltCardHeaderView, VoltCardView } from '../../../common';
import { HabboDropMenuView } from '../../../common/dropmenu/HabboDropMenuView';
import { useGroupMemberRemoval, useMessageEvent, useNotification } from '../../../hooks';
import { flatText, GroupInput, GroupText, GroupWindowTitle } from './GroupNativeLayout';

export const GroupMembersView: FC<{}> = (props) => {
    const [groupId, setGroupId] = useState<number>(-1);
    const [levelId, setLevelId] = useState<number>(-1);
    const [membersData, setMembersData] = useState<GroupMembersParser>(null);
    const [pageId, setPageId] = useState<number>(-1);
    const [totalPages, setTotalPages] = useState<number>(0);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [isOwner, setIsOwner] = useState(false);
    const pendingRemoval = useRef<{ groupId: number; userId: number; name: string }>(null);
    const { showConfirm = null } = useNotification();
    const { request: requestMemberRemoval, claimReply, isCurrentSession } = useGroupMemberRemoval();
    const groupIdRef = useRef<number>(-1);

    // Read by the removal confirmation callback; refreshed before it can run.
    useLayoutEffect(() =>
    {
        groupIdRef.current = groupId;
    });

    const pendingActionsRef = useRef<Set<string>>(new Set());

    const refreshMembers = useCallback(() => {
        if (groupId === -1 || levelId === -1 || pageId === -1) return;

        SendMessageComposer(new GroupMembersComposer(groupId, pageId, searchQuery, levelId));
    }, [groupId, levelId, pageId, searchQuery]);

    const toggleAdmin = (member: GroupMemberParser) => {
        if (!isOwner || member.rank === GroupRank.OWNER) return;

        const key = `admin_${member.id}`;
        if (pendingActionsRef.current.has(key)) return;
        pendingActionsRef.current.add(key);
        setTimeout(() => pendingActionsRef.current.delete(key), 2000);

        if (member.rank !== GroupRank.ADMIN) SendMessageComposer(new GroupAdminGiveComposer(membersData.groupId, member.id));
        else SendMessageComposer(new GroupAdminTakeComposer(membersData.groupId, member.id));
    };

    const acceptMembership = (member: GroupMemberParser) => {
        if (!membersData.admin || member.rank !== GroupRank.REQUESTED) return;

        const key = `accept_${member.id}`;
        if (pendingActionsRef.current.has(key)) return;
        pendingActionsRef.current.add(key);
        setTimeout(() => pendingActionsRef.current.delete(key), 2000);

        SendMessageComposer(new GroupMembershipAcceptComposer(membersData.groupId, member.id));
    };

    // The server answers a removal request only for these members: never the owner or oneself, and an administrator only when the owner asks.
    const canRemoveMember = (member: GroupMemberParser) => !!membersData?.admin && member.rank !== GroupRank.OWNER && member.id !== GetSessionDataManager().userId && (member.rank !== GroupRank.ADMIN || isOwner);

    const removeMemberOrDeclineMembership = (member: GroupMemberParser) => {
        if (!canRemoveMember(member)) return;

        const key = `remove_${member.id}`;
        if (pendingActionsRef.current.has(key)) return;
        pendingActionsRef.current.add(key);
        setTimeout(() => pendingActionsRef.current.delete(key), 2000);

        if (member.rank === GroupRank.REQUESTED) {
            SendMessageComposer(new GroupMembershipDeclineComposer(membersData.groupId, member.id));

            return;
        }

        // One outstanding GroupConfirmRemoveMember for all group windows; when another is still unresolved nothing is sent.
        if (requestMemberRemoval(membersData.groupId, member.id)) pendingRemoval.current = { groupId: membersData.groupId, userId: member.id, name: member.name };
    };

    useMessageEvent<GroupMembersEvent>(GroupMembersEvent, (event) => {
        const parser = event.getParser();
        const normalizedLevel = !parser.admin && levelId >= 2 && parser.level === 0;

        if (parser.groupId !== groupId || parser.query !== searchQuery || parser.pageIndex !== pageId) return;
        if (parser.level !== levelId && !normalizedLevel) return;

        setMembersData(parser);
        setLevelId(parser.level);
        setTotalPages(Math.ceil(parser.totalMembersCount / parser.pageSize));
    });

    useMessageEvent<GroupInformationEvent>(GroupInformationEvent, (event) =>
    {
        const parser = event.getParser();
        if (parser.id === groupId) setIsOwner(parser.isOwner);
    });

    useMessageEvent<GroupMemberUpdateEvent>(GroupMemberUpdateEvent, (event) => {
        if (event.getParser().groupId !== groupId) return;

        refreshMembers();
    });

    useMessageEvent<GroupMembersRefreshEvent>(GroupMembersRefreshEvent, (event) => {
        if (event.getParser().groupId !== groupId) return;

        refreshMembers();
    });

    useMessageEvent<GroupConfirmMemberRemoveEvent>(GroupConfirmMemberRemoveEvent, (event) => {
        const parser = event.getParser();
        const owned = claimReply(parser.userId);
        const removal = pendingRemoval.current;

        if (!owned || !removal || removal.groupId !== owned.groupId || removal.groupId !== groupId || removal.userId !== owned.userId) return;

        pendingRemoval.current = null;

        let isSent = false;

        showConfirm(
            LocalizeText(
                parser.furnitureCount > 0 ? 'group.kickconfirm.desc' : 'group.kickconfirm_nofurni.desc',
                ['user', 'amount'],
                [removal.name, parser.furnitureCount.toString()]
            ),
            () => {
                // Valid only while this window still shows that group for the same signed-in user.
                if (isSent || removal.groupId !== groupIdRef.current || !isCurrentSession(owned)) return;

                isSent = true;
                SendMessageComposer(new GroupRemoveMemberComposer(removal.groupId, removal.userId));
            },
            null
        );
    });

    useMessageEvent<HabboGroupDeactivatedMessageEvent>(HabboGroupDeactivatedMessageEvent, (event) =>
    {
        if (event.getParser().groupId === groupId) setGroupId(-1);
    });

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length < 2) return;

                const groupId = parseInt(parts[1]) || -1;
                const levelId = Number.isInteger(parseInt(parts[2])) ? parseInt(parts[2]) : 0;

                setGroupId(groupId);
                setLevelId(levelId);
                setPageId(0);
            },
            eventUrlPrefix: 'group-members/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, []);

    useEffect(() => {
        setPageId(0);
    }, [groupId, levelId, searchQuery]);

    useEffect(() => {
        if (groupId === -1 || levelId === -1 || pageId === -1) return;

        SendMessageComposer(new GroupMembersComposer(groupId, pageId, searchQuery, levelId));
    }, [groupId, levelId, pageId, searchQuery]);

    useEffect(() => {
        pendingRemoval.current = null;

        if (groupId === -1) return;

        setMembersData(null);
        setTotalPages(0);
        setSearchQuery('');
        setIsOwner(false);
        SendMessageComposer(new GroupInformationComposer(groupId, false));
    }, [groupId]);

    if (groupId === -1 || !membersData) return null;

    const sessionUserId = GetSessionDataManager().userId;
    const pageCount = Math.max(1, totalPages);
    const [pageTextStart, pageTextEnd] = LocalizeText('group.members.pageinfo', ['amount', 'totalPages'], [membersData.totalMembersCount.toString(), pageCount.toString()]).split('%page%');

    return (
        <VoltCardView
            aria-label={LocalizeText('group.members.title', ['groupName'], [membersData.groupTitle])}
            className="volt-group-members"
            frameStyle={3}
            isResizable={false}
            role="dialog"
            uniqueKey="group-members"
        >
            <VoltCardHeaderView headerText="" onCloseClick={() => setGroupId(-1)} />
            <GroupWindowTitle title={LocalizeText('group.members.title', ['groupName'], [membersData.groupTitle])} width={352} />
            <div className="volt-group-members__badge" style={{ left: 27, top: 55 }}>
                <LayoutBadgeImageView badgeCode={membersData.badge} isGroup={true} />
            </div>
            <GroupInput
                height={25}
                infoText={LocalizeText('group.members.searchinfo')}
                label={LocalizeText('group.members.searchinfo')}
                maxLength={32}
                value={searchQuery}
                width={214}
                x={88}
                y={47}
                onChange={setSearchQuery}
            />
            <HabboDropMenuView
                label={LocalizeText('group.members.search.all')}
                nativeCaption
                options={[
                    { value: 0, label: LocalizeText('group.members.search.all') },
                    { value: 1, label: LocalizeText('group.members.search.admins') },
                    ...(membersData.admin ? [{ value: 2, label: LocalizeText('group.members.search.pending') }] : [])
                ]}
                skinStyle={3}
                style={{ position: 'absolute', left: 88, top: 81, width: 243, height: 25 }}
                value={levelId}
                onSelect={(value) => setLevelId(value)}
            />
            <div className="volt-group-members__list">
                {membersData.result.map((member, index) => {
                    const isSelf = member.id === sessionUserId;
                    const isOwnerEntry = member.rank === GroupRank.OWNER;
                    const isAdmin = isOwnerEntry || member.rank === GroupRank.ADMIN;
                    const isMember = member.rank !== GroupRank.REQUESTED;
                    const showAction = !isSelf && membersData.admin && (isOwnerEntry || !isMember || isOwner);
                    const actionKey = isOwnerEntry ? 'group.members.owner' : isAdmin ? 'group.members.removerights' : isMember ? 'group.members.giverights' : 'group.members.accept';
                    const runAction = () => {
                        if (isOwnerEntry) return;

                        if (isMember) toggleAdmin(member);
                        else acceptMembership(member);
                    };

                    return (
                        <div key={member.id} className="volt-group-members__entry" style={{ left: (index % 2) * 169, top: Math.floor(index / 2) * 40 }}>
                            <div className="volt-group-members__entry-bg" title={LocalizeText('group.members.showinfo')} onClick={() => GetUserProfile(member.id)} />
                            <div className="volt-group-members__head">
                                <LayoutAvatarImageView direction={2} figure={member.figure} headOnly nativeCroppedHead />
                            </div>
                            <GroupText background={0xffffff} className="is-static" overrides={flatText(11)} text={member.name} textStyle="u_bold" x={33} y={1} />
                            {isMember && (isAdmin || membersData.admin) && (
                                <img alt="" className="volt-group-members__icon" draggable={false} src={isAdmin ? adminOnIcon : adminOffIcon} style={{ left: 33, top: 15 }} />
                            )}
                            {isOwnerEntry && <img alt="" className="volt-group-members__icon" draggable={false} src={ownerIcon} style={{ left: 34, top: 15 }} />}
                            {showAction && (
                                <div className="volt-group-members__action" style={{ left: 51, top: 14 }} onClick={runAction}>
                                    <GroupText background={0xffffff} className="is-static" overrides={flatText(11, { color: 0x6f6e65, underline: !isOwnerEntry })} text={LocalizeText(actionKey)} x={0} y={0} />
                                </div>
                            )}
                            {!showAction && !!member.joinedAt && (
                                <GroupText
                                    background={0xffffff}
                                    className="is-static"
                                    overrides={{ color: 0x666666, italic: true }}
                                    text={LocalizeText('group.members.since', ['date'], [member.joinedAt])}
                                    textStyle="u_small"
                                    x={50}
                                    y={15}
                                />
                            )}
                            {canRemoveMember(member) && (
                                <div
                                    className="volt-group-members__remove"
                                    style={{ left: 146, top: 1 }}
                                    title={LocalizeText(isMember ? 'group.members.kick' : 'group.members.reject')}
                                    onClick={() => removeMemberOrDeclineMembership(member)}
                                >
                                    <img alt="" draggable={false} src={closeOverIcon} />
                                    <img alt="" className="volt-group-members__remove-off" draggable={false} src={closeIcon} />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            {pageId > 0 && (
                <button aria-label={LocalizeText('generic.previous')} className="volt-group-native__button volt-group-members__pager" style={{ left: 10, top: 396 }} type="button" onClick={() => setPageId((value) => Math.max(0, value - 1))}>
                    <img alt="" draggable={false} src={previousIcon} style={{ left: 16, top: 2 }} />
                </button>
            )}
            {pageId < pageCount - 1 && (
                <button aria-label={LocalizeText('generic.next')} className="volt-group-native__button volt-group-members__pager" style={{ left: 293, top: 396 }} type="button" onClick={() => setPageId((value) => Math.min(pageCount - 1, value + 1))}>
                    <img alt="" draggable={false} src={nextIcon} style={{ left: 19, top: 2 }} />
                </button>
            )}
            <div className="volt-group-members__pages">
                <GroupText className="is-static" text={pageTextStart ?? ''} x={0} y={0} />
                <input
                    aria-label={LocalizeText('group.members.pageinfo')}
                    className="volt-group-members__page-input"
                    value={membersData.pageIndex + 1}
                    onChange={(event) => {
                        const value = Math.min(Math.max(parseInt(event.target.value) || 1, 1), pageCount);

                        setPageId(value - 1);
                    }}
                />
                <GroupText className="is-static" text={pageTextEnd ?? ''} x={0} y={0} />
            </div>
        </VoltCardView>
    );
};
