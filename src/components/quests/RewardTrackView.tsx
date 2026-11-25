import { AddLinkEventTracker, ILinkEventTracker, RemoveLinkEventTracker } from '@volt/renderer';
import { FC, useCallback, useEffect, useState } from 'react';
import { lazyWindow } from '../../common/lazyWindow';
import { useRewardTracks } from '../../hooks';

const LazyRewardTrackWindow = lazyWindow(
    () => import('./RewardTrackWindow').then((module) => ({ default: module.RewardTrackWindow })),
    'RewardTrack'
);

export const RewardTrackView: FC<{}> = () => {
    const [trackId, setTrackId] = useState<string>(null);
    const { tracks = [], requestTracks = null } = useRewardTracks();

    const open = useCallback(
        (id: string) => {
            setTrackId(id);
            requestTracks && requestTracks();
        },
        [requestTracks]
    );

    const close = useCallback(() => setTrackId(null), []);

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length < 2) return;

                switch (parts[1]) {
                    case 'open':
                        open(parts.length >= 3 ? parts[2] : (tracks[0]?.id ?? 'introduction'));
                        return;
                    case 'hide':
                        setTrackId(null);
                        return;
                    case 'toggle':
                        if (trackId) setTrackId(null);
                        else open(tracks[0]?.id ?? 'introduction');
                        return;
                }
            },
            eventUrlPrefix: 'reward_track/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, [open, tracks, trackId]);

    if (!trackId) return null;

    return <LazyRewardTrackWindow onChunkError={close} onClose={close} onSelectTrack={open} trackId={trackId} />;
};
