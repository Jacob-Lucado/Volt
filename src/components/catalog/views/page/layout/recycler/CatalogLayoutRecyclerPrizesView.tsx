import { GetRecyclerPrizesMessageComposer, GetSessionDataManager, RecyclerPrizeLevel, RecyclerPrizeProduct, RecyclerPrizesMessageEvent } from '@volt/renderer';
import { FC, PropsWithChildren, SyntheticEvent, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
    GetChatStyleHalfPreviewUrl,
    GetChatStylePreviewUrl,
    GetFurnitureData,
    GetImageIconUrlForProduct,
    LocalizeText,
    ProductTypeEnum,
    SendMessageComposer
} from '../../../../../../api';
import { LayoutFurniImageView } from '../../../../../../common';
import { NativeText } from '../../../../../../common/native-text/NativeText';
import { useMessageEvent } from '../../../../../../hooks';
import { AIR_CHAT_BUBBLE_STYLES } from '../../../../../room/widgets/chat/airChatStyles';
import { CatalogLayoutProps } from '../CatalogLayout.types';
import bronzeStar from '../../../../../../assets/images/catalog/air/recycler/star-small-bronze.png';
import diamondStar from '../../../../../../assets/images/catalog/air/recycler/star-small-diamond.png';
import goldStar from '../../../../../../assets/images/catalog/air/recycler/star-small-gold.png';
import greenStar from '../../../../../../assets/images/catalog/air/recycler/star-small-green.png';
import greyStar from '../../../../../../assets/images/catalog/air/recycler/star-small-grey.png';
import pinkStar from '../../../../../../assets/images/catalog/air/recycler/star-small-pink.png';
import rubyStar from '../../../../../../assets/images/catalog/air/recycler/star-small-ruby.png';
import silverStar from '../../../../../../assets/images/catalog/air/recycler/star-small-silver.png';

const AIR_STYLE_IMAGES = Object.fromEntries(
    Object.entries(import.meta.glob('../../../../../../assets/images/chat/air-styles/*.png', { eager: true, import: 'default' }) as Record<string, string>).map(
        ([path, url]) => [path.slice(path.lastIndexOf('/') + 1), url]
    )
) as Record<string, string>;

/** RecyclerPrizesCatalogWidget.STAR_LEVELS: star_small_<level> for prize levels 1 to 8. */
const STARS = [bronzeStar, silverStar, goldStar, diamondStar, rubyStar, pinkStar, greenStar, greyStar];

/** The page colour behind the product texts; the level header sits on the white border style 0. */
const PAGE_BACKGROUND = 0xeef2f7;
const LEVEL_BACKGROUND = 0xffffff;

const compareProductCodes = (first: RecyclerPrizeProduct, second: RecyclerPrizeProduct) => {
    const left = first.name.toLowerCase();
    const right = second.name.toLowerCase();

    return left < right ? -1 : left > right ? 1 : 0;
};

const isChatStyle = (product: RecyclerPrizeProduct) => product.productType === ProductTypeEnum.CHAT_STYLE;

// PrizeContainer.title (as:58-71): a chat style takes its name from the product data of chat_bubble_<style id>.
const getPrizeName = (product: RecyclerPrizeProduct) =>
    isChatStyle(product)
        ? (GetSessionDataManager().getProductData(`chat_bubble_${product.productClassId}`)?.name ?? '')
        : GetFurnitureData(product.productClassId, product.productType)?.name || product.name;

// PrizeGridItem.initProductIcon (as:33-37): a chat style tile shows its selector preview at half size.
const useChatStyleTileIcon = (product: RecyclerPrizeProduct) => {
    const [icon, setIcon] = useState<string>(undefined);

    useEffect(() => {
        let current = true;

        if (isChatStyle(product)) GetChatStyleHalfPreviewUrl(product.productClassId).then((url) => current && setIcon(url ?? undefined));

        return () => {
            current = false;
        };
    }, [product]);

    return icon;
};

// The gridItem image bitmap is centred with odd remainders rounded down.
const centreIcon = (event: SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget;

    image.style.left = `${Math.floor((36 - image.naturalWidth) / 2)}px`;
    image.style.top = `${Math.floor((36 - image.naturalHeight) / 2)}px`;
};

const RecyclerPrizeTile: FC<{ product: RecyclerPrizeProduct; active: boolean; onSelect: () => void }> = ({ product, active, onSelect }) => {
    const chatStyleIcon = useChatStyleTileIcon(product);
    const icon = isChatStyle(product) ? chatStyleIcon : GetImageIconUrlForProduct(product.productType, product.productClassId);

    return (
        // gridItem: a 36x36 region; its ITEM_HILIGHT frame shows only on the selected prize.
        <button className={`volt-catalog-recycler-prize-tile${active ? ' is-active' : ''}`} title={getPrizeName(product)} type="button" onClick={onSelect}>
            {!!icon && <img alt="" className="volt-catalog-recycler-prize-icon" draggable={false} src={icon} onLoad={centreIcon} />}
        </button>
    );
};

/**
 * HabboFreeFlowChat.createPreviewBitmap: an empty bubble of the style with no face. PooledChatBubble puts the pointer at
 * max(28, min(width - 15, x)) and the preview has no speaker, so it sits 15px from the right edge.
 */
/** productView (360x240): the preview bitmap is centred with odd remainders rounded down. */
const PREVIEW_WIDTH = 360;
const PREVIEW_HEIGHT = 240;

