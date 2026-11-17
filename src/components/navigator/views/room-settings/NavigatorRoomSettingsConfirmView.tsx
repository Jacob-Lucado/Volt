import { FC } from 'react';
import { LocalizeText } from '../../../../api';
import { DraggableWindow } from '../../../../common';
import { LosWindow } from '../../../../common/lucadoos';

interface NavigatorRoomSettingsConfirmViewProps {
    title: string;
    message: string;
    onConfirm: () => void;
    onClose: () => void;
}

export const NavigatorRoomSettingsConfirmView: FC<NavigatorRoomSettingsConfirmViewProps> = (props) => {
    const { title, message, onConfirm, onClose } = props;

    return (
        <DraggableWindow uniqueKey="volt-room-settings-confirm" handleSelector=".los-window__bar">
            <LosWindow className="los-ros-confirm" icon="info" title={title} onClose={onClose}>
                <div className="los-ros__confirm">
                    <p>{message}</p>
                    <div>
                        <button type="button" className="los-button" onClick={onClose}>
                            {LocalizeText('generic.cancel')}
                        </button>
                        <button type="button" className="los-button los-button--primary" onClick={onConfirm}>
                            {LocalizeText('generic.ok')}
                        </button>
                    </div>
                </div>
            </LosWindow>
        </DraggableWindow>
    );
};
