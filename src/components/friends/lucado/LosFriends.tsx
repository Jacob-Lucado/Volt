import {
    AddLinkEventTracker,
    HabboSearchComposer,
    HabboSearchResultData,
    ILinkEventTracker,
    RemoveFriendComposer,
    RemoveLinkEventTracker,
    SendRoomInviteComposer
} from '@volt/renderer';
import { FC, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { GetConfigurationValue, GetUserProfile, LocalizeText, MessengerFriend, MessengerRequest, OpenMessengerChat, SendMessageComposer } from '../../../api';
import { DraggableWindow, DraggableWindowPosition, LayoutBadgeImageView } from '../../../common';
import { LosIcon, LosIconName, LosWindow } from '../../../common/lucadoos';
import { useFriends, useNotificationActions } from '../../../hooks';
import { FriendsListFaceView } from '../views/friends-list/friends-list-group/FriendsListGroupItemView';

type Panel = 'friends' | 'requests' | 'search';

const RELATIONSHIPS: { type: string; icon: LosIconName }[] = [
    { type: 'none', icon: 'close' },
    { type: 'heart', icon: 'heart' },
    { type: 'smile', icon: 'info' },
    { type: 'bobba', icon: 'hidden' }
];

const Face: FC<{ figure: string; id: number }> = ({ figure, id }) => (
    <span className="los-fl__face">
        {!!figure && (id < 0 ? <LayoutBadgeImageView badgeCode={figure} isGroup scale={0.5} showInfo={false} /> : <FriendsListFaceView figure={figure} />)}
    </span>
);

const FriendRow: FC<{ friend: MessengerFriend; selected: boolean; onSelect: (id: number) => void }> = ({ friend, selected, onSelect }) => {
    const { followFriend, updateRelationship } = useFriends();
    const [menu, setMenu] = useState(false);
    const hasRelationship = friend.id > 0 && GetConfigurationValue<boolean>('relationship.status.enabled', false);
    const hasChat =
        friend.online ||
        (GetConfigurationValue<boolean>('friend_list.persistent_message_status.enabled', false) && (friend.persistedMessageUser || friend.pocketHabboUser));
    const name = friend.realName ? `${friend.name} (${friend.realName})` : friend.name;
    const relation = RELATIONSHIPS[friend.relationshipStatus] ?? RELATIONSHIPS[0];

    return (
        <div
            className={`los-fl__row${selected ? ' is-selected' : ''}`}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(friend.id)}
            onDoubleClick={() => friend.online && OpenMessengerChat(friend.id)}
            onKeyDown={(event) => {
                if (event.target === event.currentTarget && event.key === 'Enter') onSelect(friend.id);
            }}
        >
            <Face figure={friend.figure} id={friend.id} />
            <span className={`los-fl__dot${friend.online ? ' is-online' : ''}`} />
            <span className="los-fl__name">{name}</span>
            <span className="los-fl__actions" onClick={(event) => event.stopPropagation()}>
                {hasRelationship && (
                    <span className="los-fl__rel">
                        <button type="button" title={LocalizeText('friendlist.tip.relationship')} onClick={() => setMenu((value) => !value)}>
                            <LosIcon name={relation.icon} size={14} />
                        </button>
                        {menu && (
                            <span className="los-fl__menu">
                                {RELATIONSHIPS.map((item, index) => (
                                    <button
                                        key={item.type}
                                        type="button"
                                        title={LocalizeText(`relationship.status.${item.type}`)}
                                        onClick={() => {
                                            updateRelationship(friend, index);
                                            setMenu(false);
                                        }}
                                    >
                                        <LosIcon name={item.icon} size={14} />
                                    </button>
                                ))}
                            </span>
                        )}
                    </span>
                )}
                {friend.id > 0 && (
                    <button type="button" title={LocalizeText('infostand.profile.link.tooltip')} onClick={() => GetUserProfile(friend.id)}>
                        <LosIcon name="user" size={14} />
                    </button>
                )}
                {friend.followingAllowed && (
                    <button type="button" title={LocalizeText('friendlist.tip.follow')} onClick={() => followFriend(friend)}>
                        <LosIcon name="compass" size={14} />
                    </button>
                )}
                {hasChat && (
                    <button type="button" title={LocalizeText('friendlist.tip.im')} onClick={() => OpenMessengerChat(friend.id)}>
                        <LosIcon name="chat" size={14} />
                    </button>
                )}
            </span>
        </div>
    );
};

