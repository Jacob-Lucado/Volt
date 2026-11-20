import { CreateLinkEvent, FrontPageItem } from '@volt/renderer';
import { FC, useCallback, useEffect } from 'react';
import { GetConfigurationValue } from '../../../../../../api';
import { useCatalogData } from '../../../../../../hooks';
import { CatalogRedeemVoucherView } from '../../common/CatalogRedeemVoucherView';
import { CatalogLayoutProps } from '../CatalogLayout.types';
import { CatalogLayoutFrontPageItemView } from './CatalogLayoutFrontPageItemView';

/** FeaturedItemsCatalogWidget.eventProc: two mobile page names open their desktop pages. */
const PAGE_ALIASES: Record<string, string> = { room_bundles_mobile: 'room_bundles', mobile_subscriptions: 'hc_membership' };

/** FeaturedItemsCatalogWidget.init: the first item plus up to three list items. */
const MAX_FRONT_PAGE_ITEMS = 4;

// layout_frontpage_featured: 552x460. First item 184x460 at (0,0), list at (192,0), voucher border at (200,399).
export const CatalogLayoutFrontpage4View: FC<CatalogLayoutProps> = (props) => {
    const { page = null, hideNavigation = null } = props;
    const { frontPageItems = [] } = useCatalogData();
    const discordUrl = GetConfigurationValue<string>('discord.url', '');
    const sideCount = discordUrl ? MAX_FRONT_PAGE_ITEMS - 2 : MAX_FRONT_PAGE_ITEMS - 1;

    const selectItem = useCallback((item: FrontPageItem) => {
        switch (item.type) {
            case FrontPageItem.ITEM_CATALOGUE_PAGE:
                CreateLinkEvent(`catalog/open/${PAGE_ALIASES[item.catalogPageLocation] ?? item.catalogPageLocation}`);
                return;
            case FrontPageItem.ITEM_PRODUCT_OFFER:
                // openCatalogPageByOfferId: the page that holds the offer.
                CreateLinkEvent(`catalog/open/offerId/${item.productOfferId}`);
                return;
        }
    }, []);

    useEffect(() => {
        hideNavigation();
    }, [page, hideNavigation]);

    return (
        <div className="los-front">
            {frontPageItems[0] && <CatalogLayoutFrontPageItemView first item={frontPageItems[0]} onSelect={selectItem} />}
            <div className="los-front__side">
                {frontPageItems.slice(1, 1 + sideCount).map((item, index) => (
                    <CatalogLayoutFrontPageItemView key={`${item.itemName}-${index}`} item={item} onSelect={selectItem} />
                ))}
                {discordUrl && /^https:\/\//.test(discordUrl) && (
                    <button className="los-front__discord" type="button" onClick={() => window.open(discordUrl, '_blank', 'noopener,noreferrer')}>
                        <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
                            <path fill="currentColor" d="M20.3 4.4A18 18 0 0 0 15.9 3l-.2.4a16.6 16.6 0 0 1 4 1.9 14.7 14.7 0 0 0-5.1-1.6 15 15 0 0 0-5.2 0A14.7 14.7 0 0 0 4.3 5.3a16.6 16.6 0 0 1 4-1.9L8.1 3a18 18 0 0 0-4.4 1.4C.9 8.6.2 12.7.5 16.7a18 18 0 0 0 5.4 2.7l1.2-1.9a11.7 11.7 0 0 1-1.9-.9l.5-.4a12.9 12.9 0 0 0 11.1 0l.5.4a11.7 11.7 0 0 1-1.9.9l1.2 1.9a18 18 0 0 0 5.4-2.7c.4-4.700-.7-8.8-3.2-12.300ZM8.700 14.300c-1 0-1.800-.9-1.800-2s.8-2 1.800-2 1.800.9 1.800 2-.8 2-1.800 2Zm6.600 0c-1 0-1.800-.9-1.800-2s.8-2 1.800-2 1.800.9 1.800 2-.8 2-1.800 2Z" />
                        </svg>
                        <span className="los-front__discord-text">
                            <strong>Join our Discord</strong>
                            <small>Events, news and friends</small>
                        </span>
                        <span className="los-front__discord-go">Join</span>
                    </button>
                )}
                <CatalogRedeemVoucherView text={page.localization.getText(1)} />
            </div>
        </div>
    );
};
