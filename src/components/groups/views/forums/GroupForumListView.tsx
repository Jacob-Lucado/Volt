import { CreateLinkEvent, ForumData } from '@volt/renderer';
import { FC } from 'react';
import { GetGroupInformation, LocalizeText } from '../../../../api';
import { ClassicScrollAreaView, LayoutBadgeImageView } from '../../../../common';
import { SubpixelText } from '../../../../common/native-text/SubpixelText';
import { flatText, GroupText } from '../GroupNativeLayout';
import { FORUM_PAGE_SIZE, FORUM_SURFACE, stripTags, ForumButton, forumAge, ForumPager } from './GroupForumLayout';

/** ForumsListData: one answer to GetForumsList, as the forum window shows it. */
export interface GroupForumsListData {
    listCode: number;
    totalAmount: number;
    startIndex: number;
    forums: ForumData[];
}

interface GroupForumListViewProps {
    list: GroupForumsListData;
    onMarkAsRead: () => void;
    onOpenForum: (groupId: number) => void;
    onPage: (pageIndex: number) => void;
}

/** GroupForumView.openForumsList + ForumsListView: the page shown is the one the answer starts at, out of ceil(total / 20). */
export const GroupForumListView: FC<GroupForumListViewProps> = ({ list, onMarkAsRead, onOpenForum, onPage }) => {
    const { listCode, forums } = list;
    const pageIndex = Math.ceil(list.startIndex / FORUM_PAGE_SIZE);
    const pageCount = Math.ceil(list.totalAmount / FORUM_PAGE_SIZE);

    // "Did you know? You can get your own group forum <u><a href=...>here</a></u>.": the underlined link is its own html run.
    const status = LocalizeText('groupforum.view.forums_list.status');
    const linkMatch = status.match(/^(.*?)<u><a[^>]*>(.*?)<\/a><\/u>(.*)$/);
    const before = linkMatch ? stripTags(linkMatch[1]) : stripTags(status);
    const linkText = linkMatch ? linkMatch[2] : '';
    const after = linkMatch ? stripTags(linkMatch[3]) : '';
    const linkStart = [...before].length;
    const linkRange: [number, number] = [linkStart, linkStart + [...linkText].length];

    return (
        <>
            <GroupText background={FORUM_SURFACE} height={25} overrides={flatText(16, { bold: true, color: 0xa6a6a2 })} text={LocalizeText(`groupforum.view.forums_list.${listCode}`)} width={541} x={0} y={115} />
            <div className="volt-forum__list">
                <ClassicScrollAreaView className="volt-forum__scroll" contentClassName="volt-forum__scroll-content" minThumbSize={26} scrollStep={42}>
                    {forums.map((forum, rowIndex) => {
                        const isUnread = forum.unreadMessages > 0;
                        const background = rowIndex % 2 === 1 ? 0xb2e6fa : 0xeefeff;
                        const rowColor = '#' + background.toString(16).padStart(6, '0');
                        const details = stripTags(
                            LocalizeText(
                                'groupforum.view.forum_details',
                                ['RATING', 'LAST_AUTHOR_NAME', 'UPDATE_TIME'],
                                [String(forum.leaderboardScore), forum.lastMessageAuthorName, forumAge(forum.lastMessageTimeAsSecondsAgo)]
                            )
                        );

                        return (
                            <div key={forum.groupId} className="volt-forum__forum">
                                {/* group_icon: a group badge widget, its click asks for the group details (GetHabboGroupDetails, open). */}
                                <div className="volt-forum__forum-badge" style={{ background: rowColor }} onClick={() => GetGroupInformation(forum.groupId)}>
                                    <LayoutBadgeImageView badgeCode={forum.icon} isGroup={true} />
                                </div>
                                <div className="volt-forum__forum-body" style={{ left: 42, right: 101, background: rowColor }}>
                                    <GroupText background={background} overrides={isUnread ? { bold: true } : undefined} text={forum.name} x={0} y={0} />
                                    <GroupText background={background} overrides={{ size: 10 }} text={details} x={0} y={16} />
                                    {/* header_region: the 280x17 strip over the group name opens the forum. */}
                                    <div className="volt-forum__forum-header" role="button" onClick={() => onOpenForum(forum.groupId)} />
                                </div>
                                {/* unread_region: the message counts open the forum too. */}
                                <div className="volt-forum__forum-counts" role="button" style={{ right: 0, background: rowColor }} onClick={() => onOpenForum(forum.groupId)}>
                                    <GroupText
                                        background={background}
                                        overrides={flatText(10, { bold: isUnread })}
                                        text={LocalizeText('groupforum.view.thread_details1', ['TOTAL_MESSAGES', 'total_messages'], [String(forum.totalMessages), String(forum.totalMessages)])}
                                        x={0}
                                        y={0}
                                    />
                                    <GroupText
                                        background={background}
                                        overrides={flatText(10, { bold: isUnread })}
                                        text={LocalizeText('groupforum.view.thread_details2', ['NEW_MESSAGES', 'new_messages'], [String(forum.unreadMessages), String(forum.unreadMessages)])}
                                        x={0}
                                        y={15}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </ClassicScrollAreaView>
            </div>
            <div className="volt-forum__footer">
                <ForumButton label={LocalizeText('groupforum.view.mark_read')} width={95} x={10} onClick={onMarkAsRead} />
                <ForumPager pageCount={pageCount} pageIndex={pageIndex} onPage={onPage} />
            </div>
            {/* status: an auto size "center" html window, which AIR draws in sub-pixel mode. */}
            <div className="volt-forum__status is-list">
                <SubpixelText
                    html
                    align="field"
                    background={FORUM_SURFACE}
                    link={linkText ? { range: linkRange, onClick: () => CreateLinkEvent('catalog/open/guild_forum') } : undefined}
                    runs={linkText ? linkRange : undefined}
                    text={before + linkText + after}
                    textStyle="u_regular_11"
                    underline={linkText ? linkRange : false}
                    width={300}
                />
            </div>
        </>
    );
};
