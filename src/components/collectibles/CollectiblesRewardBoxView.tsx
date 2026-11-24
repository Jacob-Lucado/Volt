import { FC, lazy, Suspense } from 'react';
import { useCollectiblesRewardBox } from '../../hooks/collectibles/useCollectiblesRewardBox';

const LazyCollectiblesRewardBoxWindow = lazy(() =>
    import('./CollectiblesRewardBoxWindow').then((module) => ({ default: module.CollectiblesRewardBoxWindow }))
);

export const CollectiblesRewardBoxView: FC<{}> = () => {
    const { reward } = useCollectiblesRewardBox();

    if (!reward) return null;

    return (
        <Suspense fallback={null}>
            <LazyCollectiblesRewardBoxWindow />
        </Suspense>
    );
};
