import { GetSessionDataManager, VoltLogger } from '@volt/renderer';
import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import { GetLocalStorage, SetLocalStorage } from '../api';
import { useUserDataSnapshot } from './session/useSessionSnapshots';

const STORAGE_WRITE_DEBOUNCE_MS = 250;
const QUOTA_TRIM_FACTOR = 0.5; // on quota error, keep the newest 50%.
const MIN_RETAINED_ENTRIES = 50;

const isQuotaError = (error: unknown): boolean => {
    if (!error || typeof error !== 'object') return false;
    const name = (error as { name?: string }).name;
    if (name === 'QuotaExceededError') return true;
    // Firefox legacy:
    if (name === 'NS_ERROR_DOM_QUOTA_REACHED') return true;
    return false;
};

const trimArrayForQuota = <T>(value: T): T => {
    if (!Array.isArray(value)) return value;
    if (value.length <= MIN_RETAINED_ENTRIES) return [] as unknown as T;
    const keep = Math.max(MIN_RETAINED_ENTRIES, Math.floor(value.length * QUOTA_TRIM_FACTOR));
    return value.slice(value.length - keep) as unknown as T;
};

interface UseLocalStorageOptions<T> {
    /**
     * Optional projection applied right before the value is written to
     * localStorage. The in-memory React state is unaffected. Use this to
     * strip heavy ephemeral fields (e.g. base64 image URLs) that would
     * otherwise blow past the storage quota.
     */
    toStorage?: (value: T) => unknown;
}

interface StoredState<T> {
    key: string | null;
    value: T;
}

let accountStorageOpen = true;

// Older clients stored `key` or `key.<id from the URL>`. The `#` separator keeps
// those apart from values that belong to the logged-in account.
const toAccountStorageKey = (key: string, userId: number) => `${key}#${userId}`;

// Null until the session knows the user id, and after ClearAccountLocalStorage.
const getAccountStorageKey = (key: string): string | null => {
    const userId = GetSessionDataManager()?.userId ?? 0;

    return accountStorageOpen && userId > 0 ? toAccountStorageKey(key, userId) : null;
};

/** Removes the stored values of `keys` for every account except `keepUserId`, including the keys of older clients. */
const RemoveAccountLocalStorage = (keys: string[], keepUserId = 0) => {
    try {
        const storage = window.localStorage;
        const isStale = (storageKey: string) =>
            keys.some(
                (key) =>
                    storageKey === key ||
                    storageKey.startsWith(`${key}.`) ||
                    (storageKey.startsWith(`${key}#`) && storageKey !== toAccountStorageKey(key, keepUserId))
            );
        const stale = Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter((storageKey) => storageKey && isStale(storageKey));

        stale.forEach((storageKey) => storage.removeItem(storageKey));
    } catch {}
};

/** Removes every account's values for `keys` and stops per-account storage for the rest of this page. */
export const ClearAccountLocalStorage = (keys: string[]) => {
    accountStorageOpen = false;
    RemoveAccountLocalStorage(keys);
};

const useStoredState = <T>(resolveKey: () => string | null, initialValue: T, options: UseLocalStorageOptions<T>): [T, Dispatch<SetStateAction<T>>] => {
    const readValue = (key: string | null): T => (key ? (GetLocalStorage<T>(key) ?? initialValue) : initialValue);

    const key = resolveKey();
    const [state, setState] = useState<StoredState<T>>(() => ({ key, value: readValue(key) }));

    // Event bursts and async avatar callbacks can retain a setter from an
    // earlier render. Resolve every update against the latest value, including
    // updates React has not rendered yet, so they cannot erase newer entries.
    const stateRef = useRef(state);
    const pendingWriteRef = useRef<StoredState<T> | null>(null);
    const writeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const optionsRef = useRef(options);

    // Keep the latest toStorage projection without re-running effects.
    optionsRef.current = options;

    if (stateRef.current.key !== key) {
        stateRef.current = { key, value: readValue(key) };
        setState(stateRef.current);
    }

    const flushWrite = ({ key, value }: StoredState<T>) => {
        if (typeof window === 'undefined' || key !== resolveKey()) return;

        const project = optionsRef.current.toStorage;
        const projected = project ? project(value) : value;

        try {
            SetLocalStorage(key, projected);
            return;
        } catch (error) {
            if (!isQuotaError(error)) {
                VoltLogger.error(error);
                return;
            }
        }

        // Quota exceeded - trim and retry once. Anything that isn't an
        // array gets cleared, since we have no generic trimming rule.
        try {
            const trimmed = trimArrayForQuota(projected as T);
            SetLocalStorage(key, trimmed);
            VoltLogger.warn(`[useLocalStorage] quota exceeded for ${key}, trimmed payload`);
        } catch (retryError) {
            VoltLogger.error(retryError);
            // Last resort: drop the key entirely so future writes have room.
            try {
                window.localStorage.removeItem(key);
            } catch (_) {
                /* ignore */
            }
        }
    };

    // Debounce: high-frequency chat would otherwise trigger one full
    // JSON.stringify + setItem per message. We coalesce bursts into one
    // write per STORAGE_WRITE_DEBOUNCE_MS window with the latest value.
    const scheduleWrite = (value: StoredState<T>) => {
        pendingWriteRef.current = value;
        if (writeTimerRef.current) clearTimeout(writeTimerRef.current);
        writeTimerRef.current = setTimeout(() => {
            writeTimerRef.current = null;
            if (pendingWriteRef.current !== null) {
                flushWrite(pendingWriteRef.current);
                pendingWriteRef.current = null;
            }
        }, STORAGE_WRITE_DEBOUNCE_MS);
    };

    // Flush a pending write on tab close / hide so we don't lose the last
    // burst of activity.
    useEffect(() => {
        const flushOnLeave = () => {
            if (pendingWriteRef.current === null) return;
            if (writeTimerRef.current) clearTimeout(writeTimerRef.current);
            writeTimerRef.current = null;
            flushWrite(pendingWriteRef.current);
            pendingWriteRef.current = null;
        };

        window.addEventListener('pagehide', flushOnLeave);
        window.addEventListener('beforeunload', flushOnLeave);

        return () => {
            window.removeEventListener('pagehide', flushOnLeave);
            window.removeEventListener('beforeunload', flushOnLeave);
        };
    }, []);

    const setValue: Dispatch<SetStateAction<T>> = (value) => {
        try {
            const key = resolveKey();
            const current = stateRef.current.key === key ? stateRef.current.value : readValue(key);
            const next = { key, value: value instanceof Function ? value(current) : value };

            stateRef.current = next;
            setState(next);

            if (key) scheduleWrite(next);
        } catch (error) {
            VoltLogger.error(error);
        }
    };

    return [state.value, setValue];
};

/** A value shared by everyone who uses this browser, such as a window or catalog preference. */
export const useLocalStorage = <T>(key: string, initialValue: T, options: UseLocalStorageOptions<T> = {}) => useStoredState(() => key, initialValue, options);

/**
 * A value that belongs to the logged-in account. It stays in memory only until the
 * session knows the user id, and stored values of other accounts are removed.
 */
export const useAccountLocalStorage = <T>(key: string, initialValue: T, options: UseLocalStorageOptions<T> = {}) => {
    const { userId } = useUserDataSnapshot();

    useEffect(() => {
        if (userId > 0) RemoveAccountLocalStorage([key], userId);
    }, [key, userId]);

    return useStoredState(() => getAccountStorageKey(key), initialValue, options);
};
