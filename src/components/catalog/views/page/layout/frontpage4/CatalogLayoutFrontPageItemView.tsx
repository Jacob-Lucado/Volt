import { FrontPageItem } from '@volt/renderer';
import { FC } from 'react';
import { GetConfigurationValue } from '../../../../../../api';

export interface CatalogLayoutFrontPageItemViewProps {
    item: FrontPageItem;
    first?: boolean;
    onSelect: (item: FrontPageItem) => void;
}

// featured_item_template / firstitem: the bitmap stays at its natural size (stretched_x/y false, pivot center).
// The first item's click region stops above the title strip (184x422). List items use the full 360x126 cell.
// item_title is ubuntu_condensed_title (UbuntuCondensed 18, white) over a 0x333333 border at blend 0.5; it wraps at
// width_max 340, or 174 in the first item's border.
export const CatalogLayoutFrontPageItemView: FC<CatalogLayoutFrontPageItemViewProps> = (props) => {
    const { item = null, first = false, onSelect = null } = props;

    if (!item) return null;

    const imageUrl = item.itemPromoImage ? GetConfigurationValue<string>('image.library.url', '') + item.itemPromoImage : null;

    return (
        // The original reacts on mouse down, not on click.
        <button
            className={`los-front__item${first ? ' is-first' : ''}`}
            type="button"
            onKeyDown={(event) => (event.key === 'Enter' || event.key === ' ') && onSelect(item)}
            onMouseDown={() => onSelect(item)}
        >
            <span className="los-front__art" style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined} />
            <span className="los-front__title">{item.itemName}</span>
        </button>
    );
};
