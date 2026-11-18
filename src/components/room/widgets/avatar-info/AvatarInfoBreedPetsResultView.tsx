import { CreateLinkEvent, GetRoomEngine, GetSessionDataManager, IPetBreedingResultData, RoomObjectCategory, RoomObjectOperationType } from '@volt/renderer';
import { FC, useLayoutEffect, useReducer, useRef, useState } from 'react';
import { attemptItemPlacement, LocalizeText, RoomWidgetUpdateRoomObjectEvent } from '../../../../api';
import { LayoutFurniImageView, VoltCardHeaderView, VoltCardView } from '../../../../common';
import { NativeText } from '../../../../common/native-text/NativeText';
import { BreedingResult, useInventoryFurni, useRoom, useUiEvent } from '../../../../hooks';
import {
    BREEDING_SURFACE,
    BreedingBodyText,
    BreedingButton,
    BreedingCenteredName,
    BreedingCenteredText,
    BreedingFrameTitle,
    BreedingPreview
} from './AvatarInfoBreedingParts';

/** breed_pets_result_xml is 275x300; the window is centred at that size, then fits its 274 wide element_list (280 wide frame). */
const LAYOUT_WIDTH = 275;
const LAYOUT_HEIGHT = 300;
const FRAME_WIDTH = 280;
const CONTENT_TOP = 36;

interface AvatarInfoBreedPetsResultViewProps {
    result: BreedingResult;
    onClose: () => void;
}

interface SeedViewProps {
    seed: IPetBreedingResultData;
    index: 1 | 2;
    /** setWindowContent resolves both previews from the first seed's class. */
    previewClassId: number;
    onPreviewClick: () => void;
}

const SeedView: FC<SeedViewProps> = ({ seed, index, previewClassId, onPreviewClick }) => {
    const furniData = GetSessionDataManager().getFloorItemData(seed.classId);

    return (
        <div className="volt-breed-pets-column">
            <BreedingCenteredName text={LocalizeText(`breedpetsresult.widget.seed${index}.name`, ['name'], [furniData?.name ?? ''])} />
            <BreedingPreview className="is-clickable" onClick={onPreviewClick}>
                <LayoutFurniImageView direction={2} productClassId={previewClassId} productType="s" />
            </BreedingPreview>
            <BreedingCenteredText
                text={LocalizeText(`breedpetsresult.widget.seed${index}.raritylevel`, ['level'], [seed.rarityLevel.toString()])}
                width={134}
            />
            <BreedingCenteredText text={LocalizeText(`breedpetsresult.widget.seed${index}.description`, ['name'], [seed.userName])} width={122} />
            {seed.hasMutation && (
                <NativeText
                    nativeResolution
                    transparent
                    truncateHeight
                    align="center"
                    background={BREEDING_SURFACE}
                    maxWidth={122}
                    overrides={{ size: 13 }}
                    text={LocalizeText('breedpetsresult.widget.info.mutation')}
                    textStyle="u_italic"
                    width={122}
                />
            )}
        </div>
    );
};

