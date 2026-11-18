import { FC } from 'react';
import { LocalizeText, OpenUrl } from '../../../../api';
import { DraggableWindow } from '../../../../common/draggable-window';
import { useFurnitureExchangeWidget } from '../../../../hooks';
import { Native0Border, Native0Button, Native0Frame, Native0Text } from '../../../mod-tools/native/NativeWindow0';

// AIR credit_redeem layout: a 315x165 style 0 frame that opens at (100, 100).
export const FurnitureExchangeCreditView: FC<{}> = () => {
    const { objectId = -1, value = 0, onClose = null, redeem = null } = useFurnitureExchangeWidget();

    if (objectId === -1) return null;

    const openReadMore = () => {
        const url = LocalizeText('widget.furni.info.url');

        if (url.startsWith('http')) OpenUrl(url);
    };

    return (
        <DraggableWindow key={objectId} handleSelector=".native0-header" initialPosition={{ x: 100, y: 100 }}>
            <Native0Frame
                className="furniture-exchange-credit"
                caption={LocalizeText('catalog.redeem.dialog.title')}
                height={165}
                width={315}
                onClose={onClose}
            >
                <Native0Border height={133} width={303} x={0} y={0}>
                    <Native0Text
                        bold
                        wrap
                        height={26}
                        text={LocalizeText('widgets.furniture.credit.redeem.value', ['value'], [value.toString()])}
                        width={265}
                        x={20}
                        y={17}
                    />
                    <div
                        className="native0-box native0-button"
                        data-native-name="link"
                        style={{ left: 20, top: 60, width: 158, height: 17 }}
                        onClick={openReadMore}
                    >
                        <Native0Text underline text={LocalizeText('catelog.redeem.dialog.readmore.description')} width={153} x={0} y={0} />
                    </div>
                    <Native0Button height={22} label={LocalizeText('generic.cancel')} name="cancel" width={80} x={12} y={100} onClick={onClose} />
                    <Native0Button
                        thick
                        height={22}
                        label={LocalizeText('catalog.redeem.dialog.button.exchange')}
                        name="exchange"
                        width={100}
                        x={190}
                        y={100}
                        onClick={redeem}
                    />
                </Native0Border>
            </Native0Frame>
        </DraggableWindow>
    );
};