const RecyclerPreviewCentre: FC<PropsWithChildren> = ({ children }) => {
    const ref = useRef<HTMLSpanElement>(null);

    useLayoutEffect(() => {
        const element = ref.current;

        if (!element) return;

        const place = () => {
            element.style.left = `${Math.floor((PREVIEW_WIDTH - element.offsetWidth) / 2)}px`;
            element.style.top = `${Math.floor((PREVIEW_HEIGHT - element.offsetHeight) / 2)}px`;
        };
        const observer = new ResizeObserver(place);

        place();
        observer.observe(element);

        return () => observer.disconnect();
    }, []);

    return (
        <span ref={ref} className="volt-catalog-recycler-prizes-centre">
            {children}
        </span>
    );
};

const RecyclerChatBubblePreview: FC<{ styleId: number }> = ({ styleId }) => {
    const style = AIR_CHAT_BUBBLE_STYLES[styleId];

    if (!style?.pointer) return <img alt="" draggable={false} src={GetChatStylePreviewUrl(styleId) ?? undefined} />;

    const [width, height] = style.size;
    const [leftMargin, rightMargin] = style.pointer.margins ?? [28, 15];
    const pointerX = Math.max(leftMargin, width - rightMargin);
    const fullHeight = Math.max(height, style.pointer.y + style.pointer.size[1]);

    return (
        <span className="volt-catalog-recycler-prizes-bubble" style={{ width, height: fullHeight }}>
            <img alt="" draggable={false} src={AIR_STYLE_IMAGES[style.base]} />
            <img alt="" draggable={false} src={AIR_STYLE_IMAGES[style.pointer.image]} style={{ left: pointerX, top: style.pointer.y }} />
        </span>
    );
};

/**
 * AIR layout_recycler_prizes (1685, 659px shrunk to 460): productView (0, 0, 360x240) shows the selected prize, and itemList
 * (0, 237, 360x223) holds one recyclerPrizesWidgetLevelItem per level, 11px apart.
 */
export const CatalogLayoutRecyclerPrizesView: FC<CatalogLayoutProps> = ({ page }) => {
    const [levels, setLevels] = useState<RecyclerPrizeLevel[] | null>(null);
    const [selected, setSelected] = useState<RecyclerPrizeProduct>(null);

    useMessageEvent<RecyclerPrizesMessageEvent>(RecyclerPrizesMessageEvent, (event) => {
        // PrizeLevelMessageData (as:28): the prizes of a level are sorted by product code, ignoring case. The levels keep the
        // server order (RecyclerPrizesCatalogWidget.populateItemGrid).
        const sorted = event.getParser().levels.map((level) => ({ ...level, products: [...level.products].sort(compareProductCodes) }));

        setLevels(sorted);
        // onPrizesReceived: the first prize of the first level is selected.
        setSelected(sorted[0]?.products[0] ?? null);
    });

    useEffect(() => {
        SendMessageComposer(new GetRecyclerPrizesMessageComposer());
    }, []);

    const specialImage = page?.localization?.getImage(2);

    return (
        <div className="volt-catalog-recycler-prizes-air">
            {/* specialInfoWidget (100, 46, 142x73): ctlg_special_img, bottom centred, under the product view. */}
            {!!specialImage && <img alt="" className="volt-catalog-recycler-prizes-special" draggable={false} src={specialImage} />}
            <div className="volt-catalog-recycler-prizes-product">
                {selected && (
                    <>
                        <div className="volt-catalog-recycler-prizes-preview">
                            <RecyclerPreviewCentre>
                                {isChatStyle(selected) ? (
                                    <RecyclerChatBubblePreview styleId={selected.productClassId} />
                                ) : (
                                    <LayoutFurniImageView direction={2} productClassId={selected.productClassId} productType={selected.productType} scale={1} />
                                )}
                            </RecyclerPreviewCentre>
                        </div>
                        <NativeText
                            background={PAGE_BACKGROUND}
                            className="volt-catalog-recycler-prizes-name"
                            text={getPrizeName(selected)}
                            textStyle="u_bold"
                        />
                    </>
                )}
            </div>
            <div className="volt-catalog-recycler-prizes-list">
                {(levels ?? []).map((level) => (
                    <section key={level.levelId} className="volt-catalog-recycler-prize-level">
                        <div className="volt-catalog-recycler-prize-header">
                            <img alt="" draggable={false} src={STARS[level.levelId - 1] ?? STARS[STARS.length - 1]} />
                            <NativeText background={LEVEL_BACKGROUND} text={LocalizeText(`recycler.prizes.category.${level.levelId}`)} textStyle="u_bold" />
                            {level.levelId > 1 && (
                                <>
                                    <NativeText background={LEVEL_BACKGROUND} text=" -" textStyle="u_regular" />
                                    <NativeText
                                        background={LEVEL_BACKGROUND}
                                        text={LocalizeText('recycler.prizes.odds', ['odds'], [`1:${level.chance}`])}
                                        textStyle="u_italic"
                                    />
                                </>
                            )}
                        </div>
                        <div className="volt-catalog-recycler-prize-grid">
                            {level.products.map((product, index) => (
                                <RecyclerPrizeTile
                                    key={`${product.productType}-${product.productClassId}-${index}`}
                                    active={selected === product}
                                    product={product}
                                    onSelect={() => setSelected(product)}
                                />
                            ))}
                        </div>
                    </section>
                ))}
            </div>
        </div>
    );
};
