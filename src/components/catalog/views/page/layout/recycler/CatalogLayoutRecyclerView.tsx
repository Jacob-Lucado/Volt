import {
    FurnitureListComposer,
    GetRecyclerStatusMessageComposer,
    RecycleItemsEntry,
    RecycleItemsMessageComposer,
    RecyclerFinishedMessageEvent,
    RecyclerStatusMessageEvent
} from '@volt/renderer';
import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GetConfigurationValue, GetFurnitureData, LocalizeText, localizeWithFallback, ProductTypeEnum, SendMessageComposer } from '../../../../../../api';
import { NativeText } from '../../../../../../common/native-text/NativeText';
import { useInventoryFurni, useInventoryTrade, useMessageEvent, useNotification, usePurse, useRoom } from '../../../../../../hooks';
import { CatalogAirShinyButton } from '../CatalogAirShinyButton';
import { CatalogLayoutProps } from '../CatalogLayout.types';
import {
    addRecyclerSlot,
    getRecyclerEligibleItemIds,
    getRecyclerInventoryChoices,
    normalizeRecyclerSlotCount,
    RecyclerInventoryChoice,
    reconcileRecyclerSlots
} from './recycler.helpers';
import { createFrankEmotion, FrankEmotion, FrankRecyclerEmotion } from './FrankRecyclerEmotion';
import { useRecyclerEngineAnimator } from './useRecyclerEngineAnimator';
import frankImage from '../../../../../../assets/images/collectibles/image-frank-dont-know.png';
import sadImage from '../../../../../../assets/images/catalog/air/recycler/franks-emotions-sad.png';
import indicatorImage from '../../../../../../assets/images/catalog/air/recycler/furnimatic-indicator.png';
import machineImage from '../../../../../../assets/images/catalog/air/recycler/furnimatic-machine.png';
import pointerArrowImage from '../../../../../../assets/images/catalog/air/recycler/furnimatic-pointer-arrow.png';
import pointerBaseImage from '../../../../../../assets/images/catalog/air/recycler/furnimatic-pointer-base.png';
import titleImage from '../../../../../../assets/images/catalog/air/recycler/furnimatic-title.png';

/** The page colour under the texts: 0xe9e9e1 under the layout's 0x21ffffff fill. */
const PAGE_BACKGROUND = 0xecece5;

/** recyclerWidget slot_bg_1..12: four columns 37px apart, rows at y 0, 44 and 90 of the slots container (37, 359). */
const SLOT_ROWS = [0, 44, 90];
const getSlotPosition = (index: number) => ({ left: 37 + (index % 4) * 37, top: 359 + SLOT_ROWS[Math.floor(index / 4)] });

