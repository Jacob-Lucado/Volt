import { AvatarEditorFigureCategory, AvatarFigurePartType, FigureDataContainer } from '@volt/renderer';
import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IAvatarEditorCategory, LocalizeText } from '../../api';
import { useAvatarEditor } from '../../hooks';
import { useAvatarEditorGridWheel } from '../../hooks/avatar-editor/useAvatarEditorGridWheel';
import { AvatarEditorIcon } from './AvatarEditorIcon';
import { AvatarEditorFigureSetView } from './figure-set';
import { AvatarEditorPaletteSetView } from './palette-set';

export const AvatarEditorModelView: FC<{
    name: string;
    categories: IAvatarEditorCategory[];
}> = (props) => {
    const { name = '', categories = [] } = props;
    const container = useRef<HTMLDivElement>(null);
    const [activeSetType, setActiveSetType] = useState<string>(() => categories[0]?.setType ?? '');
    const {
        gender = null,
        selectedParts = null,
        setGender = null,
        selectedColorParts = null,
        getFirstSelectableColor = null,
        selectEditorColor = null
    } = useAvatarEditor();

    const resolvedSetType = useMemo(() => {
        if (categories.some((category) => category.setType === activeSetType)) return activeSetType;

        return categories[0]?.setType ?? '';
    }, [categories, activeSetType]);

    const activeCategory = useMemo(() => {
        return categories.find((category) => category.setType === resolvedSetType) ?? null;
    }, [categories, resolvedSetType]);

    useAvatarEditorGridWheel(container, !!activeCategory);

    // AIR WIN63-202610151745-318700621 common/AvatarEditorGridView.as:144 showPalettes: one palette per colour layer of the worn part, none without one.
    const paletteCount = useMemo(() => {
        const partId = selectedParts?.[resolvedSetType];

        if (partId === undefined || partId === null || partId < 0) return 0;

        const partItem = activeCategory?.partItems.find((item) => !item.isClear && !item.isGetMore && item.id === partId);

        if (partItem) return partItem.maxPaletteCount ?? 0;

        // CategoryBaseModel.updateSelection: a worn part outside the grid shows as many palettes as it has colours.
        return selectedColorParts?.[resolvedSetType]?.length ?? 0;
    }, [activeCategory, resolvedSetType, selectedColorParts, selectedParts]);

    const selectSet = useCallback(
        (setType: string) => {
            const selectedPalettes = selectedColorParts?.[setType];

            if (!selectedPalettes || !selectedPalettes.length) selectEditorColor?.(setType, 0, getFirstSelectableColor?.(setType));

            setActiveSetType(setType);
        },
        [getFirstSelectableColor, selectEditorColor, selectedColorParts]
    );

    useEffect(() => {
        if (!resolvedSetType) return;

        const selectedPalettes = selectedColorParts?.[resolvedSetType];

        if (resolvedSetType === activeSetType && selectedPalettes?.length) return;

        selectSet(resolvedSetType);
    }, [activeSetType, resolvedSetType, selectSet, selectedColorParts]);

    if (!activeCategory) return null;

    return (
        <div ref={container} className="volt-avatar-editor-model los-ae__model">
            <div className="los-ae__chips">
                {name === AvatarEditorFigureCategory.GENERIC && (
                    <>
                        <button
                            type="button"
                            className={`los-ae__chip${gender === FigureDataContainer.MALE ? ' is-active' : ''}`}
                            onClick={() => setGender(AvatarFigurePartType.MALE)}
                        >
                            <AvatarEditorIcon icon="male" selected={gender === FigureDataContainer.MALE} />
                            <span>{LocalizeText('avatareditor.generic.boy')}</span>
                        </button>
                        <button
                            type="button"
                            className={`los-ae__chip${gender === FigureDataContainer.FEMALE ? ' is-active' : ''}`}
                            onClick={() => setGender(AvatarFigurePartType.FEMALE)}
                        >
                            <AvatarEditorIcon icon="female" selected={gender === FigureDataContainer.FEMALE} />
                            <span>{LocalizeText('avatareditor.generic.girl')}</span>
                        </button>
                    </>
                )}
                {name !== AvatarEditorFigureCategory.GENERIC &&
                    categories.map((category) => (
                        <button
                            type="button"
                            key={category.setType}
                            className={`los-ae__chip${resolvedSetType === category.setType ? ' is-active' : ''}`}
                            aria-pressed={resolvedSetType === category.setType}
                            onClick={() => selectSet(category.setType)}
                        >
                            <AvatarEditorIcon icon={category.setType} selected={resolvedSetType === category.setType} />
                        </button>
                    ))}
            </div>

            <div className="volt-avatar-editor-parts-grid los-ae__grid">
                <AvatarEditorFigureSetView category={activeCategory} columnCount={5} />
            </div>

            <div className={`volt-avatar-editor-palettes los-ae__palettes${paletteCount >= 2 ? ' dual-palette' : ''}`}>
                {paletteCount >= 1 && (
                    <div className="avatar-editor-palette-set-view">
                        <AvatarEditorPaletteSetView category={activeCategory} columnCount={paletteCount >= 2 ? 9 : 14} paletteIndex={0} />
                    </div>
                )}
                {paletteCount >= 2 && (
                    <div className="avatar-editor-palette-set-view">
                        <AvatarEditorPaletteSetView category={activeCategory} columnCount={9} paletteIndex={1} />
                    </div>
                )}
            </div>
        </div>
    );
};
