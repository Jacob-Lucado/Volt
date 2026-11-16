import { GetSessionDataManager, IRoomSession, RoomPreviewer, Vector3d } from '@volt/renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import {
    attemptItemPlacement,
    DispatchUiEvent,
    FurniCategory,
    GroupItem,
    getGroupItemKey,
    LocalizeText,
    localizeWithFallback,
    UnseenItemCategory
} from '../../../api';
import { LayoutLimitedEditionCompactPlateView, LayoutRarityLevelView, LayoutRoomPreviewerView } from '../../../common';
import { LosIcon } from '../../../common/lucadoos';
import { CatalogPostMarketplaceOfferEvent } from '../../../events';
import { useInventoryFurni, useInventoryUnseenTracker } from '../../../hooks';
import { LosInventoryEmpty } from './LosInventoryEmpty';

const PAGE_SIZE = 200;
const ROOM_DECORATION = [FurniCategory.FLOOR, FurniCategory.WALL_PAPER, FurniCategory.LANDSCAPE];

const sellOnMarketplace = (groupItem: GroupItem) => {
    const item = groupItem.getLastItem();

    if (!item?.sellable) return;

    DispatchUiEvent(
        new CatalogPostMarketplaceOfferEvent(
            item,
            groupItem.items.filter((entry) => entry.sellable && !entry.locked).map((entry) => entry.id)
        )
    );
};

