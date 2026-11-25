import { RoomObjectCategory, RoomObjectType } from '@volt/renderer';
import { FC } from 'react';
import { AvatarInfoUser } from '../../../../../api';
import { ContextMenuHeaderView } from '../../context-menu/ContextMenuHeaderView';
import { ContextMenuView } from '../../context-menu/ContextMenuView';
import { useWiredContextMenuItems, WiredContextMenuItemsView } from './WiredContextMenuItemsView';

interface AvatarInfoWidgetBotViewProps {
    avatarInfo: AvatarInfoUser;
    onClose: () => void;
}

/** A plain bot has no menu of its own; it gets one only to show the room's wired context menu items. */
export const AvatarInfoWidgetBotView: FC<AvatarInfoWidgetBotViewProps> = ({ avatarInfo = null, onClose = null }) => {
    const wiredMenu = useWiredContextMenuItems(avatarInfo);

    if (!wiredMenu.items.length) return null;

    return (
        <ContextMenuView
            category={RoomObjectCategory.UNIT}
            classNames={['volt-avatar-action-menu', 'volt-avatar-action-menu--own', 'volt-avatar-action-menu--bot']}
            collapsable={true}
            freezePositionOnHover={true}
            objectId={avatarInfo.roomIndex}
            repositionKey={wiredMenu.items.length}
            showCaretIcon={false}
            userType={RoomObjectType.BOT}
            onClose={onClose}
        >
            <ContextMenuHeaderView>{avatarInfo.name}</ContextMenuHeaderView>
            <div className="air-avatar-menu-buttons">
                <WiredContextMenuItemsView items={wiredMenu.items} onClick={wiredMenu.click} onClose={onClose} />
            </div>
        </ContextMenuView>
    );
};
