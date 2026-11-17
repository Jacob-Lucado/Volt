import { RoomChatSettings } from '@volt/renderer';
import { FC } from 'react';
import { GetClubMemberLevel, IRoomData, LocalizeText, localizeWithFallback } from '../../../../api';
import { LosCheck, LosField, LosSelect } from '../../../../common/lucadoos';

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
    const sleepError = inputError?.field === 'idle_sleep_timeout_seconds' && roomData.idleSleepEnabled;
    const autokickError = inputError?.field === 'idle_autokick_timeout_seconds' && roomData.idleAutokickEnabled;

    return (
        <div className="los-ros__tab">
            <div className="los-ros__intro">
                <b>{LocalizeText('navigator.roomsettings.vip.caption')}</b>
                <p>{LocalizeText('navigator.roomsettings.vip.info')}</p>
            </div>
            <LosField label={LocalizeText('navigator.roomsettings.vip_settings')}>
                <div className="los-ros__list">
                    <LosCheck
                        checked={roomData.hideWalls}
                        disabled={!isHC}
                        label={LocalizeText('navigator.roomsettings.hide_walls')}
                        onChange={(checked) => handleChange('hide_walls', checked)}
                    />
                </div>
            </LosField>
            <div className="los-ros__row">
                <LosField label={localizeWithFallback('navigator.roomsettings.wall_thickness', 'Wall thickness')}>
                    <LosSelect
                        value={roomData.wallThickness}
                        disabled={!isHC}
                        options={[
                            { value: -2, label: LocalizeText('navigator.roomsettings.wall_thickness.thinnest') },
                            { value: -1, label: LocalizeText('navigator.roomsettings.wall_thickness.thin') },
                            { value: 0, label: LocalizeText('navigator.roomsettings.wall_thickness.normal') },
                            { value: 1, label: LocalizeText('navigator.roomsettings.wall_thickness.thick') }
                        ]}
                        onChange={(value) => handleChange('wall_thickness', value)}
                    />
                </LosField>
                <LosField label={localizeWithFallback('navigator.roomsettings.floor_thickness', 'Floor thickness')}>
                    <LosSelect
                        value={roomData.floorThickness}
                        disabled={!isHC}
                        options={[
                            { value: -2, label: LocalizeText('navigator.roomsettings.floor_thickness.thinnest') },
                            { value: -1, label: LocalizeText('navigator.roomsettings.floor_thickness.thin') },
                            { value: 0, label: LocalizeText('navigator.roomsettings.floor_thickness.normal') },
                            { value: 1, label: LocalizeText('navigator.roomsettings.floor_thickness.thick') }
                        ]}
                        onChange={(value) => handleChange('floor_thickness', value)}
                    />
                </LosField>
            </div>
            <LosField label={vipCaption('navigator.roomsettings.room_behavior')}>
                <div className="los-ros__list">
                    <LosCheck
                        checked={!roomData.leaveOnDoorTileEnabled}
                        disabled={!isHC}
                        label={vipCaption('navigator.roomsettings.do_not_leave_on_door_tile')}
                        onChange={(checked) => handleChange('leave_on_door_tile_enabled', !checked)}
                    />
                    <LosCheck
                        checked={roomData.idleSleepEnabled}
                        disabled={!isHC}
                        label={vipCaption('navigator.roomsettings.idle_sleep')}
                        onChange={(checked) => handleChange('idle_sleep_enabled', checked)}
                    />
                </div>
            </LosField>
            <LosField error={sleepError ? vipCaption(inputError.key) : undefined}>
                <div className="los-ros__timeout">
                    <input
                        className="los-input"
                        aria-invalid={!!sleepError}
                        disabled={!isHC || !roomData.idleSleepEnabled}
                        inputMode="numeric"
                        maxLength={5}
                        value={idleSleepTimeoutSeconds}
                        onBlur={(event) => handleChange('idle_sleep_timeout_seconds', event.currentTarget.value)}
                        onChange={(event) => handleDraftChange('idle_sleep_timeout_seconds', event.target.value.replace(/\D/g, ''))}
                    />
                    <span>{vipCaption('navigator.roomsettings.timeout.seconds')}</span>
                </div>
            </LosField>
            <LosCheck
                checked={roomData.idleAutokickEnabled}
                disabled={!isHC}
                label={vipCaption('navigator.roomsettings.idle_autokick')}
                onChange={(checked) => handleChange('idle_autokick_enabled', checked)}
            />
            <LosField error={autokickError ? vipCaption(inputError.key) : undefined}>
                <div className="los-ros__timeout">
                    <input
                        className="los-input"
                        aria-invalid={!!autokickError}
                        disabled={!isHC || !roomData.idleAutokickEnabled}
                        inputMode="numeric"
                        maxLength={5}
                        value={idleAutokickTimeoutSeconds}
                        onBlur={(event) => handleChange('idle_autokick_timeout_seconds', event.currentTarget.value)}
                        onChange={(event) => handleDraftChange('idle_autokick_timeout_seconds', event.target.value.replace(/\D/g, ''))}
                    />
                    <span>{vipCaption('navigator.roomsettings.timeout.seconds')}</span>
                </div>
            </LosField>
            <LosField label={vipCaption('navigator.roomsettings.chat.flood_sensitivity')}>
                <LosSelect
                    value={roomData.chatSettings.protection}
                    disabled={!isHC}
                    options={[
                        { value: RoomChatSettings.FLOOD_FILTER_STRICT, label: LocalizeText('navigator.roomsettings.chat.flood.strict') },
                        { value: RoomChatSettings.FLOOD_FILTER_NORMAL, label: LocalizeText('navigator.roomsettings.chat.flood.normal') },
                        { value: RoomChatSettings.FLOOD_FILTER_LOOSE, label: LocalizeText('navigator.roomsettings.chat.flood.loose') }
                    ]}
                    onChange={(value) => handleChange('flood_protection', value)}
                />
            </LosField>
        </div>
    );
};
