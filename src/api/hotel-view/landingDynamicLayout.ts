import { GetConfiguration } from '@volt/renderer';

// The landing view's dynamic widget grid as AIR builds it (HabboLandingView, DynamicLayoutManager, dynamic_widget_grid_xml).
// Slot 1 is the row on top, slots 2 and 4 the wide left pane, slots 3 and 5 the narrow right pane.
export const LANDING_SLOT_COUNT = 5;
export const LANDING_GRID_LEFT = 256;
export const LANDING_GRID_TOP = 4;
export const LANDING_SLOT_1_HEIGHT = 75;
export const LANDING_CONTENT_START_X = 230;

const LIST_INITIAL_WIDTH = 925;
const LIST_INITIAL_HEIGHT = 767;
const LAYOUT_WIDTH = 1172;
const LAYOUT_HEIGHT = 822;
const LIST_MIN_HEIGHT = 360;
const TOP_SPACING_MIN = 10;
const TOP_SPACING_MAX = 80;
const PANE_SPACING_MIN = 10;
const PANE_SPACING_MAX = 50;
const CENTER_SPACING_MIN = 10;
const CENTER_SPACING_MAX = 60;

export interface LandingSlot {
    slot: number;
    widget: string;
}

export interface LandingSpacing {
    top: number;
    pane: number;
    center: number;
}

export const getLandingProperty = (key: string): string =>
{
    const configuration = GetConfiguration();
    const value = configuration.getValue<string | number | boolean>(key, null);

    if(value === null || value === undefined) return '';

    return configuration.interpolate(String(value));
};

export const getLandingPaneWidth = (wide: boolean): number =>
{
    const key = wide ? 'landing.view.dynamic.leftPaneWidth' : 'landing.view.dynamic.rightPaneWidth';
    const value = parseInt(getLandingProperty(key));

    return Number.isFinite(value) ? value : (wide ? 500 : 250);
};

// GenericWidget.isWideSlot
export const isWideLandingSlot = (slot: number): boolean => (slot !== 3) && (slot !== 5);

export const getLandingSlots = (): LandingSlot[] =>
{
    const slots: LandingSlot[] = [];

    for(let slot = 1; slot <= LANDING_SLOT_COUNT; slot++)
    {
        const widget = getLandingProperty(`landing.view.dynamic.slot.${ slot }.widget`);

        if(widget && (getLandingProperty(`landing.view.dynamic.slot.${ slot }.ignore`) !== 'true')) slots.push({ slot, widget });
    }

    return slots;
};

/** GenericWidget.getConf: a scheduled widget reads landing.view.<code>.<part>, a fixed one landing.view.dynamic.slot.<slot>.<part>. */
export const getLandingWidgetConf = (slot: number, code: string, part: string): string =>
    getLandingProperty(code ? `landing.view.${ code }.${ part }` : `landing.view.dynamic.slot.${ slot }.${ part }`);

/** "key,value;key,value" as GenericWidget splits it. */
export const parseLandingPairs = (value: string): string[][] =>
    (value || '').split(';').filter(part => part.length).map(part => part.split(','));

/**
 * DynamicLayoutManager.resizeTo / setVerticalSpacing / setHorizontalSpacing for a desktop size. contentHeight is the top list's
 * height at the maximum spacings (slot 1, 80 px, the centre panes with 50 px between their slots).
 */
export const getLandingSpacing = (desktopWidth: number, desktopHeight: number, contentHeight: number): LandingSpacing =>
{
    const listHeight = Math.max(LIST_MIN_HEIGHT, Math.min(LIST_INITIAL_HEIGHT, LIST_INITIAL_HEIGHT - (LAYOUT_HEIGHT - desktopHeight)));
    const listWidth = Math.min(LIST_INITIAL_WIDTH, LIST_INITIAL_WIDTH - (LAYOUT_WIDTH - desktopWidth));
    const overflow = (contentHeight - listHeight) + TOP_SPACING_MIN + TOP_SPACING_MIN;
    const paneRange = PANE_SPACING_MAX - PANE_SPACING_MIN;
    const pane = (overflow <= 0) ? PANE_SPACING_MAX : (overflow < paneRange) ? (PANE_SPACING_MAX - overflow) : PANE_SPACING_MIN;
    const widthLoss = LIST_INITIAL_WIDTH - listWidth;
    const center = (widthLoss > (CENTER_SPACING_MAX - CENTER_SPACING_MIN)) ? CENTER_SPACING_MIN : Math.min(CENTER_SPACING_MAX, CENTER_SPACING_MAX - widthLoss);

    return { top: TOP_SPACING_MIN, pane, center };
};

export const LANDING_MAX_SPACING: LandingSpacing = { top: TOP_SPACING_MAX, pane: PANE_SPACING_MAX, center: CENTER_SPACING_MAX };
