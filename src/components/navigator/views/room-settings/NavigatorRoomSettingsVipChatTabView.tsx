import { RoomChatSettings } from '@volt/renderer';
import { FC } from 'react';
import { GetClubMemberLevel, IRoomData, LocalizeText, localizeWithFallback } from '../../../../api';
import { HabboDropMenuView } from '../../../../common/dropmenu/HabboDropMenuView';
import { NavigatorRoomSettingsAtView } from './NavigatorRoomSettingsAtView';
import { RoomSettingsInputErrorView } from './RoomSettingsInputErrorView';
import { RoomSettingsTextView } from './RoomSettingsTextView';

const VIP_CAPTIONS: Record<string, string> = {
    'navigator.roomsettings.room_behavior': 'Room behavior',
    'navigator.roomsettings.do_not_leave_on_door_tile': 'Do not leave room when walking on the door tile',
    'navigator.roomsettings.idle_sleep': 'Sleep after timeout',
    'navigator.roomsettings.idle_autokick': 'Auto-kick after timeout',
    'navigator.roomsettings.timeout.seconds': 'seconds',
    'navigator.roomsettings.chat.flood_sensitivity': 'Flood sensitivity',

    'navigator.roomsettings.idle_sleep_timeout.invalid': 'Sleep timeout must be between 30 seconds and 1 hour',
    'navigator.roomsettings.idle_autokick_timeout.invalid': 'Auto-kick timeout must be between 60 seconds and 10 hours',
    'navigator.roomsettings.idle_autokick_timeout.offset.invalid': 'Auto-kick timeout must be at least 30 seconds higher than sleep timeout'
};

const vipCaption = (key: string) => localizeWithFallback(key, VIP_CAPTIONS[key] ?? key);

interface NavigatorRoomSettingsTabViewProps {
    roomData: IRoomData;
    handleChange: (field: string, value: string | number | boolean) => void;
    handleDraftChange: (field: 'idle_sleep_timeout_seconds' | 'idle_autokick_timeout_seconds', value: string) => void;
    idleSleepTimeoutSeconds: string;
    idleAutokickTimeoutSeconds: string;
    inputError: { field: 'idle_sleep_timeout_seconds' | 'idle_autokick_timeout_seconds'; key: string };
}

