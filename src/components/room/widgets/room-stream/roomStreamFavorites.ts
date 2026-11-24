export interface FavoriteSong {
    url: string;
    kind: 'stream' | 'soundcloud' | 'youtube';
    title: string;
    artist: string;
}

const FAVORITES_KEY = 'room-stream-favorites';
const MAX_FAVORITES = 50;

const isFavoriteSong = (value: unknown): value is FavoriteSong => {
    const song = value as FavoriteSong;

    return (
        !!song &&
        typeof song.url === 'string' &&
        typeof song.title === 'string' &&
        typeof song.artist === 'string' &&
        (song.kind === 'stream' || song.kind === 'soundcloud' || song.kind === 'youtube')
    );
};

export const readFavorites = (): FavoriteSong[] => {
    try {
        const saved = JSON.parse(window.localStorage.getItem(FAVORITES_KEY) ?? '[]');

        return Array.isArray(saved) ? saved.filter(isFavoriteSong).slice(0, MAX_FAVORITES) : [];
    } catch {
        return [];
    }
};

export const saveFavorites = (favorites: FavoriteSong[]) => {
    try {
        window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    } catch {
        // The favorites just are not remembered.
    }
};

export const isFavorite = (favorites: FavoriteSong[], url: string) => favorites.some((song) => song.url === url);

// The newest favorite comes first, and the oldest ones drop off at the limit.
export const toggleFavorite = (favorites: FavoriteSong[], song: FavoriteSong): FavoriteSong[] =>
    isFavorite(favorites, song.url) ? favorites.filter((entry) => entry.url !== song.url) : [song, ...favorites].slice(0, MAX_FAVORITES);

// Only web links open from the list, so a stored link can never run script.
export const safeLink = (url: string): string | null => {
    try {
        const parsed = new URL(url);

        return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : null;
    } catch {
        return null;
    }
};
