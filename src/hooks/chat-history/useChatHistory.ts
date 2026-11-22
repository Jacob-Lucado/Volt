import { GetGuestRoomResultEvent, NewConsoleMessageEvent, RoomInviteEvent, RoomSessionEvent } from '@volt/renderer';
import { useMemo } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { ChatEntryType, ChatHistoryCurrentDate, IChatEntry, IRoomHistoryEntry, MessengerHistoryCurrentDate } from '../../api';
import { useMessageEvent, useVoltEvent } from '../events';
import { ClearAccountLocalStorage, useAccountLocalStorage } from '../useLocalStorage';

const ROOM_HISTORY_MAX = 10;
const CHAT_HISTORY_MAX = 1000;
const MESSENGER_HISTORY_MAX = 1000;

let CHAT_HISTORY_COUNTER: number = 0;
let MESSENGER_HISTORY_COUNTER: number = 0;

const CHAT_HISTORY_STORAGE_KEYS = ['chatHistory', 'roomHistory', 'messengerHistory', 'needsRoomInsert'];

export const ClearStoredChatHistory = () => {
    CHAT_HISTORY_COUNTER = 0;
    MESSENGER_HISTORY_COUNTER = 0;

    ClearAccountLocalStorage(CHAT_HISTORY_STORAGE_KEYS);
};

/**
 * Project a list of chat entries to the slim shape we want to persist in
 * localStorage. `imageUrl` is a base64 data URL of the avatar / pet head
 * (10-50 KB each) - keeping it in storage blows past the browser quota
 * inside minutes in a pet-heavy room. The avatar can always be re-rendered
 * from `look` via ChatBubbleUtilities.getUserImage(), and pet images are
 * regenerated from the bubble flow when needed; we just don't restore
 * head thumbnails for entries loaded from a previous session.
 *
 * `style` / `chatType` / `color` are kept because they're tiny but
 * meaningful for re-rendering the bubble.
 */
const slimChatEntriesForStorage = (entries: IChatEntry[]): IChatEntry[] => entries.map((entry) => (entry.imageUrl ? { ...entry, imageUrl: undefined } : entry));

const useChatHistoryState = () => {
    const [chatHistory, setChatHistory] = useAccountLocalStorage<IChatEntry[]>('chatHistory', [], { toStorage: slimChatEntriesForStorage });
    const [roomHistory, setRoomHistory] = useAccountLocalStorage<IRoomHistoryEntry[]>('roomHistory', []);
    const [messengerHistory, setMessengerHistory] = useAccountLocalStorage<IChatEntry[]>('messengerHistory', [], { toStorage: slimChatEntriesForStorage });
    const [needsRoomInsert, setNeedsRoomInsert] = useAccountLocalStorage('needsRoomInsert', false);
    // Stored entries survive a reload; the module counter does not. Reserve
    // new IDs above the restored range so avatar callbacks target this message.
    const nextChatId = useMemo(() => chatHistory.reduce((next, entry) => Math.max(next, entry.id + 1), 0), [chatHistory]);

    const addChatEntry = (entry: IChatEntry) => {
        CHAT_HISTORY_COUNTER = Math.max(CHAT_HISTORY_COUNTER, nextChatId);
        entry.id = CHAT_HISTORY_COUNTER++;

        setChatHistory((prevValue) => {
            const newValue = [...prevValue];

            newValue.push(entry);

            if (newValue.length > CHAT_HISTORY_MAX) newValue.shift();

            return newValue;
        });

        return entry.id;
    };

    const updateChatEntry = (entryId: number, partial: Partial<IChatEntry>) => {
        if (entryId < 0) return;

        setChatHistory((prevValue) => {
            const index = prevValue.findIndex((entry) => entry.id === entryId);

            if (index === -1) return prevValue;

            const newValue = [...prevValue];

            newValue[index] = { ...newValue[index], ...partial };

            return newValue;
        });
    };

    const clearChatHistory = () => setChatHistory([]);

    const addRoomHistoryEntry = (entry: IRoomHistoryEntry) => {
        setRoomHistory((prevValue) => {
            const newValue = [...prevValue];

            newValue.push(entry);

            if (newValue.length > ROOM_HISTORY_MAX) newValue.shift();

            return newValue;
        });
    };

    const addMessengerEntry = (entry: IChatEntry) => {
        entry.id = MESSENGER_HISTORY_COUNTER++;

        setMessengerHistory((prevValue) => {
            const newValue = [...prevValue];

            newValue.push(entry);

            if (newValue.length > MESSENGER_HISTORY_MAX) newValue.shift();

            return newValue;
        });
    };

    useVoltEvent<RoomSessionEvent>(RoomSessionEvent.STARTED, (event) => setNeedsRoomInsert(true));

    useMessageEvent<GetGuestRoomResultEvent>(GetGuestRoomResultEvent, (event) => {
        if (!needsRoomInsert) return;

        const parser = event.getParser();

        if (roomHistory.length) {
            if (roomHistory[roomHistory.length - 1].id === parser.data.roomId) return;
        }

        addChatEntry({
            id: -1,
            webId: -1,
            entityId: -1,
            name: parser.data.roomName,
            timestamp: ChatHistoryCurrentDate(),
            type: ChatEntryType.TYPE_ROOM_INFO,
            roomId: parser.data.roomId
        });

        addRoomHistoryEntry({ id: parser.data.roomId, name: parser.data.roomName });

        setNeedsRoomInsert(false);
    });

    useMessageEvent<NewConsoleMessageEvent>(NewConsoleMessageEvent, (event) => {
        const parser = event.getParser();

        addMessengerEntry({
            id: -1,
            webId: parser.senderId,
            entityId: -1,
            name: '',
            message: parser.messageText,
            roomId: -1,
            timestamp: MessengerHistoryCurrentDate(parser.secondsSinceSent),
            type: ChatEntryType.TYPE_IM
        });
    });

    useMessageEvent<RoomInviteEvent>(RoomInviteEvent, (event) => {
        const parser = event.getParser();

        addMessengerEntry({
            id: -1,
            webId: parser.senderId,
            entityId: -1,
            name: '',
            message: parser.messageText,
            roomId: -1,
            timestamp: MessengerHistoryCurrentDate(),
            type: ChatEntryType.TYPE_IM
        });
    });

    return { addChatEntry, updateChatEntry, clearChatHistory, chatHistory, roomHistory, messengerHistory };
};

export const useChatHistory = () => useSharedHook(useChatHistoryState);

registerSharedHook(useChatHistoryState);
