import { RewardTrackData } from '@volt/renderer';
import { FC, useCallback, useEffect, useState } from 'react';
import { GetOptionalConfigurationValue } from '../../api';
import { useRewardTracks } from '../../hooks';
import { NewFeatureNotificationView } from './NewFeatureNotificationView';

// SingularNotificationController.as (AIR WIN63-202610151745-318700621, com/sulake/habbo/notifications/singular):
// :97 looks at notifications.new_feature.active 2 s after the client starts, :311-331 gives a key whose condition cannot be read yet
// 3 more tries, 2 s apart. That start delay passes during AIR's loading screen, so a key waits at most 8 s in all.
const CONDITION_WAIT_MS = 2000 + 3 * 2000;

const readActiveKeys = (): string[] =>
{
    const value = GetOptionalConfigurationValue<unknown>('notifications.new_feature.active', '');
    const keys = Array.isArray(value) ? value.map(String) : String(value ?? '').split(',');

    return keys.map((key) => key.trim()).filter((key, index, list) => key.length && list.indexOf(key) === index);
};

// getNewFeatureConditionState (:333-354): 1 show, 0 never, -1 not known yet.
const getConditionState = (key: string, tracks: RewardTrackData[]): number =>
{
    const condition = String(GetOptionalConfigurationValue<unknown>(`notifications.new_feature.condition.${ key }`, '') ?? '');
    const parts = condition.split(':');

    if (!condition.length || parts.length < 2) return 1;

    if (parts[0] === 'reward_track_incomplete')
    {
        const track = tracks.find((entry) => entry.id === parts[1]);

        if (!track) return -1;

        return track.complete ? 0 : 1;
    }

    return 1;
};

/**
 * The new-feature bars of notifications.new_feature.active, in that order. They are there when the hotel shows, like in AIR. A key
 * waiting for its reward track is shown as soon as the track arrives, for up to 8 s.
 */
export const NewFeatureNotificationsView: FC<{}> = () =>
{
    const [shownKeys, setShownKeys] = useState<string[]>([]);
    const [pendingKeys, setPendingKeys] = useState<string[]>(null);
    const { tracks = [] } = useRewardTracks();

    useEffect(() =>
    {
        setPendingKeys(readActiveKeys());

        const timeout = setTimeout(() => setPendingKeys([]), CONDITION_WAIT_MS);

        return () => clearTimeout(timeout);
    }, []);

    useEffect(() =>
    {
        if (!pendingKeys?.length) return;

        const ready = pendingKeys.filter((key) => getConditionState(key, tracks) === 1);
        const waiting = pendingKeys.filter((key) => getConditionState(key, tracks) === -1);

        if (ready.length) setShownKeys((keys) => [...keys, ...ready.filter((key) => !keys.includes(key))]);
        if (waiting.length !== pendingKeys.length) setPendingKeys(waiting);
    }, [pendingKeys, tracks]);

    const onDispose = useCallback((key: string) => setShownKeys((keys) => keys.filter((entry) => entry !== key)), []);

    if (!shownKeys.length) return null;

    return (
        <>
            {shownKeys.map((key) => (
                <NewFeatureNotificationView key={key} featureKey={key} onDispose={onDispose} />
            ))}
        </>
    );
};
