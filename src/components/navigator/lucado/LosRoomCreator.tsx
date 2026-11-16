import { CreateFlatMessageComposer, GetSessionDataManager } from '@volt/renderer';
import { FC, useMemo } from 'react';
import { CreateLinkEvent, GetConfigurationValue, IRoomModel, LocalizeText, SendMessageComposer } from '../../../api';
import { DraggableWindow } from '../../../common';
import { LosIcon, LosWindow } from '../../../common/lucadoos';
import { useNavigatorData, useNavigatorUiStore, useUserDataSnapshot } from '../../../hooks';
import { useRoomCreatorStore } from '../views/navigatorRoomCreatorStore';

const TRADE_KEYS = ['navigator.roomsettings.trade_not_allowed', 'navigator.roomsettings.trade_not_with_Controller', 'navigator.roomsettings.trade_allowed'];

// name:tiles, grouped by the club level a layout needs. Staff-only layouts use -1.
const MODEL_GROUPS: readonly [number, string][] = [
    [0, 'a:104 b:94 c:36 d:84 e:80 f:80 i:416 j:320 k:448 l:352 m:384 n:372'],
    [1, 'g:80 h:74 o:416 p:352 q:304 r:336 u:748 v:438'],
    [2, 't:540 w:512 x:396 y:440 z:456 0:208 1:1009 2:1044 3:183 4:254 5:1024 6:801 7:354 8:888 9:926'],
    [-1, 'snowwar1:2500 snowwar2:2500']
];

const ROOM_MODELS: readonly IRoomModel[] = MODEL_GROUPS.flatMap(([clubLevel, list]) =>
    list.split(' ').map((entry) => {
        const [name, tiles] = entry.split(':');

        return { name, tileSize: Number(tiles), clubLevel };
    })
);

const visitorOptions = (limit: number) => {
    const values: number[] = [];

    for (let value = 10; value <= limit; value += 5) values.push(value);

    return values;
};

const onPositionChange = (position: { x: number; y: number }) => useRoomCreatorStore.getState().setPosition(position);
const closeCreator = () => useNavigatorUiStore.getState().closeCreator();
const openClub = () => CreateLinkEvent('habboUI/open/hccenter');

