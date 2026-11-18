import { IRoomUserData, PetFigureData } from '@volt/renderer';
import { FC, useLayoutEffect, useRef, useState } from 'react';
import { LocalizeText } from '../../../../api';
import { LayoutPetImageView, VoltCardHeaderView, VoltCardView } from '../../../../common';
import { BreedingConfirmation, useRoom } from '../../../../hooks';
import { BreedingBodyText, BreedingButton, BreedingCenteredName, BreedingCenteredText, BreedingFrameTitle, BreedingPreview } from './AvatarInfoBreedingParts';

/** breed_pets_confirmation_xml is 387 high; the window is centred at that size and its content then grows or shrinks it downwards. */
const LAYOUT_HEIGHT = 387;
const CONTENT_TOP = 36;

interface AvatarInfoBreedMonsterPlantsConfirmViewProps {
    confirmation: BreedingConfirmation;
    onCancel: () => void;
    onBreed: () => void;
    onAccept: () => void;
}

const PlantView: FC<{ plant: IRoomUserData; index: 1 | 2 }> = ({ plant, index }) => {
    const figure = new PetFigureData(plant.figure);

    return (
        <div className="volt-breed-pets-column">
            <BreedingCenteredName text={LocalizeText(`breedpets.widget.plant${index}.name`, ['name'], [plant.name])} x={1} />
            <BreedingPreview>
                <LayoutPetImageView
                    customParts={figure.customParts}
                    direction={2}
                    paletteId={figure.paletteId}
                    petColor={figure.color}
                    posture="std"
                    typeId={figure.typeId}
                />
            </BreedingPreview>
            <BreedingCenteredText text={LocalizeText(`breedpets.widget.plant${index}.raritylevel`, ['level'], [plant.rarityLevel.toString()])} width={134} />
            <BreedingCenteredText text={LocalizeText(`breedpets.widget.plant${index}.description`, ['name'], [plant.ownerName])} width={122} />
        </div>
    );
};

// BreedMonsterPlantsConfirmationView (breed_pets_confirmation_xml): a 274 wide frame_3 window. element_list is a vertical item list with
// 10px spacing that skips hidden items; the plain view shows the description and Breed, the request view the request text and Accept.
export const AvatarInfoBreedMonsterPlantsConfirmView: FC<AvatarInfoBreedMonsterPlantsConfirmViewProps> = ({ confirmation, onCancel, onBreed, onAccept }) => {
    const { roomSession = null } = useRoom();
    const listRef = useRef<HTMLDivElement>(null);
    const [listHeight, setListHeight] = useState(LAYOUT_HEIGHT - CONTENT_TOP);

    useLayoutEffect(() => {
        const list = listRef.current;

        if (!list) return;

        const measure = () => setListHeight(list.offsetHeight);
        const observer = new ResizeObserver(measure);

        measure();
        observer.observe(list);

        return () => observer.disconnect();
    }, [confirmation]);

    const plant = roomSession?.userDataManager.getUserDataByIndex(confirmation.requestRoomIndex);
    const otherPlant = roomSession?.userDataManager.getUserDataByIndex(confirmation.targetRoomIndex);

    if (!plant || !otherPlant) return null;

    const frameHeight = CONTENT_TOP + listHeight;

    return (
        <VoltCardView
            classNames={['volt-breed-pets', 'volt-breed-pets-confirm']}
            frameStyle={3}
            isResizable={false}
            offsetTop={(frameHeight - LAYOUT_HEIGHT) / 2}
            uniqueKey="volt-breed-monster-plants-confirm"
        >
            <VoltCardHeaderView headerText="" onCloseClick={onCancel}>
                <BreedingFrameTitle text={LocalizeText('breedpets.widget.title', ['name'], [plant.name])} />
            </VoltCardHeaderView>
            <div ref={listRef} className="volt-breed-pets-list">
                <div className="volt-breed-pets-separator" />
                {!confirmation.isRequest && <BreedingBodyText text={LocalizeText('breedpets.widget.text')} />}
                {confirmation.isRequest && <BreedingBodyText text={LocalizeText('breedpets.widget.request', ['name'], [otherPlant.ownerName])} />}
                <BreedingBodyText italic text={LocalizeText('breedpets.widget.info')} />
                <div className="volt-breed-pets-preview-list">
                    <PlantView index={1} plant={plant} />
                    <PlantView index={2} plant={otherPlant} />
                </div>
                <div className="volt-breed-pets-separator" />
                <div className="volt-breed-pets-button-list">
                    <BreedingButton caption={LocalizeText('breedpets.widget.cancel')} variant="shiny" onClick={onCancel} />
                    {!confirmation.isRequest && <BreedingButton caption={LocalizeText('breedpets.widget.use')} variant="thick" onClick={onBreed} />}
                    {confirmation.isRequest && <BreedingButton caption={LocalizeText('breedpets.widget.accept')} variant="thick" onClick={onAccept} />}
                </div>
                <div className="volt-breed-pets-separator" />
            </div>
        </VoltCardView>
    );
};
