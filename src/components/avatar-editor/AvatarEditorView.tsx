import { AddLinkEventTracker, AvatarFigurePartType, ILinkEventTracker, RemoveLinkEventTracker } from '@volt/renderer';
import { FC, useCallback, useEffect, useState } from 'react';
import { lazyWindow } from '../../common/lazyWindow';
import { useAvatarEditor } from '../../hooks';

const INITIAL_EDITOR_POSITION = { x: 100, y: 30 };

const LazyAvatarEditorWindow = lazyWindow(
    () => import('./AvatarEditorWindow').then((module) => ({ default: module.AvatarEditorWindow })),
    'AvatarEditor'
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
        <VoltCardView
            className={`volt-avatar-editor${isWardrobeOpen ? ' is-wardrobe-open' : ''}`}
            frameStyle={3}
            initialPosition={editorPosition}
            isResizable={false}
            onPositionChange={setEditorPosition}
            uniqueKey="avatar-editor"
        >
            <VoltCardHeaderView
                headerText=""
                onCloseClick={(event) => setIsVisible(false)}
            >
                <NativeText className="volt-avatar-editor-title" text={LocalizeText(clothingChangeData ? 'widget.furni.clothingchange.editor.title' : 'avatareditor.title')} textStyle="u_frame_title" background={0x32699d} overrides={{ color: 0xffffff }} />
            </VoltCardHeaderView>
            <VoltCardContentView className="volt-avatar-editor-content" gap={0}>
                <div className="volt-avatar-editor-stage">
                    <div className="volt-avatar-editor-nameplate">
                        <div className="volt-avatar-editor-name-text"><NativeText text={GetSessionDataManager().userName} textStyle="u_headline_big" background={0x0b3155} overrides={{ size: 12, color: 0xffffff }} /></div>
                    </div>
                    <div className="volt-avatar-editor-tab-row">
                        <VoltCardTabsView classNames={['avatar-editor-tabs']}>
                            {orderedModelKeys.map((modelKey) => (
                                <VoltCardTabsItemView
                                    key={modelKey}
                                    classNames={['volt-avatar-editor-main-tab', `is-${modelKey}`]}
                                    isActive={activeModelKey === modelKey}
                                    onClick={() => setActiveModelKey(modelKey)}
                                >
                                    <img className="volt-avatar-editor-main-tab-icon" src={MAIN_TAB_ICONS[modelKey]} alt="" draggable={false} />
                                </VoltCardTabsItemView>
                            ))}
                        </VoltCardTabsView>
                    </div>
                    {hasWardrobe && (
                        <button
                            type="button"
                            disabled={!canUseWardrobe}
                            className={`volt-avatar-editor-wardrobe-toggle${isWardrobeOpen ? ' is-open' : ''}`}
                            aria-pressed={isWardrobeOpen}
                            aria-label={LocalizeText('avatareditor.wardrobe.title')}
                            onClick={() => setIsWardrobeOpen((open) => !open)}
                        >
                            <img alt="" draggable={false} src={wardrobeHangerSrc} />
                        </button>
                    )}
                    <div className="volt-avatar-editor-main">
                        {activeModelKey.length > 0 && !isHotLooksOpen && !isEffectsOpen && !isNftOpen && (
                            <AvatarEditorModelView categories={avatarModels[activeModelKey]} name={activeModelKey} />
                        )}
                        {isHotLooksOpen && <AvatarEditorHotLooksView />}
                        {isEffectsOpen && <AvatarEditorEffectsView />}
                        {isNftOpen && <AvatarEditorNftView />}
                        <AvatarEditorFigurePreviewView />
                        <button type="button" className="volt-avatar-editor-save" disabled={isSaving} onClick={saveAvatar}>
                            <NativeText className="volt-avatar-editor-save-label" text={LocalizeText('avatareditor.save')} textStyle="button_shiny_bold" background={0xffffff} />
                            <NativeText className="volt-avatar-editor-save-label-disabled" text={LocalizeText('avatareditor.save')} textStyle="button_shiny_bold" background={0xc3c3c1} />
                        </button>
                    </div>
                </div>
                {isWardrobeOpen && canUseWardrobe && <AvatarEditorWardrobeView />}
            </VoltCardContentView>
        </VoltCardView>
    );
};
