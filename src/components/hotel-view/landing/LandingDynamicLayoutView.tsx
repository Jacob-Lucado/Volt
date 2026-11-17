import { CurrentTimingCodeMessageEvent, GetCurrentTimingCodeMessageComposer } from '@volt/renderer';
import { CSSProperties, FC, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { getLandingPaneWidth, getLandingProperty, getLandingSlots, getLandingSpacing, LANDING_GRID_LEFT, LANDING_GRID_TOP, LANDING_MAX_SPACING, LANDING_SLOT_1_HEIGHT, LandingSlot, SendMessageComposer } from '../../../api';
import { useMessageEvent } from '../../../hooks';
import { GenericLandingWidgetView } from './GenericLandingWidgetView';

/** WidgetContainerWidget: asks the server which code of landing.view.dynamic.slot.<slot>.conf is current and shows that widget. */
const WidgetContainerSlotView: FC<{ slot: number }> = ({ slot }) =>
{
    const [ schedulingStr ] = useState(() => getLandingProperty(`landing.view.dynamic.slot.${ slot }.conf`));
    const [ code, setCode ] = useState('');

    useEffect(() =>
    {
        SendMessageComposer(new GetCurrentTimingCodeMessageComposer(schedulingStr));
    }, [ schedulingStr ]);

    useMessageEvent<CurrentTimingCodeMessageEvent>(CurrentTimingCodeMessageEvent, event =>
    {
        const parser = event.getParser();

        if(parser.schedulingStr === schedulingStr) setCode(parser.code);
    });

    if(!code) return null;

    const widget = getLandingProperty(`landing.view.${ code }.widget`);

    return (widget === 'generic') ? <GenericLandingWidgetView key={code} code={code} slot={slot} /> : null;
};

const LandingSlotView: FC<{ slot: LandingSlot }> = ({ slot }) =>
{
    switch(slot.widget)
    {
        case 'widgetcontainer': return <WidgetContainerSlotView slot={slot.slot} />;
        case 'generic': return <GenericLandingWidgetView code={null} slot={slot.slot} />;
        default: return null;
    }
};

const useDesktopSize = () =>
{
    const [ size, setSize ] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));

    useEffect(() =>
    {
        const onResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });

        window.addEventListener('resize', onResize);

        return () => window.removeEventListener('resize', onResize);
    }, []);

    return size;
};

/**
 * DynamicLayoutManager over dynamic_widget_grid_xml: slot 1 on top (75 px while it holds a widget, else 0), then the left pane
 * (slots 2 and 4) and the right pane (slots 3 and 5). The slots of a row share the taller height, an empty slot is 1 px high,
 * and the spacings shrink when the desktop is too small.
 */
export const LandingDynamicLayoutView: FC = () =>
{
    const [ slots ] = useState(getLandingSlots);
    const desktop = useDesktopSize();
    const panesRef = useRef<HTMLDivElement>(null);
    const [ panesHeight, setPanesHeight ] = useState(0);
    const bySlot = (number: number) => slots.find(slot => slot.slot === number);
    const topHeight = bySlot(1) ? LANDING_SLOT_1_HEIGHT : 0;

    useLayoutEffect(() =>
    {
        const element = panesRef.current;

        if(!element) return;

        const observer = new ResizeObserver(() =>
        {
            const rows = Array.from(element.children).map(child => (child as HTMLElement).offsetHeight);

            setPanesHeight(Math.max(rows[0] ?? 1, rows[1] ?? 1) + Math.max(rows[2] ?? 1, rows[3] ?? 1));
        });

        observer.observe(element);
        Array.from(element.children).forEach(child => observer.observe(child));

        return () => observer.disconnect();
    }, []);

    const contentHeight = topHeight + LANDING_MAX_SPACING.top + panesHeight + LANDING_MAX_SPACING.pane;
    const spacing = getLandingSpacing(desktop.width, desktop.height, contentHeight);
    const leftWidth = getLandingPaneWidth(true);
    const rightWidth = getLandingPaneWidth(false);
    const style = {
        left: LANDING_GRID_LEFT,
        top: LANDING_GRID_TOP,
        '--landing-top-height': `${ topHeight }px`,
        '--landing-top-spacing': `${ spacing.top }px`,
        '--landing-pane-spacing': `${ spacing.pane }px`,
        '--landing-center-spacing': `${ spacing.center }px`,
        '--landing-left-width': `${ leftWidth }px`,
        '--landing-right-width': `${ rightWidth }px`
    } as CSSProperties;

    if(!slots.length) return null;

    return (
        <div className="landing-dynamic-grid" style={style}>
            <div className="landing-dynamic-grid__top">{bySlot(1) && <LandingSlotView slot={bySlot(1)} />}</div>
            <div ref={panesRef} className="landing-dynamic-grid__panes">
                {[ 2, 3, 4, 5 ].map(number => (
                    <div key={number} className="landing-dynamic-grid__slot">
                        {bySlot(number) && <LandingSlotView slot={bySlot(number)} />}
                    </div>
                ))}
            </div>
        </div>
    );
};
