import {
    AddLinkEventTracker,
    AvatarEditorFigureCategory,
    AvatarFigurePartType,
    GetSessionDataManager,
    ILinkEventTracker,
    RemoveLinkEventTracker,
    SetClothingChangeDataMessageComposer
} from '@volt/renderer';
import { FC, useEffect, useRef, useState } from 'react';
import { LocalizeText, SendMessageComposer } from '../../api';
import mainEffectsSrc from '../../assets/images/avatareditor/air/main-effects.png';
import mainGenericSrc from '../../assets/images/avatareditor/air/main-generic.png';
import mainHeadSrc from '../../assets/images/avatareditor/air/main-head.png';
import mainHotLooksSrc from '../../assets/images/avatareditor/air/main-hotlooks.png';
import mainLegsSrc from '../../assets/images/avatareditor/air/main-legs.png';
import mainMiscSrc from '../../assets/images/avatareditor/air/main-misc.png';
import mainTorsoSrc from '../../assets/images/avatareditor/air/main-torso.png';
import mainNftSrc from '../../assets/images/wardrobe/nft.png';
import { DraggableWindow } from '../../common';
import { LosIcon, LosWindow } from '../../common/lucadoos';
import { useAvatarEditor } from '../../hooks';
import { AvatarEditorEffectsView } from './AvatarEditorEffectsView';
import { AvatarEditorFigurePreviewView } from './AvatarEditorFigurePreviewView';
import { AvatarEditorHotLooksView } from './AvatarEditorHotLooksView';
import { AvatarEditorModelView } from './AvatarEditorModelView';
import { AvatarEditorNftView } from './AvatarEditorNftView';
import { AvatarEditorWardrobeView } from './AvatarEditorWardrobeView';

const MAIN_TAB_ICONS: Record<string, string> = {
    [AvatarEditorFigureCategory.GENERIC]: mainGenericSrc,
    [AvatarEditorFigureCategory.HEAD]: mainHeadSrc,
    [AvatarEditorFigureCategory.TORSO]: mainTorsoSrc,
    [AvatarEditorFigureCategory.LEGS]: mainLegsSrc,
    [AvatarEditorFigureCategory.HOTLOOKS]: mainHotLooksSrc,
    [AvatarEditorFigureCategory.EFFECTS]: mainEffectsSrc,
    [AvatarEditorFigureCategory.MISC]: mainMiscSrc,
    [AvatarEditorFigureCategory.NFT]: mainNftSrc
};

// AIR removes unavailable tabs without reordering the survivors.
// AvatarEditor layout mainTabs: generic, head, torso, legs, misc (only with clothing.misc.tab.enabled), hotlooks, effects, nfts.
const MAIN_TAB_ORDER: string[] = [
    AvatarEditorFigureCategory.GENERIC,
    AvatarEditorFigureCategory.HEAD,
    AvatarEditorFigureCategory.TORSO,
    AvatarEditorFigureCategory.LEGS,
    AvatarEditorFigureCategory.MISC,
    AvatarEditorFigureCategory.HOTLOOKS,
    AvatarEditorFigureCategory.EFFECTS,
    AvatarEditorFigureCategory.NFT
];

// The v75 AvatarEditor window opens at (100, 30) and is never recentred.
const INITIAL_EDITOR_POSITION = { x: 100, y: 30 };
const SAVE_COOLDOWN_MS = 1500;

