import { DragEvent, FC, useEffect, useMemo, useState } from 'react';
import { GetConfigurationValue, LocalizeBadgeDescription, LocalizeBadgeName, localizeWithFallback, UnseenItemCategory } from '../../../api';
import { LayoutBadgeImageView } from '../../../common';
import { useInventoryBadges, useInventoryUnseenTracker } from '../../../hooks';

const PAGE_SIZE = 200;

const startBadgeDrag = (event: DragEvent, badgeCode: string, slotIndex: number | null) => {
    event.dataTransfer.setData('badgeCode', badgeCode);
    event.dataTransfer.setData('source', slotIndex === null ? 'inventory' : 'active');
    event.dataTransfer.effectAllowed = 'move';

    if (slotIndex !== null) event.dataTransfer.setData('activeSlot', String(slotIndex));

    const image = new Image();

    image.src = GetConfigurationValue<string>('badge.asset.url').replace('%badgename%', badgeCode);
    event.dataTransfer.setDragImage(image, 20, 20);
};

export const LosInventoryBadges: FC<{ filteredBadgeCodes?: string[] }> = ({ filteredBadgeCodes = null }) => {
    const {
        badgeCodes = [],
        activeBadgeCodes = [],
        selectedBadgeCode = null,
        isWearingBadge = null,
        canWearBadges = null,
        toggleBadge = null,
        getBadgeId = null,
        setBadgeAtSlot = null,
        removeBadge = null,
        reorderBadges = null,
        setSelectedBadgeCode = null,
        activate = null,
        deactivate = null
    } = useInventoryBadges();
    const { isUnseen = null, removeUnseen = null } = useInventoryUnseenTracker();
    const [dropTarget, setDropTarget] = useState<number | 'owned' | null>(null);
    const [page, setPage] = useState(0);
    const maxSlots = useMemo(() => GetConfigurationValue<number>('user.badges.max.slots', 5), []);
    const inactiveCodes = (filteredBadgeCodes ?? badgeCodes).filter((code) => !isWearingBadge(code));
    const pageCount = Math.max(1, Math.ceil(inactiveCodes.length / PAGE_SIZE));
    const currentPage = Math.min(page, pageCount - 1);

    useEffect(() => {
        if (!selectedBadgeCode || !isUnseen(UnseenItemCategory.BADGE, getBadgeId(selectedBadgeCode))) return;

        removeUnseen(UnseenItemCategory.BADGE, getBadgeId(selectedBadgeCode));
    }, [selectedBadgeCode, isUnseen, removeUnseen, getBadgeId]);

    useEffect(() => {
        const id = activate();

        return () => deactivate(id);
    }, [activate, deactivate]);

    const description = selectedBadgeCode ? LocalizeBadgeDescription(selectedBadgeCode) : '';
    const hasDescription = !!description && description !== selectedBadgeCode && description !== `badge_desc_${selectedBadgeCode}`;
    const isWearing = !!selectedBadgeCode && isWearingBadge(selectedBadgeCode);

    return (
        <div className="los-inv__split">
            <div className="los-inv__list">
                <div
                    className={`los-inv__grid los-scroll${dropTarget === 'owned' ? ' is-drop' : ''}`}
                    onDragLeave={() => setDropTarget(null)}
                    onDragOver={(event) => {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = 'move';

                        // Only a badge dragged off a worn slot can be dropped here.
                        if (event.dataTransfer.types.includes('activeslot')) setDropTarget('owned');
                    }}
                    onDrop={(event) => {
                        event.preventDefault();
                        setDropTarget(null);

                        const badgeCode = event.dataTransfer.getData('badgeCode');

                        if (event.dataTransfer.getData('source') === 'active' && badgeCode) removeBadge(badgeCode);
                    }}
                >
                    {inactiveCodes.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE).map((code) => (
                        <div
                            key={code}
                            draggable
                            title={LocalizeBadgeName(code)}
                            className={`los-inv__tile${selectedBadgeCode === code ? ' is-selected' : ''}${isUnseen(UnseenItemCategory.BADGE, getBadgeId(code)) ? ' is-unseen' : ''}`}
                            onDoubleClick={() => toggleBadge(code)}
                            onDragStart={(event) => startBadgeDrag(event, code, null)}
                            onMouseDown={() => setSelectedBadgeCode(code)}
                        >
                            <LayoutBadgeImageView badgeCode={code} />
                        </div>
                    ))}
                </div>
                {pageCount > 1 && (
                    <div className="los-inv__pages">
                        {Array.from({ length: pageCount }, (_, index) => (
                            <button key={index} type="button" className={index === currentPage ? 'is-active' : ''} onClick={() => setPage(index)}>
                                {index + 1}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            <div className="los-inv__side">
                <span className="los-inv__label">{localizeWithFallback('inventory.badges.activebadges', 'Wearing')}</span>
                <div className="los-inv__slots">
                    {Array.from({ length: maxSlots }, (_, index) => {
                        const code = activeBadgeCodes[index];

                        return (
                            <div
                                key={index}
                                draggable={!!code}
                                title={code ? LocalizeBadgeName(code) : undefined}
                                className={`los-inv__tile los-inv__slot${code ? '' : ' is-empty'}${code && code === selectedBadgeCode ? ' is-selected' : ''}${dropTarget === index ? ' is-drop' : ''}`}
                                onDragLeave={() => setDropTarget(null)}
                                onDragOver={(event) => {
                                    event.preventDefault();
                                    event.dataTransfer.dropEffect = 'move';
                                    setDropTarget(index);
                                }}
                                onDragStart={(event) => code && startBadgeDrag(event, code, index)}
                                onDrop={(event) => {
                                    event.preventDefault();
                                    setDropTarget(null);

                                    const badgeCode = event.dataTransfer.getData('badgeCode');
                                    const sourceSlot = event.dataTransfer.getData('activeSlot');

                                    if (!badgeCode) return;

                                    if (sourceSlot !== '') reorderBadges(Number.parseInt(sourceSlot, 10), index);
                                    else setBadgeAtSlot(badgeCode, index);
                                }}
                                onMouseDown={() => code && setSelectedBadgeCode(code)}
                            >
                                {code && <LayoutBadgeImageView badgeCode={code} />}
                            </div>
                        );
                    })}
                </div>
                {selectedBadgeCode && (
                    <>
                        <div className="los-inv__stage los-inv__stage--badge">
                            <LayoutBadgeImageView badgeCode={selectedBadgeCode} />
                        </div>
                        <strong className="los-inv__name">{LocalizeBadgeName(selectedBadgeCode)}</strong>
                        {hasDescription && <p className="los-inv__desc los-scroll">{description}</p>}
                    </>
                )}
                <div className="los-inv__actions">
                    <button
                        type="button"
                        className={`los-button${isWearing ? '' : ' los-button--primary'}`}
                        disabled={!selectedBadgeCode || (!isWearing && !canWearBadges())}
                        onClick={() => toggleBadge(selectedBadgeCode)}
                    >
                        {isWearing
                            ? localizeWithFallback('inventory.badges.clearbadge', 'Clear badge')
                            : localizeWithFallback('inventory.badges.wearbadge', 'Wear badge')}
                    </button>
                </div>
            </div>
        </div>
    );
};
