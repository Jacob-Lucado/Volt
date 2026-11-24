import { AddLinkEventTracker, AvatarFigurePartType, ILinkEventTracker, RemoveLinkEventTracker } from '@volt/renderer';
import { FC, lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { useAvatarEditor } from '../../hooks';

const INITIAL_EDITOR_POSITION = { x: 100, y: 30 };

const LazyAvatarEditorWindow = lazy(() =>
    import('./AvatarEditorWindow').then((module) => ({ default: module.AvatarEditorWindow }))
);

export const AvatarEditorView: FC<{}> = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [editorPosition, setEditorPosition] = useState(INITIAL_EDITOR_POSITION);
    const [isWardrobeOpen, setIsWardrobeOpen] = useState(false);
    const { setIsVisible: setEditorVisibility, setClothingChangeData = null } = useAvatarEditor();

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length < 2) return;

                switch (parts[1]) {
                    case 'show':
                        if (parts[2] && parts[3] && (parts[2] === AvatarFigurePartType.MALE || parts[2] === AvatarFigurePartType.FEMALE)) {
                            setClothingChangeData({ objectId: Number(parts[3]), gender: parts[2] });
                            setIsWardrobeOpen(false);
                        } else {
                            setClothingChangeData(null);
                            setIsWardrobeOpen(true);
                        }
                        setIsVisible(true);
                        return;
                    case 'hide':
                        setClothingChangeData(null);
                        setIsVisible(false);
                        return;
                    case 'toggle':
                        setClothingChangeData(null);
                        setIsVisible((prevValue) => {
                            if (!prevValue) setIsWardrobeOpen(true);

                            return !prevValue;
                        });
                        return;
                }
            },
            eventUrlPrefix: 'avatar-editor/'
        };

        const classicLinkTracker: ILinkEventTracker = {
            eventUrlPrefix: 'avatareditor/',
            linkReceived: (url) => {
                if (url.split('/')[1] !== 'open') return;

                setClothingChangeData(null);
                setIsWardrobeOpen(true);
                setIsVisible((visible) => !visible);
            }
        };

        AddLinkEventTracker(linkTracker);
        AddLinkEventTracker(classicLinkTracker);

        return () => {
            RemoveLinkEventTracker(linkTracker);
            RemoveLinkEventTracker(classicLinkTracker);
        };
    }, [setClothingChangeData]);

    useEffect(() => {
        setEditorVisibility(isVisible);

        if (!isVisible) {
            setClothingChangeData(null);
            setIsWardrobeOpen(false);
        }
    }, [isVisible, setEditorVisibility, setClothingChangeData]);

    const onClose = useCallback(() => setIsVisible(false), []);

    if (!isVisible) return null;

    return (
        <Suspense fallback={null}>
            <LazyAvatarEditorWindow
                editorPosition={editorPosition}
                setEditorPosition={setEditorPosition}
                isWardrobeOpen={isWardrobeOpen}
                setIsWardrobeOpen={setIsWardrobeOpen}
                onClose={onClose}
            />
        </Suspense>
    );
};
