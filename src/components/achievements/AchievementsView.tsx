import { AddLinkEventTracker, ILinkEventTracker, RemoveLinkEventTracker } from '@volt/renderer';
import { FC, lazy, Suspense, useEffect } from 'react';
import { useAchievements } from '../../hooks';

const LazyAchievementsWindow = lazy(() =>
    import('./AchievementsWindow').then((module) => ({ default: module.AchievementsWindow }))
);

export const AchievementsView: FC = () => {
    const { isVisible, isLoaded, show, close } = useAchievements();

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length < 2) return;

                switch (parts[1]) {
                    case 'show':
                        show(parts[2]);
                        return;
                    case 'hide':
                        close();
                        return;
                    case 'toggle':
                        if (isVisible) close();
                        else show();
                        return;
                }
            },
            eventUrlPrefix: 'achievements/'
        };

        const questTracker: ILinkEventTracker = {
            eventUrlPrefix: 'questengine/achievements',
            linkReceived: (url) => {
                const parts = url.split('/');
                if (parts.length === 3) show(parts[2]);
                else show();
            }
        };

        AddLinkEventTracker(linkTracker);
        AddLinkEventTracker(questTracker);

        return () => {
            RemoveLinkEventTracker(linkTracker);
            RemoveLinkEventTracker(questTracker);
        };
    }, [close, isVisible, show]);

    if (!isVisible || !isLoaded) return null;

    return (
        <Suspense fallback={null}>
            <LazyAchievementsWindow />
        </Suspense>
    );
};
