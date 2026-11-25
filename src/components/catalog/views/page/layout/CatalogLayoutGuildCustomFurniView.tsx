import { FC } from 'react';
import { Offer } from '../../../../../api';
import { NativeText } from '../../../../../common/native-text/NativeText';
import { getCatalogGridMetrics, useCatalogData, useCatalogDisplayPreferences, useUserGroups } from '../../../../../hooks';
import { getCatalogPlainText } from '../../../catalogLocalization.helpers';
import { CatalogCentredImageView } from '../widgets/CatalogCentredImageView';
import { CatalogFirstProductSelectorWidgetView } from '../widgets/CatalogFirstProductSelectorWidgetView';
import { CatalogGuildBadgeWidgetView } from '../widgets/CatalogGuildBadgeWidgetView';
import { CatalogGuildSelectorWidgetView } from '../widgets/CatalogGuildSelectorWidgetView';
import { CatalogItemGridWidgetView } from '../widgets/CatalogItemGridWidgetView';
import { CatalogPreviewControls } from '../widgets/CatalogPreviewControls';
import { CatalogProductDetailsView } from '../widgets/CatalogProductDetailsView';
import { CatalogPurchaseWidgetView } from '../widgets/CatalogPurchaseWidgetView';
import { CatalogViewProductWidgetView } from '../widgets/CatalogViewProductWidgetView';
import { CatalogAirPriceDisplayView } from './CatalogAirPriceDisplayView';
import { CatalogLayoutProps } from './CatalogLayout.types';

const PAGE_BACKGROUND = 0xe9e9e1;

/**
 * AIR layout_guild_custom_furni (360x460): the product view, the special info, the group badge, a 125px item grid, the
 * guild selector and the purchase widget.
 */
export const CatalogLayouGuildCustomFurniView: FC<CatalogLayoutProps> = (props) => {
    const { page = null } = props;
    const { currentOffer = null, roomPreviewer = null } = useCatalogData();
    const isBundleOffer = currentOffer?.pricingModel === Offer.PRICING_MODEL_BUNDLE;
    const { data: groups = null } = useUserGroups();
    const { density = 'standard', showTilePrices = true } = useCatalogDisplayPreferences();
    const gridMetrics = getCatalogGridMetrics(density);
    const hasGroups = !!(groups && groups.length);
    const teaserImage = page.localization.getImage(1);
    const teaserText = getCatalogPlainText(page.localization.getText(1));
    const specialImage = page.localization.getImage(2);
    const specialText = getCatalogPlainText(page.localization.getText(2));

    return (
        <div className="volt-catalog-guild-furni">
            {/* GuildMembershipsController selects the first offer once the groups arrive. */}
            <CatalogFirstProductSelectorWidgetView />

            {/* productViewWidget (0, 0, 360x240). */}
            <div className="volt-catalog-guild-furni-product">
                {currentOffer ? (
                    <div className={`volt-catalog-offer-preview ${isBundleOffer ? 'is-bundle' : ''}`.trim()}>
                        <div className="volt-catalog-preview-details">
                            <CatalogProductDetailsView offer={currentOffer} />
                        </div>
                        {!isBundleOffer && <CatalogPreviewControls productType={currentOffer.product.productType} roomPreviewer={roomPreviewer} />}
                        <CatalogViewProductWidgetView height={240} />
                        {hasGroups && (
                            <div className="volt-catalog-guild-furni-price volt-catalog-guild-price">
                                <div className="volt-catalog-preview-price volt-catalog-price-frame">
                                    <CatalogTotalPriceWidget alignItems="end" />
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        {!!teaserImage && <CatalogCentredImageView key={teaserImage} src={teaserImage} />}
                        {!!teaserText && (
                            <NativeText
                                nativeResolution
                                background={PAGE_BACKGROUND}
                                className="volt-catalog-welcome-description"
                                maxWidth={280}
                                overrides={{ italic: true }}
                                text={teaserText}
                                textStyle="u_small"
                            />
                        )}
                    </>
                )}
            </div>

            {/* specialInfoWidget (94, 18, 142x73): hidden by the first SELECT_PRODUCT. */}
            {!currentOffer && (!!specialImage || !!specialText) && (
                <div className="volt-catalog-guild-furni-special">
                    {!!specialImage && <img alt="" className="volt-catalog-guild-furni-special-image" src={specialImage} />}
                    {!!specialText && (
                        <NativeText
                            align="center"
                            background={PAGE_BACKGROUND}
                            className="volt-catalog-guild-furni-special-text"
                            overrides={{ size: 11, italic: true, color: 0x333333 }}
                            text={specialText}
                            textStyle="u_regular"
                            width={139}
                        />
                    )}
                </div>
            )}

            <CatalogGuildBadgeWidgetView className="volt-catalog-guild-furni-badge" />

            <div className="volt-catalog-grid-shell volt-catalog-guild-furni-grid">
                <CatalogItemGridWidgetView
                    className={`volt-catalog-grid volt-catalog-grid-density-${density}`}
                    showPrices={showTilePrices}
                    {...gridMetrics}
                />
            </div>

            <CatalogGuildSelectorWidgetView className="volt-catalog-guild-furni-selector" />

            {/* purchaseWidget (0, 430): no NO_GIFT_OPTION tag here, so the gift button shows. Hidden without any group. */}
            {!!currentOffer && hasGroups && (
                <div className="volt-catalog-purchase-row">
                    <div className="volt-catalog-offer-actions flex gap-1.5">
                        <CatalogPurchaseWidgetView />
                    </div>
                </div>
            )}
        </div>
    );
};
