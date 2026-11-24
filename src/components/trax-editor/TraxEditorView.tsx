import { AddLinkEventTracker, ILinkEventTracker, RemoveLinkEventTracker } from '@volt/renderer';
import { FC, lazy, Suspense, useCallback, useEffect, useState } from 'react';

const LazyTraxEditorWindow = lazy(() =>
    import('./TraxEditorWindow').then((module) => ({ default: module.TraxEditorWindow }))
);

export const TraxEditorView: FC<{}> = () =>
{
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

    if (!isVisible) return null;

    return (
        <Suspense fallback={null}>
            <LazyTraxEditorWindow onClose={closeEditor} />
        </Suspense>
    );
};