export const LosRoomCreator: FC = () => {
    const { categories } = useNavigatorData();
    const { clubLevel } = useUserDataSnapshot();
    const isCreatorOpen = useNavigatorUiStore((state) => state.isCreatorOpen);
    const { name, description, categoryIndex, visitorsIndex, tradeIndex, nameError, nameInvalid, selectedModelName, position, showVersion, setForm } =
        useRoomCreatorStore();
    const session = GetSessionDataManager();
    const canUseStaffCategories = session.hasSecurity(7);
    const canUseSpecialModels = session.hasSecurity(4);

    const selectableCategories = useMemo(
        () => (categories ?? []).filter((category) => category.visible && !category.automatic && (!category.staffOnly || canUseStaffCategories)),
        [categories, canUseStaffCategories]
    );
    const visitors = useMemo(() => visitorOptions(clubLevel >= 1 ? 75 : 50), [clubLevel]);

    if (!isCreatorOpen || !position) return null;

    const roomModels = ROOM_MODELS.filter((model) => model.clubLevel !== -1 || canUseSpecialModels);
    const selectedModel = roomModels.find((model) => model.name === selectedModelName) ?? roomModels[0];
    const safeCategoryIndex = categoryIndex < selectableCategories.length ? categoryIndex : 0;
    const safeVisitorsIndex = visitorsIndex < visitors.length ? visitorsIndex : 0;
    const imageBase = `${GetConfigurationValue<string>('image.library.url', '')}newroom/model_`;
    const showVipPromo = clubLevel < 2 && !GetConfigurationValue<boolean>('habbo_club_buy_disabled', false);

    const selectModel = (model: IRoomModel) => {
        if (model.clubLevel > 0 && clubLevel < 1) {
            openClub();
            return;
        }

        setForm({ selectedModelName: model.name });
    };

    const createRoom = () => {
        if (name.trim().length <= 2) {
            setForm({ nameError: LocalizeText('navigator.createroom.nameerr'), nameInvalid: true });
            return;
        }

        setForm({ nameError: null, nameInvalid: false });

        const category = selectableCategories[safeCategoryIndex];

        SendMessageComposer(
            new CreateFlatMessageComposer(
                name,
                description,
                `model_${selectedModel.name}`,
                category ? category.id : 0,
                visitors[safeVisitorsIndex] ?? 10,
                tradeIndex
            )
        );
    };

    return (
        <DraggableWindow
            key={showVersion}
            uniqueKey="navigator-room-creator"
            handleSelector=".los-window__bar"
            initialPosition={position}
            constrainToViewport={true}
            onPositionChange={onPositionChange}
        >
            <LosWindow className="los-creator" icon="plus" title={LocalizeText('navigator.createroom.title')} onClose={closeCreator}>
                <div className="los-creator__body">
                    <form
                        className="los-creator__form"
                        onSubmit={(event) => {
                            event.preventDefault();
                            createRoom();
                        }}
                    >
                        <label className="los-creator__field">
                            <span>{LocalizeText('navigator.roomname')}</span>
                            <input
                                className={`los-input${nameInvalid ? ' is-invalid' : ''}`}
                                type="text"
                                maxLength={25}
                                aria-invalid={nameInvalid}
                                placeholder={LocalizeText('navigator.createroom.roomnameinfo')}
                                value={name}
                                onChange={(event) => setForm({ name: event.target.value, nameTouched: true, nameError: null, nameInvalid: false })}
                            />
                            {nameError && (
                                <small className="los-creator__error" role="alert">
                                    {nameError}
                                </small>
                            )}
                        </label>
                        <label className="los-creator__field">
                            <span>{LocalizeText('navigator.roomdesc')}</span>
                            <textarea
                                className="los-input los-creator__description"
                                maxLength={128}
                                placeholder={LocalizeText('navigator.createroom.roomdescinfo')}
                                value={description}
                                onChange={(event) => setForm({ description: event.target.value, descriptionTouched: true })}
                            />
                        </label>
                        <label className="los-creator__field">
                            <span>{LocalizeText('navigator.category')}</span>
                            <select
                                className="los-select"
                                value={safeCategoryIndex}
                                onChange={(event) => setForm({ categoryIndex: Number(event.target.value) })}
                            >
                                {selectableCategories.map((category, index) => (
                                    <option key={category.id} value={index}>
                                        {LocalizeText(category.name)}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <div className="los-creator__row">
                            <label className="los-creator__field">
                                <span>{LocalizeText('navigator.maxvisitors')}</span>
                                <select
                                    className="los-select"
                                    value={safeVisitorsIndex}
                                    onChange={(event) => setForm({ visitorsIndex: Number(event.target.value) })}
                                >
                                    {visitors.map((value, index) => (
                                        <option key={value} value={index}>
                                            {value}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="los-creator__field">
                                <span>{LocalizeText('navigator.tradesettings')}</span>
                                <select className="los-select" value={tradeIndex} onChange={(event) => setForm({ tradeIndex: Number(event.target.value) })}>
                                    {TRADE_KEYS.map((key, index) => (
                                        <option key={key} value={index}>
                                            {LocalizeText(key)}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>
                        <div className="los-creator__picked">
                            <img src={`${imageBase}${selectedModel.name}.png`} alt="" />
                            <span>
                                {selectedModel.tileSize} {LocalizeText('navigator.createroom.tilesize')}
                            </span>
                        </div>
                        <div className="los-creator__buttons">
                            <button type="button" className="los-button" onClick={closeCreator}>
                                {LocalizeText('generic.cancel')}
                            </button>
                            <button type="submit" className="los-button los-button--primary">
                                {LocalizeText('navigator.createroom.create')}
                            </button>
                        </div>
                    </form>
                    <div className="los-creator__layouts">
                        <span className="los-creator__caption">{LocalizeText('navigator.createroom.chooselayoutcaption')}</span>
                        <div className="los-creator__grid los-scroll">
                            {roomModels.map((model) => {
                                const isSelected = selectedModel.name === model.name;
                                const isLocked = model.clubLevel > 0 && clubLevel < 1;

                                return (
                                    <button
                                        key={model.name}
                                        type="button"
                                        className={`los-creator__model${isSelected ? ' is-selected' : ''}${isLocked ? ' is-locked' : ''}`}
                                        aria-pressed={isSelected}
                                        onClick={() => selectModel(model)}
                                    >
                                        <img src={`${imageBase}${model.name}.png`} alt="" loading="lazy" />
                                        <span className="los-creator__tiles">
                                            <LosIcon name="grid" size={11} />
                                            {model.tileSize}
                                        </span>
                                        {model.clubLevel > 0 && <span className="los-creator__club">{model.clubLevel > 1 ? 'VIP' : 'HC'}</span>}
                                    </button>
                                );
                            })}
                        </div>
                        {showVipPromo && (
                            <button type="button" className="los-creator__promo" onClick={openClub}>
                                <span>{LocalizeText('navigator.createroom.vippromo.text')}</span>
                                <strong>{LocalizeText('navigator.createroom.vippromo.link')}</strong>
                            </button>
                        )}
                    </div>
                </div>
            </LosWindow>
        </DraggableWindow>
    );
};
