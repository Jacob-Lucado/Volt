import { RoomObjectCategory, RoomObjectType } from '@volt/renderer';
import { FC } from 'react';
import { LocalizeText, UseProductItem } from '../../../../api';
import { ContextMenuHeaderView } from '../context-menu/ContextMenuHeaderView';
import { ContextMenuListItemView } from '../context-menu/ContextMenuListItemView';
import { ContextMenuView } from '../context-menu/ContextMenuView';

interface AvatarInfoBreedPetViewProps {
    item: UseProductItem;
    onBreed: (item: UseProductItem) => void;
    onClose: () => void;
}

// BreedPetView (breed_pet_menu): the use product bubble with a single "breed" button over a plant that can breed with the chosen one.
export const AvatarInfoBreedPetView: FC<AvatarInfoBreedPetViewProps> = ({ item, onBreed, onClose }) => (
    <ContextMenuView
        category={RoomObjectCategory.UNIT}
        classNames={['volt-avatar-action-menu', 'volt-avatar-action-menu--own', 'volt-avatar-action-menu--breed-pet']}
        collapsable={true}
        freezePositionOnHover={true}
        objectId={item.id}
        showCaretIcon={false}
        userType={RoomObjectType.PET}
        onClose={onClose}
    >
        <ContextMenuHeaderView>{item.name}</ContextMenuHeaderView>
        <div className="air-avatar-menu-buttons">
            <ContextMenuListItemView onClick={() => onBreed(item)}>{LocalizeText('infostand.button.breed')}</ContextMenuListItemView>
        </div>
    </ContextMenuView>
);