export const CatalogLayoutRecyclerView: FC<CatalogLayoutProps> = () => {
    const { groupItems = [] } = useInventoryFurni();
    const { roomSession = null } = useRoom();
    const { isTrading = false } = useInventoryTrade();
    const { getCurrencyAmount = null } = usePurse();
    const { simpleAlert = null } = useNotification();
    const [slots, setSlots] = useState<RecyclerInventoryChoice[]>([]);
    const [status, setStatus] = useState<number>(null);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(0);
    const [processing, setProcessing] = useState(false);
    const [abortVisible, setAbortVisible] = useState(false);
    const [emotions, setEmotions] = useState<FrankEmotion[]>([]);
    const emotionIdRef = useRef(0);
    const removeEmotion = useCallback((id: number) => setEmotions((current) => current.filter((emotion) => emotion.id !== id)), []);
    const machineRef = useRef<HTMLImageElement>(null);
    const arrowRef = useRef<HTMLImageElement>(null);
    const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // RecyclerLogic: catalog.getInteger("recycler.number_of_slots", 5).
    const slotCount = normalizeRecyclerSlotCount(GetConfigurationValue<number>('recycler.number_of_slots', 5), 5);
    const selectedIds = useMemo(() => new Set(slots.map((slot) => slot.itemId)), [slots]);
    const eligibleIds = useMemo(() => getRecyclerEligibleItemIds(groupItems), [groupItems]);
    const choices = useMemo(() => getRecyclerInventoryChoices(groupItems, selectedIds), [groupItems, selectedIds]);
    const enabled = status !== null && status !== RecyclerStatusMessageEvent.SYSTEM_STATUS_DISABLED;
    const inPrivateRoom = !!roomSession?.isPrivateRoom;
    // RecyclerLogic.ducketCost: catalog.getInteger("recycler.ducket_cost", 0); a zero cost hides the cost row.
    const ducketCost = Number(GetConfigurationValue<number>('recycler.ducket_cost', 0)) || 0;
    const alert = (key: string) => simpleAlert?.(LocalizeText(key), null, null, null, LocalizeText('generic.alert.title'));

    const scheduleReset = (reset: () => void, delay: number) => {
        if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);

        resetTimeoutRef.current = setTimeout(reset, delay);
    };

    // RecyclerCatalogWidget.onAnimationComplete: send the slots, then wait recycler.timeout_seconds before the next recycle.
    const executeRecycler = () => {
        const validSlots = reconcileRecyclerSlots(slots, eligibleIds);

        setAbortVisible(false);
        scheduleReset(animator.reset, 1000);
        setSecondsLeft(Math.max(0, Number(GetConfigurationValue<number>('recycler.timeout_seconds', 10)) || 0));

        if (processing || !enabled || !inPrivateRoom || validSlots.length !== slotCount) {
            setSlots(validSlots);

            return;
        }

        setProcessing(true);
        SendMessageComposer(new RecycleItemsMessageComposer(...validSlots.map((slot) => new RecycleItemsEntry(slot.itemId))));
    };

    const animator = useRecyclerEngineAnimator(arrowRef, machineRef, executeRecycler);

    useMessageEvent<RecyclerStatusMessageEvent>(RecyclerStatusMessageEvent, (event) => {
        const parser = event.getParser();

        setStatus(parser.recyclerStatus);
        setSecondsLeft(Math.max(0, parser.recyclerTimeoutSeconds));

        // RecyclerLogic.verifyRoomSessionStatus: an open machine outside a private room says where to go.
        if (parser.recyclerStatus !== RecyclerStatusMessageEvent.SYSTEM_STATUS_DISABLED && !inPrivateRoom) alert('recycler.alert.privateroom');
    });

    // RecyclerLogic.setFinished: either result empties the slots; a failure also shows that the machine is closed.
    useMessageEvent<RecyclerFinishedMessageEvent>(RecyclerFinishedMessageEvent, (event) => {
        if (!processing) return;

        setProcessing(false);
        setSlots([]);

        if (event.getParser().recyclerFinishedStatus !== RecyclerFinishedMessageEvent.FINISHED_OK) alert('recycler.info.closed');
    });

    useEffect(() => {
        SendMessageComposer(new FurnitureListComposer());
        SendMessageComposer(new GetRecyclerStatusMessageComposer());

        return () => {
            if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
        };
    }, []);

    useEffect(() => {
        if (secondsLeft <= 0) return;

        const timer = setInterval(() => setSecondsLeft((value) => Math.max(0, value - 1)), 1000);

        return () => clearInterval(timer);
    }, [secondsLeft > 0]);

    useEffect(() => {
        setSlots((current) => reconcileRecyclerSlots(current, eligibleIds));
    }, [eligibleIds]);

    const addChoice = (choice: RecyclerInventoryChoice) => {
        if (processing) return;

        setSlots((current) => addRecyclerSlot(current, choice, slotCount, eligibleIds));
        setPickerOpen(false);
    };

    // RecyclerLogic.isReadyToRecycle: a full pool in a private room, without an open trade.
    const readyToRecycle = !processing && enabled && inPrivateRoom && slots.length === slotCount;
    const canRecycle = readyToRecycle && !animator.busy && secondsLeft <= 0;

    // A wf_act_reset_timers in a slot makes the pointer spin and the machine shake harder.
    const easterEgg = () =>
        slots.some((slot) => {
            const group = groupItems.find((candidate) => candidate.items.some((item) => item.id === slot.itemId));

            return (
                !!group && GetFurnitureData(group.type, group.isWallItem ? ProductTypeEnum.WALL : ProductTypeEnum.FLOOR)?.className === 'wf_act_reset_timers'
            );
        });

    const recycle = () => {
        if (!canRecycle) return;

        if (isTrading) {
            alert('recycler.alert.trading');

            return;
        }

        if ((getCurrencyAmount?.(0) ?? 0) < ducketCost) {
            alert('catalog.alert.notenough.activitypoints.title.0');

            return;
        }

        animator.start(easterEgg());
        setAbortVisible(true);
    };

    const abort = () => {
        setAbortVisible(false);
        animator.stop();
        scheduleReset(animator.reset, 650);
    };

    return (
        <div className="volt-catalog-recycler-air">
            <img ref={machineRef} alt="" className="volt-catalog-recycler-machine" draggable={false} src={machineImage} />
            <img alt="" className="volt-catalog-recycler-title" draggable={false} src={titleImage} />
            {ducketCost > 0 && (
                <div className="volt-catalog-recycler-cost">
                    <NativeText background={PAGE_BACKGROUND} text={ducketCost.toString()} textStyle="u_bold" />
                    <span className="volt-catalog-recycler-cost-icon" />
                </div>
            )}
            <CatalogAirShinyButton
                caption={
                    secondsLeft > 0
                        ? LocalizeText('catalog.recycler.button.wait', ['s'], [secondsLeft.toString()])
                        : LocalizeText('catalog.recycler.button.recycle')
                }
                disabled={!canRecycle}
                rect={[19, 299, 194, 30]}
                tint="green"
                onClick={recycle}
            />
            <div className="volt-catalog-recycler-panel is-slots">
                <span className="is-left" />
                <span className="is-slice" />
                <span className="is-right" />
            </div>
            <div aria-label={LocalizeText('catalog.recycler.button.recycle')} className="volt-catalog-recycler-slots" role="list">
                {Array.from({ length: slotCount }, (_, index) => {
                    const slot = slots[index];

                    return (
                        <button
                            key={index}
                            aria-label={slot?.name ?? `${index + 1}`}
                            className="volt-catalog-recycler-slot"
                            disabled={processing}
                            role="listitem"
                            style={getSlotPosition(index)}
                            title={slot?.name}
                            type="button"
                            onClick={() =>
                                slot ? setSlots((current) => current.filter((_, slotIndex) => slotIndex !== index)) : setPickerOpen((open) => !open)
                            }
                        >
                            {slot?.iconUrl && <img alt="" draggable={false} src={slot.iconUrl} />}
                        </button>
                    );
                })}
            </div>
            <div className="volt-catalog-recycler-panel is-indicator">
                <span className="is-left" />
                <span className="is-slice" />
                <span className="is-right" />
            </div>
            <img alt="" className="volt-catalog-recycler-indicator" draggable={false} src={indicatorImage} />
            <div className="volt-catalog-recycler-pointer">
                <img ref={arrowRef} alt="" className="is-arrow" draggable={false} src={pointerArrowImage} />
                <img alt="" className="is-base" draggable={false} src={pointerBaseImage} />
            </div>
            {abortVisible && (
                <button className="volt-catalog-recycler-abort" type="button" onClick={abort}>
                    <NativeText
                        background={PAGE_BACKGROUND}
                        overrides={{ size: 10, underline: true }}
                        text={LocalizeText('catalog.recycler.button.abort')}
                        textStyle="u_regular"
                        transparent
                    />
                </button>
            )}
            {/* Volt keeps its inventory list instead of AIR's drag from the room or inventory: an empty slot opens it. */}
            {pickerOpen && !processing && (
                <div className="volt-catalog-recycler-picker">
                    {choices.length ? (
                        choices.map((choice) => (
                            <button
                                key={choice.itemId}
                                disabled={slots.length >= slotCount}
                                title={choice.name}
                                type="button"
                                onClick={() => addChoice(choice)}
                            >
                                {choice.iconUrl && <img alt="" draggable={false} src={choice.iconUrl} />}
                            </button>
                        ))
                    ) : (
                        <NativeText
                            background={0xffffff}
                            className="volt-catalog-recycler-picker-empty"
                            maxWidth={300}
                            text={LocalizeText('inventory.furni.preview.not_recyclable')}
                            textStyle="u_regular"
                        />
                    )}
                </div>
            )}
            {status !== null && !enabled && (
                <div className="volt-catalog-recycler-disabled">
                    <img alt="" className="volt-catalog-recycler-frank" draggable={false} src={frankImage} />
                    <div className="volt-catalog-recycler-bubble">
                        <NativeText
                            background={0xe9e9e1}
                            maxWidth={107}
                            text={localizeWithFallback('recycler.broken', LocalizeText('recycler.info.closed'))}
                            textStyle="u_regular"
                        />
                        <img alt="" className="volt-catalog-recycler-bubble-emoji" draggable={false} src={sadImage} />
                    </div>
                    <CatalogAirShinyButton
                        caption={LocalizeText('recycler.pat_frank')}
                        rect={[235, 11, 115, 30]}
                        onClick={() => setEmotions((current) => [...current, createFrankEmotion(++emotionIdRef.current)])}
                    />
                    {emotions.map((emotion) => (
                        <FrankRecyclerEmotion key={emotion.id} emotion={emotion} onDone={removeEmotion} />
                    ))}
                </div>
            )}
        </div>
    );
};
