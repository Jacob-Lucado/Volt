import { FC, useCallback, useState } from 'react';
import { lazyWindow } from '../../common/lazyWindow';
import { useCollectiblesHub } from '../../hooks/collectibles/useCollectiblesHub';

const LazyCollectiblesHubWindow = lazyWindow(
    () => import('./CollectiblesHubWindow').then((module) => ({ default: module.CollectiblesHubWindow })),
    'CollectiblesHub'
);

export const CollectiblesHubView: FC<{}> = () => {
    const { hubWindow, hide } = useCollectiblesHub();
    const [chunkFailed, setChunkFailed] = useState(false);
    const [prevHubWindow, setPrevHubWindow] = useState(hubWindow);

    if (prevHubWindow !== hubWindow) {
        setPrevHubWindow(hubWindow);
        if (hubWindow === 'shown' && chunkFailed) setChunkFailed(false);
    }

    const handleChunkError = useCallback(() => {
        setChunkFailed(true);
        hide();
    }, [hide]);

    if (hubWindow === 'none' || (chunkFailed && hubWindow !== 'shown')) return null;

    return <LazyCollectiblesHubWindow onChunkError={handleChunkError} />;
};