export const AvatarEditorView: FC<{}> = (props) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const saveTimer = useRef<number>(null);
    const [editorPosition, setEditorPosition] = useState(INITIAL_EDITOR_POSITION);
    const [isWardrobeOpen, setIsWardrobeOpen] = useState(false);
    const {
        setIsVisible: setEditorVisibility,
        clothingChangeData = null,
        setClothingChangeData = null,
        avatarModels,
        activeModelKey,
        setActiveModelKey,
        gender,
        saveEditorEffect,
        saveEditorFigure,
        getFigureString = null
    } = useAvatarEditor();

    const isHotLooksOpen = activeModelKey === AvatarEditorFigureCategory.HOTLOOKS;
    const isEffectsOpen = activeModelKey === AvatarEditorFigureCategory.EFFECTS;
    const isNftOpen = activeModelKey === AvatarEditorFigureCategory.NFT;
    const hasWardrobe = !clothingChangeData;
    const canUseWardrobe = hasWardrobe && !isNftOpen;
    const orderedModelKeys = Object.keys(avatarModels)
        .filter((modelKey) => modelKey !== AvatarEditorFigureCategory.WARDROBE)
        .sort((left, right) => {
            const leftIndex = MAIN_TAB_ORDER.indexOf(left);
            const rightIndex = MAIN_TAB_ORDER.indexOf(right);

            if (leftIndex === -1) return rightIndex === -1 ? left.localeCompare(right) : 1;
            if (rightIndex === -1) return -1;

            return leftIndex - rightIndex;
        });

    const saveAvatar = () => {
        if (saveTimer.current !== null) return;

        setIsSaving(true);
        saveTimer.current = window.setTimeout(() => {
            saveTimer.current = null;
            setIsSaving(false);
        }, SAVE_COOLDOWN_MS);
        if (clothingChangeData) {
            SendMessageComposer(new SetClothingChangeDataMessageComposer(clothingChangeData.objectId, gender, getFigureString));
        } else {
            saveEditorFigure();
            saveEditorEffect();
        }

        setIsVisible(false);
    };

    useEffect(
        () => () => {
            if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
        },
        []
    );

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

    useEffect(() => {
        if (!canUseWardrobe) setIsWardrobeOpen(false);
    }, [canUseWardrobe]);

    if (!isVisible) return null;

    return (
        <DraggableWindow uniqueKey="avatar-editor" handleSelector=".los-window__bar" initialPosition={editorPosition} onPositionChange={setEditorPosition}>
            <div className={`los-ae-wrap${isWardrobeOpen && canUseWardrobe ? ' has-wardrobe' : ''}`}>
                <LosWindow
                    className="los-ae volt-avatar-editor"
                    icon="shirt"
                    title={LocalizeText(clothingChangeData ? 'widget.furni.clothingchange.editor.title' : 'avatareditor.title')}
                    onClose={() => setIsVisible(false)}
                    actions={
                        hasWardrobe && (
                            <button
                                type="button"
                                disabled={!canUseWardrobe}
                                className={`los-window__button${isWardrobeOpen ? ' is-on' : ''}`}
                                aria-pressed={isWardrobeOpen}
                                title={LocalizeText('avatareditor.wardrobe.title')}
                                onClick={() => setIsWardrobeOpen((open) => !open)}
                            >
                                <LosIcon name="box" size={14} />
                            </button>
                        )
                    }
                >
                    <div className="los-ae__tabs">
                        {orderedModelKeys.map((modelKey) => (
                            <button
                                key={modelKey}
                                type="button"
                                className={`los-ae__tab${activeModelKey === modelKey ? ' is-active' : ''}`}
                                onClick={() => setActiveModelKey(modelKey)}
                            >
                                <img src={MAIN_TAB_ICONS[modelKey]} alt="" draggable={false} />
                            </button>
                        ))}
                    </div>
                    <div className="los-ae__body">
                        <div className="los-ae__side">
                            <AvatarEditorFigurePreviewView />
                            <b className="los-ae__name">{GetSessionDataManager().userName}</b>
                            <button type="button" className="los-button los-button--primary" disabled={isSaving} onClick={saveAvatar}>
                                {LocalizeText('avatareditor.save')}
                            </button>
                        </div>
                        <div className="los-ae__main">
                            {activeModelKey.length > 0 && !isHotLooksOpen && !isEffectsOpen && !isNftOpen && (
                                <AvatarEditorModelView categories={avatarModels[activeModelKey]} name={activeModelKey} />
                            )}
                            {isHotLooksOpen && <AvatarEditorHotLooksView />}
                            {isEffectsOpen && <AvatarEditorEffectsView />}
                            {isNftOpen && <AvatarEditorNftView />}
                        </div>
                    </div>
                </LosWindow>
                {isWardrobeOpen && canUseWardrobe && <AvatarEditorWardrobeView />}
            </div>
        </DraggableWindow>
    );
};