const Section: FC<{ title: string; count: number; open: boolean; onToggle: () => void; children: React.ReactNode }> = ({
    title,
    count,
    open,
    onToggle,
    children
}) => (
    <section className="los-fl__section">
        <button type="button" className="los-fl__section-head" aria-expanded={open} onClick={onToggle}>
            <LosIcon name="chevron" size={12} />
            <span>{title}</span>
            <em>{count}</em>
        </button>
        {open && <div className="los-fl__list">{children}</div>}
    </section>
);

const Requests: FC = () => {
    const { requestRows: requests = [], requestResponse } = useFriends();
    const pending = requests.filter((request) => request.state === MessengerRequest.PENDING).length;

    return (
        <>
            <div className="los-fl__list los-scroll">
                {requests.map((request) => (
                    <div key={request.id} className="los-fl__row" role="button" tabIndex={0} onClick={() => GetUserProfile(request.requesterUserId)}>
                        <span className="los-fl__face" />
                        <span className="los-fl__name">{request.name}</span>
                        {request.state === MessengerRequest.PENDING ? (
                            <span className="los-fl__actions" onClick={(event) => event.stopPropagation()}>
                                <button type="button" title={LocalizeText('friendlist.tip.accept')} onClick={() => requestResponse(request.id, true)}>
                                    <LosIcon name="check" size={14} />
                                </button>
                                <button type="button" title={LocalizeText('friendlist.tip.decline')} onClick={() => requestResponse(request.id, false)}>
                                    <LosIcon name="close" size={14} />
                                </button>
                            </span>
                        ) : (
                            <span className="los-fl__outcome">
                                {LocalizeText(
                                    request.state === MessengerRequest.ACCEPTED
                                        ? 'friendlist.request.accepted'
                                        : request.state === MessengerRequest.DECLINED
                                          ? 'friendlist.request.declined'
                                          : 'friendlist.request.failed'
                                )}
                            </span>
                        )}
                    </div>
                ))}
            </div>
            <footer className="los-fl__foot">
                <button type="button" className="los-button los-button--primary" disabled={!pending} onClick={() => requestResponse(-1, true)}>
                    {LocalizeText('friendlist.requests.acceptall')}
                </button>
                <button type="button" className="los-button" disabled={!pending} onClick={() => requestResponse(-1, false)}>
                    {LocalizeText('friendlist.requests.dismissall')}
                </button>
            </footer>
        </>
    );
};

const Search: FC = () => {
    const { sentRequests, requestFriend, searchResults, searchValue, setSearchValue } = useFriends();
    const { friends: friendResults, others: otherResults } = searchResults;
    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const value = searchValue.trim();

        if (value.length) SendMessageComposer(new HabboSearchComposer(value));
    };
    const heading = (kind: 'friends' | 'others', count: number) =>
        LocalizeText(count ? `friendlist.search.${kind}caption` : `friendlist.search.no${kind}found`, ['cnt'], [String(count)]);
    const row = (result: HabboSearchResultData, other: boolean) => (
        <div key={result.avatarId} className="los-fl__row" role="button" tabIndex={0} onClick={() => result.avatarId > 0 && GetUserProfile(result.avatarId)}>
            <Face figure={result.avatarFigure} id={result.avatarId} />
            <span className="los-fl__name">{result.avatarName}</span>
            <span className="los-fl__actions" onClick={(event) => event.stopPropagation()}>
                {!other && (result.isAvatarOnline || GetConfigurationValue<boolean>('friend_list.persistent_message_status.enabled', false)) && (
                    <button type="button" title={LocalizeText('friendlist.tip.im')} onClick={() => OpenMessengerChat(result.avatarId)}>
                        <LosIcon name="chat" size={14} />
                    </button>
                )}
                {other && !sentRequests.includes(result.avatarId) && (
                    <button type="button" title={LocalizeText('friendlist.tip.addfriend')} onClick={() => requestFriend(result.avatarId, result.avatarName)}>
                        <LosIcon name="plus" size={14} />
                    </button>
                )}
            </span>
        </div>
    );

    return (
        <>
            <div className="los-fl__list los-scroll">
                <h4 className="los-fl__heading">{heading('friends', friendResults.length)}</h4>
                {friendResults.map((result) => row(result, false))}
                <h4 className="los-fl__heading">{heading('others', otherResults.length)}</h4>
                {otherResults.map((result) => row(result, true))}
            </div>
            <form className="los-fl__foot" onSubmit={submit}>
                <input
                    className="los-input"
                    value={searchValue}
                    placeholder={LocalizeText('generic.search')}
                    onChange={(event) => setSearchValue(event.target.value)}
                />
                <button type="submit" className="los-button los-button--primary">
                    {LocalizeText('generic.search')}
                </button>
            </form>
        </>
    );
};

