import { IRoomSession } from '@volt/renderer';
import { FC, ReactNode, useEffect, useMemo, useState } from 'react';
import { attemptBotPlacement, attemptPetPlacement, IBotItem, IPetItem, LocalizeText, localizeWithFallback, UnseenItemCategory } from '../../../api';
import { LosIcon } from '../../../common/lucadoos';
import { useInventoryBots, useInventoryPets, useInventoryUnseenTracker } from '../../../hooks';
import { InventoryBotImageView } from '../views/bot/InventoryBotImageView';
import { InventoryPetImageView } from '../views/pet/InventoryPetImageView';
import { LosInventoryEmpty } from './LosInventoryEmpty';

const CompanionTile: FC<{ isActive: boolean; isUnseen: boolean; title: string; children: ReactNode; onSelect: () => void; onPlace: () => void }> = (props) => {
    const { isActive, isUnseen, title, children, onSelect, onPlace } = props;
    const [isMouseDown, setMouseDown] = useState(false);

    return (
        <button
            type="button"
            title={title}
            className={`los-inv__tile los-inv__tile--tall${isActive ? ' is-selected' : ''}${isUnseen ? ' is-unseen' : ''}`}
            onMouseDown={() => {
                onSelect();
                setMouseDown(true);
            }}
            onMouseUp={() => setMouseDown(false)}
            onMouseLeave={() => {
                if (isMouseDown && isActive) onPlace();

                setMouseDown(false);
            }}
            onDoubleClick={onPlace}
        >
            {children}
        </button>
    );
};

const CompanionSide: FC<{ name?: string; text?: string; placeLabel: string; canPlace: boolean; image: ReactNode; onPlace: () => void }> = (props) => (
    <div className="los-inv__side">
        <div className="los-inv__stage los-inv__stage--figure">{props.image}</div>
        <strong className="los-inv__name">{props.name}</strong>
        {props.text && <p className="los-inv__desc los-scroll">{props.text}</p>}
        <div className="los-inv__actions">
            <button type="button" className="los-button los-button--primary" disabled={!props.canPlace} onClick={props.onPlace}>
                {props.placeLabel}
            </button>
        </div>
    </div>
);

