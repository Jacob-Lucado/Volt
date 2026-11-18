import { GetCommunication, LegacyExternalInterface } from '@volt/renderer';

/** Website tabs listen here so a client opened on its own can still end the website session. */
export const HOTEL_SESSION_CHANNEL = 'hotel-session';

export const LogOut = (): void => {
    GetCommunication().connection.serverDisconnected(0);

    LegacyExternalInterface.call('logout');

    if (window.top !== window || typeof BroadcastChannel === 'undefined') return;

    const channel = new BroadcastChannel(HOTEL_SESSION_CHANNEL);

    channel.postMessage({ type: 'logout-requested' });
    channel.close();
};
