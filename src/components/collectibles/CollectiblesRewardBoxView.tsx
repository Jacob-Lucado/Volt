import { FC } from 'react';
import { lazyWindow } from '../../common/lazyWindow';
import { useCollectiblesRewardBox } from '../../hooks/collectibles/useCollectiblesRewardBox';

const LazyCollectiblesRewardBoxWindow = lazyWindow(
    () => import('./CollectiblesRewardBoxWindow').then((module) => ({ default: module.CollectiblesRewardBoxWindow })),
    'CollectiblesRewardBox'
);

export const CollectiblesRewardBoxView: FC<{}> = () => {
    const { reward, showNext } = useCollectiblesRewardBox();

    if (!reward) return null;

    return <LazyCollectiblesRewardBoxWindow onChunkError={showNext} />;
};