export const LosInventoryPets: FC<{ roomSession: IRoomSession }> = ({ roomSession = null }) => {
    const { petItems = null, selectedPet = null, setSelectedPet, activate = null, deactivate = null } = useInventoryPets();
    const { isUnseen = null, removeUnseen = null } = useInventoryUnseenTracker();
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState(-1);
    const availableTypes = useMemo(() => [...new Set((petItems ?? []).map(({ petData }) => petData.typeId))].sort((a, b) => a - b), [petItems]);
    const activeType = availableTypes.includes(typeFilter) ? typeFilter : -1;
    const visiblePets = useMemo(() => {
        const text = search.trim().toLowerCase();

        return (petItems ?? []).filter(
            ({ petData }) =>
                (activeType === -1 || petData.typeId === activeType) &&
                (!text || petData.name.toLowerCase().includes(text) || LocalizeText(`pet.type.${petData.typeId}`).toLowerCase().includes(text))
        );
    }, [petItems, activeType, search]);

    useEffect(() => {
        if (!visiblePets.includes(selectedPet)) setSelectedPet(visiblePets[0] ?? null);
    }, [visiblePets, selectedPet, setSelectedPet]);

    useEffect(() => {
        if (!selectedPet || !isUnseen(UnseenItemCategory.PET, selectedPet.petData.id)) return;

        removeUnseen(UnseenItemCategory.PET, selectedPet.petData.id);
    }, [selectedPet, isUnseen, removeUnseen]);

    useEffect(() => {
        const id = activate();

        return () => deactivate(id);
    }, [activate, deactivate]);

    if (!petItems?.length) return <LosInventoryEmpty />;

    const searchLabel = localizeWithFallback('generic.search', 'Search');

    return (
        <div className="los-inv__stack">
            <div className="los-inv__filter los-inv__filter--inner">
                <label className="los-inv__search">
                    <LosIcon name="search" size={14} />
                    <input
                        className="los-input"
                        type="text"
                        aria-label={searchLabel}
                        placeholder={searchLabel}
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                </label>
                <select className="los-select" aria-label="Pet type" value={activeType} onChange={(event) => setTypeFilter(Number(event.target.value))}>
                    <option value={-1}>{localizeWithFallback('inventory.pets.filter.type.all', 'All types')}</option>
                    {availableTypes.map((type) => (
                        <option key={type} value={type}>
                            {LocalizeText(`pet.type.${type}`)}
                        </option>
                    ))}
                </select>
            </div>
            <div className="los-inv__split">
                <div className="los-inv__list">
                    <div className="los-inv__grid los-inv__grid--tall los-scroll">
                        {visiblePets.map((item) => (
                            <CompanionTile
                                key={item.petData.id}
                                title={item.petData.name}
                                isActive={item === selectedPet}
                                isUnseen={isUnseen(UnseenItemCategory.PET, item.petData.id)}
                                onSelect={() => setSelectedPet(item)}
                                onPlace={() => attemptPetPlacement(item)}
                            >
                                <InventoryPetImageView pet={item.petData} />
                                <span className="los-inv__count">{item.petData.level}</span>
                            </CompanionTile>
                        ))}
                    </div>
                </div>
                <CompanionSide
                    name={selectedPet?.petData.name}
                    text={selectedPet ? LocalizeText(`pet.type.${selectedPet.petData.typeId}`) : ''}
                    placeLabel={LocalizeText('inventory.pets.placetoroom')}
                    canPlace={!!selectedPet && !!(roomSession?.isRoomOwner || roomSession?.allowPets)}
                    image={selectedPet && <InventoryPetImageView pet={selectedPet.petData} preview />}
                    onPlace={() => attemptPetPlacement(selectedPet as IPetItem)}
                />
            </div>
        </div>
    );
};

export const LosInventoryBots: FC<{ roomSession: IRoomSession }> = ({ roomSession = null }) => {
    const { botItems = [], selectedBot = null, setSelectedBot = null, activate = null, deactivate = null } = useInventoryBots();
    const { isUnseen = null, removeUnseen = null } = useInventoryUnseenTracker();

    useEffect(() => {
        if (!selectedBot || !isUnseen(UnseenItemCategory.BOT, selectedBot.botData.id)) return;

        removeUnseen(UnseenItemCategory.BOT, selectedBot.botData.id);
    }, [selectedBot, isUnseen, removeUnseen]);

    useEffect(() => {
        const id = activate();

        return () => deactivate(id);
    }, [activate, deactivate]);

    if (!botItems?.length) return <LosInventoryEmpty />;

    return (
        <div className="los-inv__split">
            <div className="los-inv__list">
                <div className="los-inv__grid los-inv__grid--tall los-scroll">
                    {botItems.map((item) => (
                        <CompanionTile
                            key={item.botData.id}
                            title={item.botData.name}
                            isActive={item === selectedBot}
                            isUnseen={isUnseen(UnseenItemCategory.BOT, item.botData.id)}
                            onSelect={() => setSelectedBot(item)}
                            onPlace={() => attemptBotPlacement(item)}
                        >
                            <InventoryBotImageView figure={item.botData.figure} gender={item.botData.gender} />
                        </CompanionTile>
                    ))}
                </div>
            </div>
            <CompanionSide
                name={selectedBot?.botData.name}
                text={selectedBot?.botData.motto}
                placeLabel={LocalizeText('inventory.bot.placetoroom')}
                canPlace={!!selectedBot && !!roomSession?.isRoomOwner}
                image={selectedBot && <InventoryBotImageView figure={selectedBot.botData.figure} gender={selectedBot.botData.gender} preview />}
                onPlace={() => attemptBotPlacement(selectedBot as IBotItem)}
            />
        </div>
    );
};
