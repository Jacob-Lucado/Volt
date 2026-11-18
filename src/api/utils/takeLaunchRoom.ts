/** Reads the room id the website put in the client address (`?room=123`) and removes it, so a reload does not enter the room again. */
export const takeLaunchRoom = (): number => {
    try {
        const url = new URL(window.location.href);
        const raw = url.searchParams.get('room') ?? '';

        if (url.searchParams.has('room')) {
            url.searchParams.delete('room');
            window.history.replaceState(window.history.state, '', url.toString());
        }

        return /^\d{1,9}$/.test(raw) ? Number.parseInt(raw, 10) : 0;
    } catch {
        return 0;
    }
};
