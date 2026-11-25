import { FC } from 'react';
import { SnowWarEngineState, SnowWarHookState } from '../../../../api/snowwar';
import { lazyWindow } from '../../../../common/lazyWindow';
import { useSnowWar } from '../../../../hooks';

const LazySnowWarOverlayContent = lazyWindow(
    () => import('./SnowWarOverlayContent').then((module) => ({ default: module.SnowWarOverlayContent })),
    'SnowWarOverlay'
);

export const SnowWarView: FC = () =>
{
    const snowWar: SnowWarHookState = useSnowWar();
    const { state, loading, results, error } = snowWar;
    const isActive = !!loading || !!results || !!error || state !== SnowWarEngineState.INACTIVE;

    if(!isActive) return null;

    return <LazySnowWarOverlayContent />;
};
