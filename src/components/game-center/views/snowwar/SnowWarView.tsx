import { FC, lazy, Suspense } from 'react';
import { SnowWarEngineState, SnowWarHookState } from '../../../../api/snowwar';
import { useSnowWar } from '../../../../hooks';

const LazySnowWarOverlayContent = lazy(() =>
    import('./SnowWarOverlayContent').then((module) => ({ default: module.SnowWarOverlayContent }))
);

export const SnowWarView: FC = () =>
{
    const snowWar: SnowWarHookState = useSnowWar();
    const { state, loading, results, error } = snowWar;
    const isActive = !!loading || !!results || !!error || state !== SnowWarEngineState.INACTIVE;

    if(!isActive) return null;

    return (
        <Suspense fallback={null}>
            <LazySnowWarOverlayContent />
        </Suspense>
    );
};
