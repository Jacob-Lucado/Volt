import { FC } from 'react';
import { DraggableWindow } from '../../../common/draggable-window';
import { LosIcon, LosIconName, LosWindow } from '../../../common/lucadoos';

export interface StartPanelProps {
    canUseRoomTool: boolean;
    canUseChatlog: boolean;
    canUseUserInfo: boolean;
    canUseTicketQueue: boolean;
    userCaption: string;
    onRoomTool: () => void;
    onChatlog: () => void;
    onUserInfo: () => void;
    onTicketQueue: () => void;
    onClose: () => void;
    /** The start panel frame (the tracker's parent geometry): where it is shown and where a drag leaves it. */
    x: number;
    y: number;
    onMove: (x: number, y: number) => void;
}

export const StartPanelView: FC<StartPanelProps> = ({ canUseRoomTool, canUseChatlog, canUseUserInfo, canUseTicketQueue, userCaption, onRoomTool, onChatlog, onUserInfo, onTicketQueue, onClose, x, y, onMove }) => {
    const items: { icon: LosIconName; label: string; enabled: boolean; onClick: () => void }[] = [
        { icon: 'home', label: 'Room tool for this room', enabled: canUseRoomTool, onClick: onRoomTool },
        { icon: 'chat', label: 'Chatlog for this room', enabled: canUseChatlog, onClick: onChatlog },
        { icon: 'usersearch', label: userCaption || 'User info', enabled: canUseUserInfo, onClick: onUserInfo },
        { icon: 'list', label: 'Ticket browser', enabled: canUseTicketQueue, onClick: onTicketQueue }
    ];

    return (
        <DraggableWindow handleSelector=".los-window__bar" initialPosition={{ x, y }} onPositionChange={(position) => onMove(position.x, position.y)} unconstrainedPosition>
            <LosWindow className="los-modstart" icon="shield" title="Mod Tools" onClose={onClose}>
                <div className="los-modstart__list">
                    {items.map((item) => (
                        <button key={item.label} type="button" className="los-menu__item" disabled={!item.enabled} onClick={item.onClick}>
                            <LosIcon name={item.icon} />
                            <span>{item.label}</span>
                        </button>
                    ))}
                </div>
            </LosWindow>
        </DraggableWindow>
    );
};