const FurniTile: FC<{ groupItem: GroupItem; isActive: boolean; onSelect: (groupItem: GroupItem) => void }> = ({ groupItem, isActive, onSelect }) => {
    const [isMouseDown, setMouseDown] = useState(false);
    const count = groupItem.getUnlockedCount();
    const uniqueNumber = groupItem.stuffData.uniqueNumber;

    return (
        <button
            type="button"
            title={groupItem.name}
            className={`los-inv__tile${isActive ? ' is-selected' : ''}${groupItem.hasUnseenItems ? ' is-unseen' : ''}${count ? '' : ' is-used'}`}
            onMouseDown={() => {
                onSelect(groupItem);
                setMouseDown(true);
            }}
            onMouseUp={() => setMouseDown(false)}
            // Dragging a selected item out of its tile starts placing it in the room.
            onMouseLeave={() => {
                if (isMouseDown && isActive) attemptItemPlacement(groupItem);

                setMouseDown(false);
            }}
            onDoubleClick={() => attemptItemPlacement(groupItem)}
        >
            <img src={groupItem.iconUrl} alt="" draggable={false} />
            {uniqueNumber > 0 && <span className="los-inv__ltd">#{uniqueNumber}</span>}
            {count > 1 && <span className="los-inv__count">{count}</span>}
        </button>
    );
};

export const LosInventoryFurni: FC<{ roomSession: IRoomSession; roomPreviewer: RoomPreviewer; filteredGroupItems: GroupItem[] }> = (props) => {
    const { roomSession = null, roomPreviewer = null, filteredGroupItems = [] } = props;
    const { groupItems = [], selectedItem = null, setSelectedItem = null, activate = null, deactivate = null } = useInventoryFurni();
    const { resetItems = null } = useInventoryUnseenTracker();
    const [page, setPage] = useState(0);
    const pageCount = Math.max(1, Math.ceil(filteredGroupItems.length / PAGE_SIZE));
    const currentPage = Math.min(page, pageCount - 1);

    useEffect(() => setPage(0), [filteredGroupItems]);

    const tradeableCount = useMemo(() => selectedItem?.items.filter((item) => item.isTradable && !item.locked).length ?? 0, [selectedItem]);
    const recyclableCount = useMemo(() => selectedItem?.items.filter((item) => item.recyclable && !item.locked).length ?? 0, [selectedItem]);

    useEffect(() => {
        if (!selectedItem || !roomPreviewer) return;

        const furnitureItem = selectedItem.getLastItem();

        if (!furnitureItem) return;

        roomPreviewer.reset(false);

        // Furniture is previewed in its own neutral room, not the room the user is standing in.
        let floorType = '110';
        let wallType = 'default';
        let landscapeType = 'default';

        if (ROOM_DECORATION.includes(furnitureItem.category)) {
            const value = selectedItem.stuffData.getLegacyString();

            if (furnitureItem.category === FurniCategory.FLOOR) floorType = value;
            if (furnitureItem.category === FurniCategory.WALL_PAPER) wallType = value;
            if (furnitureItem.category === FurniCategory.LANDSCAPE) landscapeType = value;

            roomPreviewer.updateRoomWallsAndFloorVisibility(true, true);
            roomPreviewer.updateObjectRoom(floorType, wallType, landscapeType);

            if (furnitureItem.category === FurniCategory.LANDSCAPE) {
                const data = GetSessionDataManager().getWallItemDataByName('window_double_default');

                if (data) roomPreviewer.addWallItemIntoRoom(data.id, new Vector3d(90, 0, 0), data.customParams);
            }

            return;
        }

        roomPreviewer.updateObjectRoom(floorType, wallType, landscapeType);
        roomPreviewer.updateRoomWallsAndFloorVisibility(selectedItem.isWallItem, true);

        if (selectedItem.isWallItem) roomPreviewer.addWallItemIntoRoom(selectedItem.type, new Vector3d(90), furnitureItem.stuffData.getLegacyString());
        else roomPreviewer.addFurnitureIntoRoom(selectedItem.type, new Vector3d(90), selectedItem.stuffData, furnitureItem.extra.toString());
    }, [roomPreviewer, selectedItem]);

    useEffect(() => {
        if (!selectedItem?.hasUnseenItems) return;

        resetItems(
            UnseenItemCategory.FURNI,
            selectedItem.items.map((item) => item.id)
        );
        selectedItem.hasUnseenItems = false;
    }, [selectedItem, resetItems]);

    useEffect(() => {
        const id = activate();

        return () => deactivate(id);
    }, [activate, deactivate]);

    if (!groupItems?.length) return <LosInventoryEmpty />;

    const isDecoration = !!selectedItem && ROOM_DECORATION.includes(selectedItem.category);
    const canPlace = !!roomSession && !!selectedItem?.getUnlockedCount();

    return (
        <div className="los-inv__split">
            <div className="los-inv__list">
                <div className="los-inv__grid los-scroll">
                    {filteredGroupItems.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE).map((item) => (
                        <FurniTile key={getGroupItemKey(item)} groupItem={item} isActive={item === selectedItem} onSelect={setSelectedItem} />
                    ))}
                    {!filteredGroupItems.length && (
                        <p className="los-inv__none">{localizeWithFallback('inventory.filter.empty', 'Nothing matches that filter.')}</p>
                    )}
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
                <div
                    className="los-inv__stage"
                    onPointerDown={(event) => {
                        if (event.button !== 0 || !roomSession || !selectedItem || isDecoration) return;

                        attemptItemPlacement(selectedItem);
                    }}
                >
                    <LayoutRoomPreviewerView fitParent roomPreviewer={roomPreviewer} />
                    {selectedItem?.stuffData.isUnique && (
                        <LayoutLimitedEditionCompactPlateView
                            className="top-2 inset-e-2"
                            position="absolute"
                            uniqueNumber={selectedItem.stuffData.uniqueNumber}
                            uniqueSeries={selectedItem.stuffData.uniqueSeries}
                        />
                    )}
                    {selectedItem && selectedItem.stuffData.rarityLevel > -1 && (
                        <LayoutRarityLevelView className="top-2 inset-e-2" level={selectedItem.stuffData.rarityLevel} position="absolute" />
                    )}
                    {selectedItem && (
                        <div className="los-inv__stage-tools">
                            <button
                                type="button"
                                title={localizeWithFallback('widget.furniture.button.rotate', 'Rotate')}
                                onPointerDown={(event) => event.stopPropagation()}
                                onClick={() => roomPreviewer?.changeRoomObjectDirection()}
                            >
                                <LosIcon name="refresh" size={13} />
                            </button>
                            <button
                                type="button"
                                title={localizeWithFallback('widget.furniture.button.use', 'Use')}
                                onPointerDown={(event) => event.stopPropagation()}
                                onClick={() => roomPreviewer?.changeRoomObjectState()}
                            >
                                <LosIcon name="bolt" size={13} />
                            </button>
                        </div>
                    )}
                </div>
                {selectedItem && (
                    <>
                        <strong className="los-inv__name">{selectedItem.name}</strong>
                        {selectedItem.description && <p className="los-inv__desc los-scroll">{selectedItem.description}</p>}
                        <div className="los-inv__chips">
                            <span
                                className={`los-inv__chip${tradeableCount ? ' is-on' : ''}`}
                                title={
                                    tradeableCount
                                        ? LocalizeText('inventory.furni.trading.is_tradable', ['amount'], [String(tradeableCount)])
                                        : LocalizeText('inventory.furni.trading.is_not_tradable')
                                }
                            >
                                <LosIcon name="swap" size={12} />
                                {tradeableCount}
                            </span>
                            <span
                                className={`los-inv__chip${recyclableCount ? ' is-on' : ''}`}
                                title={
                                    recyclableCount
                                        ? LocalizeText('inventory.furni.recycling.is_recyclable', ['amount'], [String(recyclableCount)])
                                        : LocalizeText('inventory.furni.recycling.is_not_recyclable')
                                }
                            >
                                <LosIcon name="refresh" size={12} />
                                {recyclableCount}
                            </span>
                        </div>
                        <div className="los-inv__actions">
                            <button
                                type="button"
                                className="los-button los-button--primary"
                                disabled={!canPlace}
                                onClick={() => attemptItemPlacement(selectedItem)}
                            >
                                {LocalizeText('inventory.furni.placetoroom')}
                            </button>
                            {selectedItem.isSellable && (
                                <button type="button" className="los-button" onClick={() => sellOnMarketplace(selectedItem)}>
                                    {LocalizeText('inventory.marketplace.sell')}
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
