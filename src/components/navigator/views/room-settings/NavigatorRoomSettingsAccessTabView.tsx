import { GetSessionDataManager, RoomDataParser } from '@volt/renderer';
import { FC, Fragment, useEffect, useState } from 'react';
import { CreateLinkEvent, IRoomData, LocalizeText, localizeWithFallback } from '../../../../api';
import { LosCheck, LosField, LosRadio } from '../../../../common/lucadoos';
import { RoomSettingsFieldError } from './RoomSettingsFieldErrorView';

const PASSWORD_MAX_LENGTH = 30;

interface NavigatorRoomSettingsTabViewProps {
    roomData: IRoomData;
    hasGroup?: boolean;
    fieldError?: RoomSettingsFieldError;
    overlayNode?: HTMLElement;
    onFieldError: (error: RoomSettingsFieldError) => void;
    handleChange: (field: string, value: string | number | boolean) => void;
}

export const NavigatorRoomSettingsAccessTabView: FC<NavigatorRoomSettingsTabViewProps> = (props) => {
    const { roomData = null, hasGroup = false, fieldError = null, overlayNode = null, onFieldError = null, handleChange = null } = props;
    const [password, setPassword] = useState<string>('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isTryingPassword, setIsTryingPassword] = useState(false);

    const saveRoomPassword = () => {
        if (!isTryingPassword) return;

        if (password.length <= 0) {
            onFieldError({ field: 'password', message: LocalizeText('navigator.roomsettings.passwordismandatory') });
            return;
        }

        if (password !== confirmPassword) {
            onFieldError({ field: 'confirm', message: LocalizeText('navigator.roomsettings.invalidconfirm') });
            return;
        }

        handleChange('password', password);
    };

    useEffect(() => {
        setPassword('');
        setConfirmPassword('');
        setIsTryingPassword(false);
    }, [roomData]);

    const showPassword = isTryingPassword || roomData.lockState === RoomDataParser.PASSWORD_STATE;
    // doormode_override_info (AIR WIN63-202610151745-318700621 navigator/roomsettings/RoomSettingsCtrl.as:726): a room hidden by
    // Builders Club furni overrides its door mode; staff (security 4) see the normal settings.
    const lockedByBuildersClub = !!roomData.hiddenByBc && !GetSessionDataManager().hasSecurity(4);

    const doorModes = [
        { id: 'ros-door-open', state: RoomDataParser.OPEN_STATE, key: 'navigator.roomsettings.doormode.open', label: { y: 104, w: 230 } },
        { id: 'ros-door-bell', state: RoomDataParser.DOORBELL_STATE, key: 'navigator.roomsettings.doormode.doorbell', label: { y: 123, w: 249 } },
        { id: 'ros-door-invisible', state: RoomDataParser.INVISIBLE_STATE, key: 'navigator.roomsettings.doormode.invisible', label: { y: 143, w: 245 } },
        { id: 'ros-door-password', state: RoomDataParser.PASSWORD_STATE, key: 'navigator.roomsettings.doormode.password', label: { y: 163, w: 253 } }
    ];
    const pets = [
        { id: 'ros-allow-pets', field: 'allow_pets', checked: roomData.allowPets, text: LocalizeText('navigator.roomsettings.allowpets'), w: 191 },
        { id: 'ros-allow-food', field: 'allow_pets_eat', checked: roomData.allowPetsEat, text: LocalizeText('navigator.roomsettings.allowfoodconsume'), w: 245 },
        { id: 'ros-mute-pets', field: 'mute_all_pets', checked: roomData.muteAllPets, text: localizeWithFallback('navigator.roomsettings.mute_all_pets', 'Mute all pets'), w: 215 }
    ];

    // tab_container_2: doormode selector (5,105) with 20px radio rows and labels at x 20; flexible_content (0,260) stacks
    // the 30px guild disclaimer (only in a group room) over advanced_container.
    return (
        <div className="los-ros__tab">
            <div className="los-ros__intro">
                <b>{LocalizeText('navigator.roomsettings.roomaccess.caption')}</b>
                <p>{LocalizeText('navigator.roomsettings.roomaccess.info')}</p>
            </div>
            {lockedByBuildersClub ? (
                <div className="los-ros__notice">
                    <b>{LocalizeText('notification.builders_club.room_locked.title')}</b>
                    <p>{LocalizeText('notification.builders_club.room_locked.message')}</p>
                    <button type="button" className="los-button" onClick={() => CreateLinkEvent('habbopages/builders-club/faq')}>
                        {LocalizeText('notification.builders_club.room_locked.linkTitle')}
                    </button>
                </div>
            ) : (
                <LosField label={LocalizeText('navigator.roomsettings.doormode')}>
                    <div className="los-ros__list">
                        <LosRadio
                            checked={roomData.lockState === RoomDataParser.OPEN_STATE && !isTryingPassword}
                            label={LocalizeText('navigator.roomsettings.doormode.open')}
                            onChange={() => handleChange('lock_state', RoomDataParser.OPEN_STATE)}
                        />
                        <LosRadio
                            checked={roomData.lockState === RoomDataParser.DOORBELL_STATE && !isTryingPassword}
                            label={LocalizeText('navigator.roomsettings.doormode.doorbell')}
                            onChange={() => handleChange('lock_state', RoomDataParser.DOORBELL_STATE)}
                        />
                        <LosRadio
                            checked={roomData.lockState === RoomDataParser.INVISIBLE_STATE && !isTryingPassword}
                            label={LocalizeText('navigator.roomsettings.doormode.invisible')}
                            onChange={() => handleChange('lock_state', RoomDataParser.INVISIBLE_STATE)}
                        />
                        <LosRadio
                            checked={showPassword}
                            label={LocalizeText('navigator.roomsettings.doormode.password')}
                            onChange={(checked) => setIsTryingPassword(checked)}
                        />
                    </div>
                </LosField>
            )}
            {showPassword && !lockedByBuildersClub && (
                <div className="los-ros__row">
                    <LosField label={LocalizeText('navigator.roomsettings.password')} error={fieldError?.field === 'password' ? fieldError.message : undefined}>
                        <input
                            type="password"
                            className="los-input"
                            maxLength={PASSWORD_MAX_LENGTH}
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            onFocus={() => setIsTryingPassword(true)}
                        />
                    </LosField>
                    <LosField
                        label={LocalizeText('navigator.roomsettings.passwordconfirm')}
                        error={fieldError?.field === 'confirm' ? fieldError.message : undefined}
                    >
                        <input
                            type="password"
                            className="los-input"
                            maxLength={PASSWORD_MAX_LENGTH}
                            value={confirmPassword}
                            onChange={(event) => setConfirmPassword(event.target.value)}
                            onBlur={saveRoomPassword}
                        />
                    </LosField>
                </div>
            )}
            {hasGroup && <p className="los-ros__note">{LocalizeText('navigator.roomsettings.roomaccess.guild.disclaimer')}</p>}
            <LosField label={LocalizeText('navigator.roomsettings.pets')}>
                <div className="los-ros__list">
                    <LosCheck
                        checked={roomData.allowPets}
                        label={LocalizeText('navigator.roomsettings.allowpets')}
                        onChange={(checked) => handleChange('allow_pets', checked)}
                    />
                    <LosCheck
                        checked={roomData.allowPetsEat}
                        label={LocalizeText('navigator.roomsettings.allowfoodconsume')}
                        onChange={(checked) => handleChange('allow_pets_eat', checked)}
                    />
                    <LosCheck
                        checked={roomData.muteAllPets}
                        label={localizeWithFallback('navigator.roomsettings.mute_all_pets', 'Mute all pets')}
                        onChange={(checked) => handleChange('mute_all_pets', checked)}
                    />
                </div>
            </LosField>
        </div>
    );
};
