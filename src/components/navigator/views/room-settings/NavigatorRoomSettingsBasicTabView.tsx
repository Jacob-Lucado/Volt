import { GetSessionDataManager } from '@volt/renderer';
import { FC, useEffect, useState } from 'react';
import { GetClubMemberLevel, GetMaxVisitorsList, GetSelectedMaxVisitors, IRoomData, LocalizeText } from '../../../../api';
import { LosCheck, LosField, LosIcon, LosSelect } from '../../../../common/lucadoos';
import { useNavigatorData } from '../../../../hooks';
import { RoomSettingsFieldError } from './RoomSettingsFieldErrorView';

const ROOM_NAME_MIN_LENGTH = 3;
const ROOM_NAME_MAX_LENGTH = 60;
const DESC_MAX_LENGTH = 255;
const TAGS_MAX_LENGTH = 30;

interface NavigatorRoomSettingsTabViewProps {
    roomData: IRoomData;
    isEnteredRoom?: boolean;
    handleChange: (field: string, value: string | number | boolean | string[]) => void;
    fieldError?: RoomSettingsFieldError;
    overlayNode?: HTMLElement;
    onFieldError: (error: RoomSettingsFieldError) => void;
    onDelete: () => void;
}

export const NavigatorRoomSettingsBasicTabView: FC<NavigatorRoomSettingsTabViewProps> = (props) => {
    const { roomData = null, isEnteredRoom = true, handleChange = null, fieldError = null, overlayNode = null, onFieldError = null, onDelete = null } = props;
    const [roomName, setRoomName] = useState<string>('');
    const [roomDescription, setRoomDescription] = useState<string>('');
    const [roomTag1, setRoomTag1] = useState<string>('');
    const [roomTag2, setRoomTag2] = useState<string>('');
    const { categories } = useNavigatorData();
    // _r2ec56e547f022d: a safety-locked account keeps the delete link but it is dimmed and dead.
    const isSafetyLocked = GetSessionDataManager().isSafetyLocked;
    const visitorOptions = GetMaxVisitorsList(GetClubMemberLevel() > 0, roomData.userCount);
    const selectedVisitors = GetSelectedMaxVisitors(visitorOptions, roomData.userCount);
    const selectedVisitorIndex =
        roomData.userCount > visitorOptions[visitorOptions.length - 1] ? visitorOptions.length - 1 : visitorOptions.indexOf(selectedVisitors);

    const saveRoomName = (value = roomName) => {
        if (value.length < ROOM_NAME_MIN_LENGTH) {
            onFieldError({ field: 'name', message: LocalizeText('navigator.roomsettings.roomnameismandatory') });
            return;
        }

        if (value === roomData.roomName || value.length > ROOM_NAME_MAX_LENGTH) return;

        handleChange('name', value);
    };

    const saveRoomDescription = (value = roomDescription) => {
        if (value === roomData.roomDescription || value.length > DESC_MAX_LENGTH) return;

        handleChange('description', value);
    };

    const saveTags = (index: number) => {
        if (index === 0 && roomTag1 === roomData.tags[0]) return;

        if (index === 1 && roomTag2 === roomData.tags[1]) return;

        const tag = index === 0 ? roomTag1 : roomTag2;

        if (tag.length > TAGS_MAX_LENGTH) {
            onFieldError({ field: 'tags', message: LocalizeText('navigator.roomsettings.toomanycharacters'), tagText: tag.toLowerCase() });
            return;
        }

        if (roomTag1 === '' && roomTag2 !== '') setRoomTag2('');

        handleChange('tags', roomTag1 === '' && roomTag2 !== '' ? [roomTag2] : [roomTag1, roomTag2]);
    };

    useEffect(() => {
        setRoomName(roomData.roomName);
        setRoomDescription(roomData.roomDescription);
        setRoomTag1(roomData.tags.length > 0 && roomData.tags[0] ? roomData.tags[0] : '');
        setRoomTag2(roomData.tags.length > 0 && roomData.tags[1] ? roomData.tags[1] : '');
    }, [roomData]);

    // setCategorySelection: visible, non-automatic categories (plus the room's own); without a match the first one shows.
    const categoryOptions = (categories ?? [])
        .filter((category) => (category.visible || category.id === roomData.categoryId) && !category.automatic)
        .map((category) => ({ value: category.id, label: LocalizeText(category.name) }));

    const tagHasError = (tag: string) => fieldError?.field === 'tags' && tag !== '' && tag.toLowerCase() === fieldError.tagText;

    return (
        <div className="los-ros__tab">
            <LosField label={LocalizeText('navigator.roomname')} error={fieldError?.field === 'name' ? fieldError.message : undefined}>
                <input
                    className="los-input"
                    value={roomName}
                    maxLength={ROOM_NAME_MAX_LENGTH}
                    onChange={(event) => setRoomName(event.target.value)}
                    onBlur={(event) => saveRoomName(event.currentTarget.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') saveRoomName(event.currentTarget.value);
                    }}
                />
            </LosField>
            <LosField label={LocalizeText('navigator.roomsettings.desc')} error={fieldError?.field === 'description' ? fieldError.message : undefined}>
                <textarea
                    className="los-input los-ros__area"
                    value={roomDescription}
                    maxLength={DESC_MAX_LENGTH}
                    onChange={(event) => setRoomDescription(event.target.value)}
                    onBlur={(event) => saveRoomDescription(event.currentTarget.value)}
                />
            </LosField>
            <div className="los-ros__row">
                <LosField label={LocalizeText('navigator.category')}>
                    <LosSelect
                        value={roomData.categoryId}
                        options={(categories ?? []).map((category) => ({ value: category.id, label: LocalizeText(category.name) }))}
                        onChange={(value) => handleChange('category', value)}
                    />
                </LosField>
                <LosField label={LocalizeText('navigator.maxvisitors')}>
                    <LosSelect
                        value={selectedVisitorIndex}
                        options={visitorOptions.map((value, index) => ({ value: index, label: String(value) }))}
                        onChange={(index) => handleChange('max_visitors', visitorOptions[index])}
                    />
                </LosField>
            </div>
            <LosField label={LocalizeText('navigator.tradesettings')}>
                <LosSelect
                    value={roomData.tradeState}
                    options={[
                        { value: 0, label: LocalizeText('navigator.roomsettings.trade_not_allowed') },
                        { value: 1, label: LocalizeText('navigator.roomsettings.trade_not_with_Controller') },
                        { value: 2, label: LocalizeText('navigator.roomsettings.trade_allowed') }
                    ]}
                    onChange={(value) => handleChange('trade_state', value)}
                />
            </LosField>
            <LosField
                label={LocalizeText('navigator.tags')}
                error={fieldError?.field === 'tags' && (tagHasError(roomTag1) || tagHasError(roomTag2)) ? fieldError.message : undefined}
            >
                <div className="los-ros__row">
                    <input
                        className="los-input"
                        value={roomTag1 ? `#${roomTag1}` : ''}
                        onChange={(event) => setRoomTag1(event.target.value.replace(/^#/, ''))}
                        onBlur={() => saveTags(0)}
                    />
                    <input
                        className="los-input"
                        value={roomTag2 ? `#${roomTag2}` : ''}
                        onChange={(event) => setRoomTag2(event.target.value.replace(/^#/, ''))}
                        onBlur={() => saveTags(1)}
                    />
                </div>
            </LosField>
            <LosCheck
                checked={roomData.allowWalkthrough}
                label={LocalizeText('navigator.roomsettings.allow_walk_through')}
                onChange={(checked) => handleChange('allow_walkthrough', checked)}
            />
            {isEnteredRoom && (
                <button type="button" className="los-button los-button--danger" disabled={isSafetyLocked} onClick={onDelete}>
                    <LosIcon name="trash" size={14} /> {LocalizeText('navigator.roomsettings.delete')}
                </button>
            )}
        </div>
    );
};
