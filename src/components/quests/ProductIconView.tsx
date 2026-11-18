import { FC } from 'react';
import { ACTIVITY_POINT_ICON_LAYOUT_SIZES, ACTIVITY_POINT_ICON_REGIONS, GetActivityPointIconStyle, ProductTypeEnum } from '../../api';
import {
    LayoutActivityPointIcon,
    LayoutAvatarImageView,
    LayoutBadgeImageView,
    LayoutFurniIconImageView,
    LayoutHabbiconImageView,
    LayoutPetImageView
} from '../../common';

/**
 * A daily task reward or reward track prize as the official product icon widget draws it (ProductIconWidget.as:91-160):
 * the product type picks the kind, the item type id is a wall or floor class id, a badge code, a currency type or a
 * habbicon id, and the extra params hold a bot or pet figure.
 */
const WALL_ITEM = 0;
const FLOOR_ITEMS = [1, 11];
const BADGE = 4;
const BOT = 6;
const CURRENCY = 8;
const PET = 10;
const HABBICON = 12;

/** A currency is product_icon.xml's icon window: big icon style, sized to its skin layout and kept centred in the 40x40 widget (half the size change, truncated). */
const CurrencyIcon: FC<{ type: number }> = ({ type }) => {
    const style = GetActivityPointIconStyle(type, true);
    const region = ACTIVITY_POINT_ICON_REGIONS[style];

    if (!region) return null;

    const [width, height] = ACTIVITY_POINT_ICON_LAYOUT_SIZES[style] ?? [region[2], region[3]];

    return <LayoutActivityPointIcon big type={type} style={{ position: 'absolute', left: Math.trunc((40 - width) / 2), top: Math.trunc((40 - height) / 2) }} />;
};

export const ProductIconView: FC<{ productTypeId: number; itemTypeId: string; extraParams: string }> = ({ productTypeId, itemTypeId, extraParams }) => {
    if (productTypeId === BADGE) return <LayoutBadgeImageView badgeCode={itemTypeId} />;

    // botResult: the bot's head, direction 3.
    if (productTypeId === BOT) return extraParams ? <LayoutAvatarImageView figure={extraParams} headOnly direction={3} /> : null;

    if (productTypeId === PET) return extraParams ? <LayoutPetImageView figure={extraParams} /> : null;

    const classId = Number.parseInt(itemTypeId, 10);

    if (Number.isNaN(classId)) return null;

    if (productTypeId === CURRENCY) return <CurrencyIcon type={classId} />;

    if (productTypeId === WALL_ITEM) return <LayoutFurniIconImageView productClassId={classId} productType={ProductTypeEnum.WALL} />;

    if (FLOOR_ITEMS.includes(productTypeId)) return <LayoutFurniIconImageView productClassId={classId} productType={ProductTypeEnum.FLOOR} />;

    if (productTypeId === HABBICON) return <LayoutHabbiconImageView id={classId} />;

    return null;
};
