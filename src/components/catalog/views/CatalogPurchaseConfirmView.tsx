import { FC, KeyboardEvent, ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { GetConfigurationValue, IPurchasableOffer, LocalizeText, ProductTypeEnum } from '../../../api';
import { getCatalogBundlePrice, ICatalogBundleDiscountRuleset } from '../../../api/catalog/CatalogBundleDiscount';
import { LayoutCurrencyIcon, LayoutFurniImageView } from '../../../common';
import { LosIcon } from '../../../common/lucadoos';

interface CatalogPurchaseConfirmViewProps {
    offer: IPurchasableOffer;
    quantity: number;
    bundleDiscountRuleset?: ICatalogBundleDiscountRuleset;
    isGift?: boolean;
    isSubmitting?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    preview?: ReactNode;
    /** PurchaseConfirmationDialog.showConfirmationDialog colours collectibles offers 0x2a2a2a. */
    frameColor?: number;
}

export const CatalogPurchaseConfirmView: FC<CatalogPurchaseConfirmViewProps> = (props) => {
    const {
        offer = null,
        quantity = 1,
        bundleDiscountRuleset = null,
        isGift = false,
        isSubmitting = false,
        onConfirm = null,
        onCancel = null,
        preview = null,
        frameColor = null
    } = props;
    const dialogRef = useRef<HTMLDivElement>(null);
    const spendingDisclaimerEnabled = GetConfigurationValue<boolean>('disclaimer.credit_spending.enabled', false) === true;
    const [spendingDisclaimerAccepted, setSpendingDisclaimerAccepted] = useState(!spendingDisclaimerEnabled);

    useEffect(() => {
        const previousActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;

        dialogRef.current?.focus();

        return () => {
            if (previousActiveElement?.isConnected) previousActiveElement.focus();
        };
    }, []);

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            onCancel?.();

            return;
        }

        if (event.key !== 'Tab' || !dialogRef.current) return;

        const focusableElements = Array.from(
            dialogRef.current.querySelectorAll<HTMLElement>(
                'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )
        );

        if (!focusableElements.length) {
            event.preventDefault();

            return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey && document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
        }
    };

    if (!offer) return null;

    const credits = getCatalogBundlePrice(offer.priceInCredits, quantity, offer.bundlePurchaseAllowed, bundleDiscountRuleset).price;
    const activityPoints = getCatalogBundlePrice(offer.priceInActivityPoints, quantity, offer.bundlePurchaseAllowed, bundleDiscountRuleset).price;
    const freeItemCount = offer.bundlePurchaseAllowed ? getCatalogBundlePrice(1, quantity, true, bundleDiscountRuleset).freeItemCount : 0;
    const hasCredits = credits > 0;
    const hasActivityPoints = activityPoints > 0;
    const title = LocalizeText(isGift ? 'catalog.purchase_confirmation.gift.title' : 'catalog.purchase_confirmation.title');
    const iconUrl = typeof offer.product?.getIconUrl === 'function' ? offer.product.getIconUrl(offer) : null;
    const isFurniture = offer.product?.productType === ProductTypeEnum.FLOOR || offer.product?.productType === ProductTypeEnum.WALL;
    const isLimited = !!offer.product?.isUniqueLimitedItem;

    return createPortal(
        <div className="los-dialog-backdrop">
            <div
                ref={dialogRef}
                aria-label={title}
                aria-modal="true"
                className={`los-window los-dialog los-confirm${frameColor === null ? '' : ' is-collectible'}`}
                role="dialog"
                tabIndex={-1}
                onKeyDown={onKeyDown}
            >
                <header className="los-window__bar">
                    <LosIcon name={isGift ? 'gift' : 'bag'} />
                    <span className="los-window__title">{title}</span>
                    <span className="los-window__actions">
                        <button
                            type="button"
                            className="los-window__button los-window__button--close"
                            aria-label={LocalizeText('generic.close')}
                            onClick={onCancel}
                        >
                            <LosIcon name="close" size={14} />
                        </button>
                    </span>
                </header>
                <div className="los-confirm__body">
                    <div className="los-confirm__preview">
                        {preview ??
                            (isFurniture ? (
                                <LayoutFurniImageView
                                    aria-label={offer.localizationName}
                                    direction={90}
                                    extraData={offer.product.extraParam}
                                    productClassId={offer.product.productClassId}
                                    productType={offer.product.productType}
                                    role="img"
                                    scale={0.5}
                                />
                            ) : (
                                !!iconUrl && <img alt={offer.localizationName} src={iconUrl} />
                            ))}
                    </div>
                    <div className="los-confirm__details">
                        <strong className="los-confirm__name">{offer.localizationName}</strong>
                        {quantity > 1 && <strong className="los-confirm__quantity">X {quantity}</strong>}
                        {freeItemCount > 0 && (
                            <strong className="los-confirm__bonus">{LocalizeText('shop.bonus.items.count', ['amount'], [freeItemCount.toString()])}</strong>
                        )}
                        <div className="los-confirm__cost">
                            <span>{LocalizeText('catalog.purchase.confirmation.dialog.cost')}</span>
                            {hasCredits && (
                                <span className="los-confirm__price" data-currency-type="-1">
                                    <strong>{credits}</strong>
                                    <LayoutCurrencyIcon type={-1} />
                                </span>
                            )}
                            {hasActivityPoints && (
                                <span className="los-confirm__price" data-currency-type={offer.activityPointType}>
                                    <strong>{hasCredits ? `+ ${activityPoints}` : activityPoints}</strong>
                                    <LayoutCurrencyIcon big type={offer.activityPointType} />
                                </span>
                            )}
                            {!hasCredits && !hasActivityPoints && (
                                <span className="los-confirm__price" data-currency-type="-1">
                                    <strong>0</strong>
                                    <LayoutCurrencyIcon type={-1} />
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                {spendingDisclaimerEnabled && (
                    <label className="los-confirm__disclaimer">
                        <input checked={spendingDisclaimerAccepted} type="checkbox" onChange={(event) => setSpendingDisclaimerAccepted(event.target.checked)} />
                        <span>{LocalizeText('disclaimer.credit_spending')}</span>
                    </label>
                )}
                {isLimited && (
                    <div className="volt-catalog-purchase-confirm-limited los-confirm__limited" role="status">
                        <span>
                            {LocalizeText('unique.items.left')} <strong>{offer.product.uniqueLimitedItemsLeft}</strong>
                            {' / '}
                            {LocalizeText('unique.items.number.sold')} <strong>{offer.product.uniqueLimitedItemSeriesSize}</strong>
                        </span>
                    </div>
                )}
                <div className="los-confirm__actions">
                    <button className="los-button" disabled={isSubmitting} type="button" onClick={onCancel}>
                        {LocalizeText('catalog.purchase_confirmation.cancel')}
                    </button>
                    <button className="los-button los-button--primary" disabled={isSubmitting || !spendingDisclaimerAccepted} type="button" onClick={onConfirm}>
                        {LocalizeText(isGift ? 'catalog.purchase_confirmation.gift' : `catalog.purchase_confirmation.${offer.isRentOffer ? 'rent' : 'buy'}`)}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};
