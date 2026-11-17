import {
    AddLinkEventTracker,
    FollowFriendMessageComposer,
    GetSessionDataManager,
    GroupInformationComposer,
    ILinkEventTracker,
    RemoveLinkEventTracker
} from '@volt/renderer';
import { FC, KeyboardEvent, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { GetUserProfile, LocalizeText, ReportType, SendMessageComposer, useHabbiconCatalog } from '../../../../api';
import { HabbiconsDmIcon } from '../../../../assets/images/habbicons';
import { DraggableWindow, DraggableWindowPosition, LayoutBadgeImageView } from '../../../../common';
import { LosIcon, LosWindow } from '../../../../common/lucadoos';
import { useFriends, useHelp, useMessenger } from '../../../../hooks';
import './FriendsMessengerView.css';
import { FriendsMessengerHabbiconPickerView } from './FriendsMessengerHabbiconPickerView';
import { MessengerAvatarView } from './messenger-thread/FriendsMessengerThreadGroup';
import { FriendsMessengerThreadView } from './messenger-thread/FriendsMessengerThreadView';

export const FriendsMessengerView: FC = () => {
    const avatarBarRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLDivElement>(null);
    const habbiconRef = useRef<HTMLButtonElement>(null);
    const messagesBox = useRef<HTMLDivElement>(null);
    const [visibleAvatarCount, setVisibleAvatarCount] = useState(7);
    const [isVisible, setIsVisible] = useState(false);
    const [lastThreadId, setLastThreadId] = useState(-1);
    const [messageText, setMessageText] = useState('');
    const [pickerPosition, setPickerPosition] = useState<{ left: number; top: number }>(null);
    const [avatarStartIndex, setAvatarStartIndex] = useState(0);
    const { visibleThreads, activeThread, getMessageThread, sendMessage, sendHabbiconMessage, setActiveThreadId, closeThread } = useMessenger();
    const { getFriend } = useFriends();
    const { report } = useHelp();
    const habbiconCatalog = useHabbiconCatalog();

    const positionPicker = () => {
        if (!habbiconRef.current || !inputRef.current) return;
        const button = habbiconRef.current.getBoundingClientRect();
        const input = inputRef.current.getBoundingClientRect();
        setPickerPosition({ left: button.left, top: input.top - 4 });
    };
    const hideMessenger = useCallback(() => {
        if (activeThread?.threadId) setLastThreadId(activeThread.threadId);
        setPickerPosition(null);
        setActiveThreadId(-1);
        setIsVisible(false);
    }, [activeThread?.threadId, setActiveThreadId]);
    const showMessenger = useCallback(
        (threadId?: number) => {
            const previous = visibleThreads.find((thread) => thread.threadId === lastThreadId);
            const id = threadId ?? activeThread?.threadId ?? previous?.threadId ?? visibleThreads[0]?.threadId;
            if (!id) return;
            setActiveThreadId(id, threadId !== undefined);
            setIsVisible(true);
        },
        [visibleThreads, lastThreadId, activeThread?.threadId, setActiveThreadId]
    );
    const closeConversation = () => {
        if (!activeThread) return;
        closeThread(activeThread.threadId);
        setPickerPosition(null);
        if (visibleThreads.length === 1) {
            setLastThreadId(-1);
            setIsVisible(false);
        }
    };
    const followFriend = () => {
        if (!activeThread) return;
        SendMessageComposer(
            activeThread.participant.id > 0
                ? new FollowFriendMessageComposer(activeThread.participant.id)
                : new GroupInformationComposer(Math.abs(activeThread.participant.id), false)
        );
    };
    const openProfile = () => {
        if (!activeThread) return;
        if (activeThread.participant.id > 0) GetUserProfile(activeThread.participant.id);
        else SendMessageComposer(new GroupInformationComposer(Math.abs(activeThread.participant.id), true));
    };
    const send = () => {
        if (!activeThread || !messageText.length) return;
        sendMessage(activeThread, GetSessionDataManager().userId, messageText);
        setMessageText('');
    };
    const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
        event.preventDefault();
        send();
    };

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url) => {
                const parts = url.split('/');
                if (parts.length !== 2) return;
                if (parts[1] === 'open') showMessenger();
                else if (parts[1] === 'toggle') {
                    if (isVisible) hideMessenger();
                    else showMessenger();
                } else {
                    const participantId = parseInt(parts[1]);
                    if (!getFriend(participantId)) return;
                    const thread = getMessageThread(participantId);
                    if (thread) showMessenger(thread.threadId);
                }
            },
            eventUrlPrefix: 'friends-messenger/'
        };
        AddLinkEventTracker(linkTracker);
        return () => RemoveLinkEventTracker(linkTracker);
    }, [getFriend, getMessageThread, showMessenger, hideMessenger, isVisible]);

    useLayoutEffect(() => {
        if (isVisible && messagesBox.current) messagesBox.current.scrollTop = messagesBox.current.scrollHeight;
    }, [isVisible, activeThread]);

    useLayoutEffect(() => {
        const bar = avatarBarRef.current;
        if (!isVisible || !bar) return;
        const measure = () => {
            const count = Math.max(1, Math.floor(bar.clientWidth / 35));
            setVisibleAvatarCount(count);
            setAvatarStartIndex((current) => Math.min(current, Math.max(0, visibleThreads.length - count)));
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(bar);
        return () => observer.disconnect();
    }, [isVisible, visibleThreads.length]);

    const maximumAvatarStart = Math.max(0, visibleThreads.length - visibleAvatarCount);
    const displayedThreads = visibleThreads.slice(avatarStartIndex, avatarStartIndex + visibleAvatarCount);
    const scrollAvatars = (direction: -1 | 1) => setAvatarStartIndex((current) => Math.max(0, Math.min(maximumAvatarStart, current + direction)));
    if (!isVisible) return null;

    return (
        <>
            <DraggableWindow uniqueKey="volt-messenger" handleSelector=".los-window__bar" windowPosition={DraggableWindowPosition.TOP_CENTER} offsetTop={8}>
                <LosWindow
                    className="los-msg"
                    icon="chat"
                    title={LocalizeText(
                        'messenger.window.title',
                        ['open_chat_count', 'OPEN_CHAT_COUNT'],
                        [String(visibleThreads.length), String(visibleThreads.length)]
                    )}
                    onClose={hideMessenger}
                >
                    <div
                        className="los-msg__inner"
                        onPointerDown={(event) => {
                            if (pickerPosition && !habbiconRef.current?.contains(event.target as Node)) setPickerPosition(null);
                        }}
                    >
                        <div className="los-msg__tabs">
                            <button
                                type="button"
                                className="los-msg__scroll"
                                aria-label={LocalizeText('generic.previous')}
                                disabled={avatarStartIndex === 0}
                                onClick={() => scrollAvatars(-1)}
                            >
                                <LosIcon name="back" size={14} />
                            </button>
                            <div ref={avatarBarRef} className="los-msg__bar">
                                {displayedThreads.map((thread) => (
                                    <button
                                        key={thread.threadId}
                                        type="button"
                                        data-participant-id={thread.participant.id}
                                        className={`los-msg__tab${activeThread?.threadId === thread.threadId ? ' is-active' : ''}${thread.unread ? ' is-unread' : ''}`}
                                        aria-label={thread.participant.name}
                                        aria-pressed={activeThread?.threadId === thread.threadId}
                                        onClick={() => {
                                            setActiveThreadId(thread.threadId);
                                            setPickerPosition(null);
                                        }}
                                    >
                                        {thread.participant.id > 0 ? (
                                            <MessengerAvatarView figure={getFriend(thread.participant.id)?.figure || thread.participant.figure} headOnly />
                                        ) : (
                                            <div className="messenger-group-badge">
                                                <LayoutBadgeImageView badgeCode={thread.participant.figure} isGroup showInfo={false} />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                            <button
                                type="button"
                                className="los-msg__scroll is-next"
                                aria-label={LocalizeText('generic.next')}
                                disabled={avatarStartIndex >= maximumAvatarStart}
                                onClick={() => scrollAvatars(1)}
                            >
                                <LosIcon name="back" size={14} />
                            </button>
                        </div>
                        {activeThread && (
                            <>
                                <div className="los-msg__head">
                                    <b>
                                        {LocalizeText(
                                            'messenger.window.separator',
                                            ['friend_name', 'FRIEND_NAME'],
                                            [activeThread.participant.name, activeThread.participant.name]
                                        )}
                                    </b>
                                    <div className="los-msg__actions">
                                        <button
                                            type="button"
                                            className="los-msg__icon"
                                            title={LocalizeText('messenger.followfriend.tooltip')}
                                            onClick={followFriend}
                                        >
                                            <LosIcon name="compass" size={15} />
                                        </button>
                                        <button
                                            type="button"
                                            className="los-msg__icon"
                                            title={LocalizeText('infostand.profile.link.tooltip')}
                                            onClick={openProfile}
                                        >
                                            <LosIcon name="user" size={15} />
                                        </button>
                                        {activeThread.participant.id > 0 && (
                                            <button
                                                type="button"
                                                className="los-msg__icon is-danger"
                                                title={LocalizeText('messenger.window.button.report')}
                                                onClick={() => report(ReportType.IM, { reportedUserId: activeThread.participant.id })}
                                            >
                                                <LosIcon name="flag" size={15} />
                                            </button>
                                        )}
                                        <button type="button" className="los-msg__icon" title={LocalizeText('generic.close')} onClick={closeConversation}>
                                            <LosIcon name="close" size={15} />
                                        </button>
                                    </div>
                                </div>
                                <div ref={messagesBox} className="chat-messages los-msg__list los-scroll">
                                    <FriendsMessengerThreadView thread={activeThread} />
                                </div>
                                <div ref={inputRef} className="los-msg__input">
                                    <button
                                        ref={habbiconRef}
                                        type="button"
                                        className="los-msg__icon"
                                        aria-label={LocalizeText('messenger.habbicons.tooltip')}
                                        onMouseDown={(event) => event.stopPropagation()}
                                        onClick={() => (pickerPosition ? setPickerPosition(null) : positionPicker())}
                                    >
                                        <img alt="" src={HabbiconsDmIcon} />
                                    </button>
                                    <input
                                        className="los-input"
                                        maxLength={120}
                                        placeholder={LocalizeText(
                                            'messenger.window.input.default',
                                            ['friend_name', 'FRIEND_NAME'],
                                            [activeThread.participant.name, activeThread.participant.name]
                                        )}
                                        type="text"
                                        value={messageText}
                                        onChange={(event) => setMessageText(event.target.value)}
                                        onKeyDown={onKeyDown}
                                    />
                                    <button type="button" className="los-button los-button--primary" onClick={send}>
                                        {LocalizeText('widgets.chatinput.say')}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </LosWindow>
            </DraggableWindow>
            {pickerPosition &&
                activeThread &&
                createPortal(
                    <div className="messenger-picker-host" style={pickerPosition}>
                        <FriendsMessengerHabbiconPickerView
                            onClose={() => setPickerPosition(null)}
                            onOpenHub={() => {
                                setPickerPosition(null);
                                habbiconCatalog.setBookVisible(true);
                            }}
                            onSelect={(id, keepOpen) => {
                                sendHabbiconMessage(activeThread, id);
                                if (!keepOpen) setPickerPosition(null);
                            }}
                        />
                    </div>,
                    document.body
                )}
        </>
    );
};