const Dialog: FC<{ icon: LosIconName; title: string; onClose: () => void; children: React.ReactNode }> = ({ icon, title, onClose, children }) =>
    createPortal(
        <div className="los-dialog-backdrop">
            <div className="los-window los-dialog los-fl__dialog" role="dialog" aria-modal="true" aria-label={title}>
                <header className="los-window__bar">
                    <LosIcon name={icon} />
                    <span className="los-window__title">{title}</span>
                    <span className="los-window__actions">
                        <button
                            type="button"
                            className="los-window__button los-window__button--close"
                            aria-label={LocalizeText('generic.close')}
                            onClick={onClose}
                        >
                            <LosIcon name="close" size={14} />
                        </button>
                    </span>
                </header>
                <div className="los-window__body los-fl__dialog-body">{children}</div>
            </div>
        </div>,
        document.body
    );

export const LosFriends: FC = () => {
    const [visible, setVisible] = useState(false);
    const [panel, setPanel] = useState<Panel>('friends');
    const [selected, setSelected] = useState<number[]>([]);
    const [filter, setFilter] = useState('');
    const [closed, setClosed] = useState<Set<number>>(() => new Set([-1]));
    const [invite, setInvite] = useState<{ ids: number[]; caption: string } | null>(null);
    const [inviteText, setInviteText] = useState('');
    const [removal, setRemoval] = useState<{ ids: number[]; caption: string } | null>(null);
    const lastInvite = useRef(-Infinity);
    const { simpleAlert } = useNotificationActions();
    const { onlineFriends = [], offlineFriends = [], requestRows: requests = [], settings, requestFriend, clearRequestOutcomes } = useFriends();

    const open = useCallback(
        (value: boolean) => {
            if (!value) clearRequestOutcomes();
            setVisible(value);
        },
        [clearRequestOutcomes]
    );

    useEffect(() => {
        const tracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length < 2) return;

                switch (parts[1]) {
                    case 'show':
                        open(true);
                        return;
                    case 'hide':
                        open(false);
                        return;
                    case 'toggle':
                        open(!visible);
                        return;
                    case 'search':
                        if (visible && panel === 'search') {
                            open(false);
                            return;
                        }
                        setPanel('search');
                        open(true);
                        return;
                    case 'request':
                        if (parts.length >= 4) requestFriend(parseInt(parts[2]), parts[3]);
                }
            },
            eventUrlPrefix: 'friends/'
        };

        AddLinkEventTracker(tracker);

        return () => RemoveLinkEventTracker(tracker);
    }, [open, visible, panel, requestFriend]);

    useEffect(() => {
        if (panel === 'requests' && !requests.length) setPanel('friends');
    }, [panel, requests.length]);

    const groups = useMemo(() => {
        const match = (friend: MessengerFriend) => !filter || friend.name.toLowerCase().includes(filter.toLowerCase());
        const online = onlineFriends.filter((friend) => friend.categoryId === 0);

        return [
            {
                id: 0,
                name: settings?.categories.find((category) => category.id === 0)?.name ?? LocalizeText('friendlist.friends'),
                friends: online.filter(match)
            },
            {
                id: -1,
                name: settings?.categories.find((category) => category.id === -1)?.name ?? LocalizeText('friendlist.friends.offlinecaption'),
                friends: offlineFriends.filter(match)
            }
        ];
    }, [onlineFriends, offlineFriends, settings, filter]);

    const toggleSelect = (id: number) => {
        if (id < 0) return;

        setSelected((previous) => (previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id]));
    };

    const chosen = () => {
        const all = [...onlineFriends.filter((friend) => friend.categoryId === 0), ...offlineFriends].filter((friend) => selected.includes(friend.id));

        return { ids: all.map((friend) => friend.id), names: all.map((friend) => friend.name) };
    };

    const startInvite = () => {
        if (!selected.length) return;

        if (Date.now() - lastInvite.current < 60000) {
            simpleAlert(LocalizeText('friendlist.invite.frequentalert.text'), null, null, null, LocalizeText('friendlist.invite.frequentalert.title'));
            return;
        }

        const { ids } = chosen();

        setInviteText('');
        setInvite({ ids, caption: LocalizeText('friendlist.invite.summary', ['count'], [String(ids.length)]) });
    };

    const startRemove = () => {
        if (!selected.length) return;

        const { ids, names } = chosen();

        setRemoval({ ids, caption: LocalizeText('friendlist.removefriendconfirm.userlist', ['user_names'], [names.join(', ')]) });
    };

    const sendInvite = () => {
        if (!invite) return;

        if (!inviteText) {
            simpleAlert(LocalizeText('friendlist.invite.emptyalert.text'), null, null, null, LocalizeText('friendlist.invite.emptyalert.title'));
            setInvite(null);
            return;
        }

        SendMessageComposer(new SendRoomInviteComposer(inviteText, invite.ids));
        lastInvite.current = Date.now();
        setInvite(null);
    };

    if (!visible) return null;

    const tabs: { id: Panel; label: string; badge?: number }[] = [
        { id: 'friends', label: LocalizeText('friendlist.friends') },
        ...(requests.length ? [{ id: 'requests' as Panel, label: LocalizeText('friendlist.tab.friendrequests'), badge: requests.length }] : []),
        { id: 'search', label: LocalizeText('generic.search') }
    ];

    return (
        <>
            <DraggableWindow
                uniqueKey="volt-friends"
                handleSelector=".los-window__bar"
                windowPosition={DraggableWindowPosition.TOP_LEFT}
                offsetLeft={60}
                offsetTop={0}
            >
                <LosWindow className="los-fl" icon="group" title={LocalizeText('friendlist.friends')} onClose={() => open(false)}>
                    <nav className="los-tabs">
                        {tabs.map((tab) => (
                            <button key={tab.id} type="button" className={`los-tab${panel === tab.id ? ' is-active' : ''}`} onClick={() => setPanel(tab.id)}>
                                {tab.label}
                                {!!tab.badge && <b className="los-fl__badge">{tab.badge}</b>}
                            </button>
                        ))}
                    </nav>
                    {panel === 'friends' && (
                        <>
                            <div className="los-fl__list los-scroll">
                                {groups.map((group) => (
                                    <Section
                                        key={group.id}
                                        title={group.name}
                                        count={group.friends.length}
                                        open={!closed.has(group.id)}
                                        onToggle={() =>
                                            setClosed((previous) => {
                                                const next = new Set(previous);

                                                if (next.has(group.id)) next.delete(group.id);
                                                else next.add(group.id);

                                                return next;
                                            })
                                        }
                                    >
                                        {group.friends.map((friend) => (
                                            <FriendRow key={friend.id} friend={friend} selected={selected.includes(friend.id)} onSelect={toggleSelect} />
                                        ))}
                                    </Section>
                                ))}
                            </div>
                            <footer className="los-fl__foot">
                                <input
                                    className="los-input"
                                    value={filter}
                                    placeholder={LocalizeText('friendlist.tip.search')}
                                    onChange={(event) => setFilter(event.target.value)}
                                />
                                <button
                                    type="button"
                                    className="los-fl__tool"
                                    title={LocalizeText('friendlist.tip.invite')}
                                    disabled={!selected.length}
                                    onClick={startInvite}
                                >
                                    <LosIcon name="hotel" />
                                </button>
                                <button
                                    type="button"
                                    className="los-fl__tool"
                                    title={LocalizeText('friendlist.tip.remove')}
                                    disabled={!selected.length}
                                    onClick={startRemove}
                                >
                                    <LosIcon name="trash" />
                                </button>
                            </footer>
                        </>
                    )}
                    {panel === 'requests' && <Requests />}
                    {panel === 'search' && <Search />}
                </LosWindow>
            </DraggableWindow>
            {invite && (
                <Dialog icon="hotel" title={LocalizeText('friendlist.invite.title')} onClose={() => setInvite(null)}>
                    <p className="los-fl__note">{invite.caption}</p>
                    <textarea
                        className="los-input los-fl__text"
                        maxLength={120}
                        value={inviteText}
                        aria-label={LocalizeText('friendlist.invite.title')}
                        onChange={(event) => setInviteText(event.target.value)}
                    />
                    <p className="los-fl__note">{LocalizeText('friendlist.invite.note')}</p>
                    <div className="los-fl__buttons">
                        <button type="button" className="los-button" onClick={() => setInvite(null)}>
                            {LocalizeText('generic.cancel')}
                        </button>
                        <button type="button" className="los-button los-button--primary" onClick={sendInvite}>
                            {LocalizeText('friendlist.invite.send')}
                        </button>
                    </div>
                </Dialog>
            )}
            {removal && (
                <Dialog icon="trash" title={LocalizeText('friendlist.removefriendconfirm.title')} onClose={() => setRemoval(null)}>
                    <p className="los-fl__note">{removal.caption}</p>
                    <div className="los-fl__buttons">
                        <button type="button" className="los-button" onClick={() => setRemoval(null)}>
                            {LocalizeText('generic.cancel')}
                        </button>
                        <button
                            type="button"
                            className="los-button los-button--primary"
                            onClick={() => {
                                SendMessageComposer(new RemoveFriendComposer(...removal.ids));
                                setSelected([]);
                                setRemoval(null);
                            }}
                        >
                            {LocalizeText('generic.ok')}
                        </button>
                    </div>
                </Dialog>
            )}
        </>
    );
};