export const NavigatorRoomSettingsVipChatTabView: FC<NavigatorRoomSettingsTabViewProps> = (props) => {
    const { roomData = null, handleChange = null, handleDraftChange, idleSleepTimeoutSeconds, idleAutokickTimeoutSeconds, inputError } = props;
    const isHC = GetClubMemberLevel() > 0;
    const sleepError = inputError?.field === 'idle_sleep_timeout_seconds' && isHC && roomData.idleSleepEnabled;
    const autokickError = inputError?.field === 'idle_autokick_timeout_seconds' && isHC && roomData.idleAutokickEnabled;

    // RoomSettingsCtrl.refreshRoomBehaviorSettingsState: without VIP the walls, thickness, door tile and idle controls are
    // disabled and blended to 0.5; a timeout field also needs its checkbox. The flood filter stays enabled.
    const sleepFieldEnabled = isHC && roomData.idleSleepEnabled;
    const kickFieldEnabled = isHC && roomData.idleAutokickEnabled;
    const thickness = (prefix: string) => [
        { value: -2, label: LocalizeText(`${prefix}.thinnest`) },
        { value: -1, label: LocalizeText(`${prefix}.thin`) },
        { value: 0, label: LocalizeText(`${prefix}.normal`) },
        { value: 1, label: LocalizeText(`${prefix}.thick`) }
    ];
    const checkbox = (id: string, checked: boolean, y: number, onChange: (checked: boolean) => void) => (
        <NavigatorRoomSettingsAtView className={isHC ? '' : 'ros-disabled'} h={20} w={20} x={0} y={y}>
            <input id={id} checked={checked} className="ros-check" disabled={!isHC} type="checkbox" onChange={(event) => onChange(event.target.checked)} />
        </NavigatorRoomSettingsAtView>
    );
    const timeoutField = (field: 'idle_sleep_timeout_seconds' | 'idle_autokick_timeout_seconds', value: string, enabled: boolean, error: boolean, caption: string, y: number) => (
        <NavigatorRoomSettingsAtView className={enabled ? '' : 'ros-disabled'} h={20} w={50} x={24} y={y}>
            <input
                className={`ros-input ros-input-20${error ? ' is-invalid' : ''}`}
                aria-invalid={error}
                aria-label={`${caption} ${vipCaption('navigator.roomsettings.timeout.seconds')}`}
                disabled={!enabled}
                inputMode="numeric"
                maxLength={5}
                value={value}
                onBlur={(event) => handleChange(field, event.currentTarget.value)}
                onChange={(event) => handleDraftChange(field, event.target.value.replace(/\D/g, ''))}
            />
            {error && <RoomSettingsInputErrorView message={vipCaption(inputError.key)} />}
        </NavigatorRoomSettingsAtView>
    );

    return (
        <div className="ros-tab" style={{ height: 395 }}>
            <RoomSettingsTextView h={19} text={LocalizeText('navigator.roomsettings.vip.caption')} textStyle="u_headline_small" w={237} x={0} y={3} />
            <RoomSettingsTextView wrap h={63} text={LocalizeText('navigator.roomsettings.vip.info')} w={310} x={0} y={19} />
            <RoomSettingsTextView h={17} text={LocalizeText('navigator.roomsettings.vip_settings')} textStyle="u_bold" w={206} x={0} y={84} />
            {checkbox('ros-hide-walls', roomData.hideWalls, 104, (checked) => handleChange('hide_walls', checked))}
            <RoomSettingsTextView disabled={!isHC} h={17} htmlFor="ros-hide-walls" text={LocalizeText('navigator.roomsettings.hide_walls')} w={194} x={20} y={103} />
            <NavigatorRoomSettingsAtView className={`ros-drop${isHC ? '' : ' ros-disabled'}`} h={24} w={276} x={0} y={125}>
                <HabboDropMenuView
                    label={localizeWithFallback('navigator.roomsettings.wall_thickness', 'Wall thickness')}
                    value={roomData.wallThickness}
                    options={thickness('navigator.roomsettings.wall_thickness')}
                    disabled={!isHC}
                    onSelect={(value) => handleChange('wall_thickness', value)}
                />
            </NavigatorRoomSettingsAtView>
            <NavigatorRoomSettingsAtView className={`ros-drop${isHC ? '' : ' ros-disabled'}`} h={24} w={276} x={0} y={156}>
                <HabboDropMenuView
                    label={localizeWithFallback('navigator.roomsettings.floor_thickness', 'Floor thickness')}
                    value={roomData.floorThickness}
                    options={thickness('navigator.roomsettings.floor_thickness')}
                    disabled={!isHC}
                    onSelect={(value) => handleChange('floor_thickness', value)}
                />
            </NavigatorRoomSettingsAtView>
            <RoomSettingsTextView h={17} text={vipCaption('navigator.roomsettings.room_behavior')} textStyle="u_bold" w={221} x={0} y={191} />
            {checkbox('ros-door-tile', !roomData.leaveOnDoorTileEnabled, 212, (checked) => handleChange('leave_on_door_tile_enabled', !checked))}
            <RoomSettingsTextView disabled={!isHC} h={17} htmlFor="ros-door-tile" text={vipCaption('navigator.roomsettings.do_not_leave_on_door_tile')} w={292} x={20} y={211} />
            {checkbox('ros-idle-sleep', roomData.idleSleepEnabled, 234, (checked) => handleChange('idle_sleep_enabled', checked))}
            <RoomSettingsTextView disabled={!isHC} h={17} htmlFor="ros-idle-sleep" text={vipCaption('navigator.roomsettings.idle_sleep')} w={192} x={20} y={233} />
            {timeoutField('idle_sleep_timeout_seconds', idleSleepTimeoutSeconds, sleepFieldEnabled, sleepError, vipCaption('navigator.roomsettings.idle_sleep'), 255)}
            <RoomSettingsTextView disabled={!sleepFieldEnabled} h={17} text={vipCaption('navigator.roomsettings.timeout.seconds')} w={231} x={77} y={257} />
            {checkbox('ros-idle-autokick', roomData.idleAutokickEnabled, 280, (checked) => handleChange('idle_autokick_enabled', checked))}
            <RoomSettingsTextView disabled={!isHC} h={17} htmlFor="ros-idle-autokick" text={vipCaption('navigator.roomsettings.idle_autokick')} w={210} x={20} y={279} />
            {timeoutField('idle_autokick_timeout_seconds', idleAutokickTimeoutSeconds, kickFieldEnabled, autokickError, vipCaption('navigator.roomsettings.idle_autokick'), 301)}
            <RoomSettingsTextView disabled={!kickFieldEnabled} h={17} text={vipCaption('navigator.roomsettings.timeout.seconds')} w={231} x={77} y={303} />
            <RoomSettingsTextView h={17} text={vipCaption('navigator.roomsettings.chat.flood_sensitivity')} textStyle="u_bold" w={260} x={0} y={335} />
            <NavigatorRoomSettingsAtView className="ros-drop" h={24} w={276} x={0} y={358}>
                <HabboDropMenuView
                    label={vipCaption('navigator.roomsettings.chat.flood_sensitivity')}
                    value={roomData.chatSettings.protection}
                    options={[
                        { value: RoomChatSettings.FLOOD_FILTER_STRICT, label: LocalizeText('navigator.roomsettings.chat.flood.strict') },
                        { value: RoomChatSettings.FLOOD_FILTER_NORMAL, label: LocalizeText('navigator.roomsettings.chat.flood.normal') },
                        { value: RoomChatSettings.FLOOD_FILTER_LOOSE, label: LocalizeText('navigator.roomsettings.chat.flood.loose') }
                    ]}
                    onSelect={(value) => handleChange('flood_protection', value)}
                />
            </NavigatorRoomSettingsAtView>
        </div>
    );
};
