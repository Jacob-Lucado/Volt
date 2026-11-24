import { FC, lazy, Suspense } from 'react';
import { useCollectiblesHub } from '../../hooks/collectibles/useCollectiblesHub';

const LazyCollectiblesHubWindow = lazy(() =>
    import('./CollectiblesHubWindow').then((module) => ({ default: module.CollectiblesHubWindow }))
);

export const CollectiblesHubView: FC<{}> = () => {
    const { hubWindow } = useCollectiblesHub();

    if (hubWindow === 'none') return null;

    return (
        <Suspense fallback={null}>
            <LazyCollectiblesHubWindow />
        </Suspense>
    );
};
