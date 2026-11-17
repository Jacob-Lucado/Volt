import { AddLinkEventTracker, ILinkEventTracker, RemoveLinkEventTracker } from '@volt/renderer';
import { FC, useEffect, useState } from 'react';
import { useAchievements } from '../../hooks';
import { LosAchievements } from './lucado/LosAchievements';

export const AchievementsView: FC = () => {
    const [windowPosition, setWindowPosition] = useState<{ x: number; y: number } | null>(null);
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
            // HabboQuestEngine.linkReceived: questengine/achievements/<category> shows the window and selects the category.
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

    useEffect(() => {
        if (!isVisible || !isLoaded || windowPosition) return;

        setWindowPosition({ x: Math.round((window.innerWidth - 460) / 2), y: 20 });
    }, [isLoaded, isVisible, windowPosition]);

    if (!isVisible || !isLoaded || !windowPosition) return null;

    return <LosAchievements windowPosition={windowPosition} onPositionChange={setWindowPosition} />;
};
