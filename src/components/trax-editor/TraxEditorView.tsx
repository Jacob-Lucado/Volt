import { AddLinkEventTracker, ILinkEventTracker, RemoveLinkEventTracker } from '@volt/renderer';
import { FC, useCallback, useEffect, useState } from 'react';
import { lazyWindow } from '../../common/lazyWindow';

const LazyTraxEditorWindow = lazyWindow(
    () => import('./TraxEditorWindow').then((module) => ({ default: module.TraxEditorWindow })),
    'TraxEditor'
);

export const TraxEditorView: FC<{}> = () =>
{
    const [hasOpened, setHasOpened] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() =>
    {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) =>
            {
                const parts = url.split('/');
                if (parts.length < 2) return;

                switch (parts[1])
                {
                    case 'show':
                        setHasOpened(true);
                        setIsVisible(true);
                        return;
                    case 'hide':
                        setIsVisible(false);
                        return;
                }
            },
            eventUrlPrefix: 'trax-editor/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, []);

    const closeEditor = useCallback(() => setIsVisible(false), []);

    const handleChunkError = useCallback(() =>
    {
        setIsVisible(false);
        setHasOpened(false);
    }, []);

    if (!hasOpened) return null;

    return <LazyTraxEditorWindow isVisible={isVisible} onChunkError={handleChunkError} onClose={closeEditor} />;
};
