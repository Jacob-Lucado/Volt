import { GetWiredContextMenuComposer, IWiredContextMenuItem, WiredContextMenuClickComposer, WiredContextMenuEvent } from '@volt/renderer';
import { FC, useEffect, useState } from 'react';
import { SendMessageComposer, WiredContextMenuTargetType } from '../../../../../api';
import { useMessageEvent } from '../../../../../hooks';
import { ContextMenuListItemView } from '../../context-menu/ContextMenuListItemView';

/**
 * Asks the server for the wired context menu items of a room unit every time its menu opens (a new `menuInfo`),
 * and keeps only the answer for that unit. A closed menu stops listening, so a late answer is dropped.
 */
export const useWiredContextMenuItems = (menuInfo: { roomIndex: number }) => {
    const roomIndex = menuInfo?.roomIndex ?? -1;
    const [items, setItems] = useState<IWiredContextMenuItem[]>([]);

    useEffect(() => {
        setItems([]);

        if (roomIndex < 0) return;

        SendMessageComposer(new GetWiredContextMenuComposer(WiredContextMenuTargetType.ROOM_UNIT, roomIndex));
    }, [menuInfo, roomIndex]);

    useMessageEvent<WiredContextMenuEvent>(WiredContextMenuEvent, (event) => {
        const parser = event.getParser();

        if (parser.targetType !== WiredContextMenuTargetType.ROOM_UNIT || parser.targetId !== roomIndex) return;

        setItems(parser.items);
    });

    const click = (item: IWiredContextMenuItem) => {
        if (!item.enabled) return;

        SendMessageComposer(new WiredContextMenuClickComposer(WiredContextMenuTargetType.ROOM_UNIT, roomIndex, item.buttonId));
    };

    return { items, click };
};

interface WiredContextMenuItemsViewProps {
    items: IWiredContextMenuItem[];
    onClick: (item: IWiredContextMenuItem) => void;
    onClose: () => void;
}

/** The wired items in the look of the other menu items; a disabled item is greyed out and cannot be clicked. */
export const WiredContextMenuItemsView: FC<WiredContextMenuItemsViewProps> = ({ items, onClick, onClose }) => (
    <>
        {items.map((item, index) => (
            <ContextMenuListItemView key={`${item.buttonId}-${index}`} disabled={!item.enabled} onClick={() => {
                onClick(item);
                onClose();
            }}>
                {item.text}
            </ContextMenuListItemView>
        ))}
    </>
);