// BreedPetsResultView (breed_pets_result_xml). The owner of a seed gets "Place in room" while the seed is not in the room and "Pick up" while it is;
// a user without a seed gets the "sorry" texts and a close button. Lists with on_resize_align_center keep their centre when they shrink or grow.
export const AvatarInfoBreedPetsResultView: FC<AvatarInfoBreedPetsResultViewProps> = ({ result, onClose }) => {
    const { roomSession = null } = useRoom();
    const { groupItems = [] } = useInventoryFurni();
    const [, refresh] = useReducer((value: number) => value + 1, 0);
    const listRef = useRef<HTMLDivElement>(null);
    const [listHeight, setListHeight] = useState(LAYOUT_HEIGHT - CONTENT_TOP);

    useUiEvent<RoomWidgetUpdateRoomObjectEvent>([RoomWidgetUpdateRoomObjectEvent.FURNI_ADDED, RoomWidgetUpdateRoomObjectEvent.FURNI_REMOVED], (event) => {
        if (event.id === result.first.stuffId || event.id === result.second.stuffId) refresh();
    });

    useLayoutEffect(() => {
        const list = listRef.current;

        if (!list) return;

        const measure = () => setListHeight(list.offsetHeight);
        const observer = new ResizeObserver(measure);

        measure();
        observer.observe(list);

        return () => observer.disconnect();
    }, [result]);

    const { first, second } = result;
    const userId = GetSessionDataManager().userId;
    const isMine = [first.userId === userId, second.userId === userId];
    const anyMine = isMine[0] || isMine[1];
    const sorryName = first.userName ? first.userName : second.userName;
    const showSecondSeed = second.stuffId !== -1;

    const findRoomObject = (stuffId: number) => (roomSession ? GetRoomEngine().getRoomObject(roomSession.roomId, stuffId, RoomObjectCategory.FLOOR) : null);
    const findInventoryGroup = (stuffId: number) => groupItems.find((group) => group.items.some((item) => item.ref === stuffId && !item.isWallItem)) ?? null;

    const placeSeed = (seed: IPetBreedingResultData) => {
        if (attemptItemPlacement(findInventoryGroup(seed.stuffId), true)) onClose();
    };

    const pickSeed = (seed: IPetBreedingResultData) => {
        if (findRoomObject(seed.stuffId))
            GetRoomEngine().processRoomObjectOperation(seed.stuffId, RoomObjectCategory.FLOOR, RoomObjectOperationType.OBJECT_PICKUP);
    };

    const selectSeed = (seed: IPetBreedingResultData) => {
        if (findInventoryGroup(seed.stuffId)) {
            CreateLinkEvent('inventory/toggle/furni');
            return;
        }

        if (findRoomObject(seed.stuffId)) GetRoomEngine().selectRoomObject(roomSession.roomId, seed.stuffId, RoomObjectCategory.FLOOR);
    };

    // seedN_buttonlist: a 122 wide list holding the 120 wide place or pick button.
    const seedButtons = (seed: IPetBreedingResultData) => (
        <div className="volt-breed-pets-seed-buttons">
            {findRoomObject(seed.stuffId) ? (
                <BreedingButton caption={LocalizeText('breedpetsresult.widget.seed2.pick')} variant="shiny" width={120} onClick={() => pickSeed(seed)} />
            ) : (
                <BreedingButton caption={LocalizeText('breedpetsresult.widget.seed2.use')} variant="thick" width={120} onClick={() => placeSeed(seed)} />
            )}
        </div>
    );

    const previewListWidth = showSecondSeed ? 254 : 122;
    const buttonListWidth = isMine[0] && isMine[1] ? 254 : 122;
    const frameHeight = CONTENT_TOP + listHeight;

    return (
        <VoltCardView
            classNames={['volt-breed-pets', 'volt-breed-pets-result']}
            frameStyle={3}
            isResizable={false}
            offsetLeft={(FRAME_WIDTH - LAYOUT_WIDTH) / 2}
            offsetTop={(frameHeight - LAYOUT_HEIGHT) / 2}
            uniqueKey="volt-breed-pets-result"
        >
            <VoltCardHeaderView headerText="" onCloseClick={onClose}>
                <BreedingFrameTitle text={LocalizeText('breedpetsresult.widget.title')} />
            </VoltCardHeaderView>
            <div ref={listRef} className="volt-breed-pets-list">
                <div className="volt-breed-pets-separator" />
                {anyMine && <BreedingBodyText text={LocalizeText('breedpetsresult.widget.text')} x={11} />}
                {!anyMine && <BreedingBodyText text={LocalizeText('breedpetsresult.widget.text.sorry', ['name'], [sorryName])} x={9} />}
                {!anyMine && <BreedingBodyText italic text={LocalizeText('breedpetsresult.widget.info.sorry')} />}
                <div className="volt-breed-pets-preview-list" style={{ marginLeft: 10 + Math.trunc((254 - previewListWidth) / 2) }}>
                    <SeedView index={1} previewClassId={first.classId} seed={first} onPreviewClick={() => selectSeed(first)} />
                    {showSecondSeed && <SeedView index={2} previewClassId={first.classId} seed={second} onPreviewClick={() => selectSeed(second)} />}
                </div>
                <div className="volt-breed-pets-separator" />
                {anyMine && (
                    <div className="volt-breed-pets-button-list" style={{ marginLeft: 77 + Math.trunc((120 - buttonListWidth) / 2) }}>
                        {isMine[0] && seedButtons(first)}
                        {isMine[1] && seedButtons(second)}
                    </div>
                )}
                {!anyMine && (
                    <div className="volt-breed-pets-button-list" style={{ marginLeft: 76 }}>
                        <BreedingButton caption={LocalizeText('breedpetsresult.widget.close')} variant="shiny" onClick={onClose} />
                    </div>
                )}
                <div className="volt-breed-pets-separator" />
            </div>
        </VoltCardView>
    );
};
