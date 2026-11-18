import { GetSessionDataManager, RoomDataParser } from '@volt/renderer';
import { FC, Fragment, useEffect, useState } from 'react';
import { CreateLinkEvent, IRoomData, LocalizeText, localizeWithFallback } from '../../../../api';
import { NavigatorRoomSettingsAtView } from './NavigatorRoomSettingsAtView';
import { RoomSettingsFieldError, RoomSettingsFieldErrorView } from './RoomSettingsFieldErrorView';
import { RoomSettingsTextView } from './RoomSettingsTextView';

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
    const petsY = 260 + (hasGroup ? 30 : 0);
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
        <div className="ros-tab" style={{ height: petsY + 82 }}>
            <RoomSettingsTextView h={19} text={LocalizeText('navigator.roomsettings.roomaccess.caption')} textStyle="u_headline_small" w={295} x={0} y={3} />
            <RoomSettingsTextView wrap h={69} text={LocalizeText('navigator.roomsettings.roomaccess.info')} w={310} x={0} y={19} />
            <RoomSettingsTextView h={17} text={LocalizeText('navigator.roomsettings.doormode')} textStyle="u_bold" w={193} x={0} y={87} />
            {doorModes.map((mode, index) => {
                const isPassword = mode.state === RoomDataParser.PASSWORD_STATE;
                const checked = isPassword ? showPassword : roomData.lockState === mode.state && !isTryingPassword;

                return (
                    <Fragment key={mode.id}>
                        <NavigatorRoomSettingsAtView h={20} w={270} x={5} y={105 + index * 20}>
                            <input
                                id={mode.id}
                                className="ros-radio"
                                type="radio"
                                name="lockState"
                                checked={checked}
                                onChange={(event) => (isPassword ? setIsTryingPassword(event.target.checked) : handleChange('lock_state', mode.state))}
                            />
                        </NavigatorRoomSettingsAtView>
                        <RoomSettingsTextView h={17} htmlFor={mode.id} text={LocalizeText(mode.key)} w={mode.label.w} x={20} y={mode.label.y} />
                    </Fragment>
                );
            })}
            {showPassword && (
                <>
                    <RoomSettingsTextView h={17} text={LocalizeText('navigator.roomsettings.password')} w={189} x={41} y={188} />
                    <NavigatorRoomSettingsAtView h={15} w={193} x={42} y={203}>
                        <input
                            type="password"
                            className={`ros-input${fieldError?.field === 'password' ? ' is-invalid' : ''}`}
                            maxLength={PASSWORD_MAX_LENGTH}
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            onFocus={(event) => setIsTryingPassword(true)}
                        />
                    </NavigatorRoomSettingsAtView>
                    <RoomSettingsTextView h={17} text={LocalizeText('navigator.roomsettings.passwordconfirm')} w={234} x={41} y={220} />
                    <NavigatorRoomSettingsAtView h={15} w={193} x={42} y={236}>
                        <input
                            type="password"
                            className={`ros-input${fieldError?.field === 'confirm' ? ' is-invalid' : ''}`}
                            maxLength={PASSWORD_MAX_LENGTH}
                            value={confirmPassword}
                            onChange={(event) => setConfirmPassword(event.target.value)}
                            onBlur={saveRoomPassword}
                        />
                    </NavigatorRoomSettingsAtView>
                </>
            )}
            {showPassword && fieldError?.field === 'password' && <RoomSettingsFieldErrorView h={15} message={fieldError.message} overlayNode={overlayNode} w={193} x={42} y={203} />}
            {showPassword && fieldError?.field === 'confirm' && <RoomSettingsFieldErrorView h={15} message={fieldError.message} overlayNode={overlayNode} w={193} x={42} y={236} />}
            {lockedByBuildersClub && (
                <NavigatorRoomSettingsAtView className="ros-bc-locked" h={166} w={308} x={0} y={88}>
                    <NavigatorRoomSettingsAtView className="ros-text ros-head" h={19} w={295} x={5} y={10}>
                        {LocalizeText('notification.builders_club.room_locked.title')}
                    </NavigatorRoomSettingsAtView>
                    <NavigatorRoomSettingsAtView className="ros-text ros-multi" h={79} w={298} x={5} y={42}>
                        {LocalizeText('notification.builders_club.room_locked.message')}
                    </NavigatorRoomSettingsAtView>
                    <NavigatorRoomSettingsAtView h={30} w={287} x={11} y={122}>
                        <button type="button" className="ros-button" onClick={() => CreateLinkEvent('habbopages/builders-club/faq')}>
                            <span className="ros-button-label">{LocalizeText('notification.builders_club.room_locked.linkTitle')}</span>
                        </button>
                    </NavigatorRoomSettingsAtView>
                </NavigatorRoomSettingsAtView>
            )}
            {hasGroup && <RoomSettingsTextView wrap h={30} text={LocalizeText('navigator.roomsettings.roomaccess.guild.disclaimer')} w={277} x={0} y={260} />}
            <RoomSettingsTextView h={17} text={LocalizeText('navigator.roomsettings.pets')} textStyle="u_bold" w={162} x={0} y={petsY} />
            {pets.map((pet, index) => (
                <Fragment key={pet.id}>
                    <NavigatorRoomSettingsAtView h={20} w={20} x={3} y={petsY + 19 + index * 20}>
                        <input
                            id={pet.id}
                            className="ros-check"
                            type="checkbox"
                            checked={pet.checked}
                            onChange={(event) => handleChange(pet.field, event.target.checked)}
                        />
                    </NavigatorRoomSettingsAtView>
                    <RoomSettingsTextView h={17} htmlFor={pet.id} text={pet.text} w={pet.w} x={18} y={petsY + 18 + index * 20} />
                </Fragment>
            ))}
        </div>
    );
};
