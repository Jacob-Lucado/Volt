import { FC } from 'react';
import { LayoutTrophyView } from '../../../../common';
import { useFurnitureTrophyWidget } from '../../../../hooks';

export const FurnitureTrophyView: FC<{}> = (props) => {
    const { objectId = -1, requestId = 0, color = '1', senderName = '', date = '', message = '', onClose = null } = useFurnitureTrophyWidget();

    if (objectId === -1) return null;

    return <LayoutTrophyView key={requestId} color={color} date={date} message={message} senderName={senderName} onCloseClick={onClose} />;
};
