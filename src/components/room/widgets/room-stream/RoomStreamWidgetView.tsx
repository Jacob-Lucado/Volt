import { FC, useEffect, useRef, useState } from 'react';
import { useRoomStreamWidget } from '../../../../hooks';
import './RoomStreamWidgetView.css';

const VOLUME_KEY = 'room-stream-volume';
const SOUNDCLOUD_API = 'https://w.soundcloud.com/player/api.js';

interface ISoundCloudWidget {
    bind: (event: string, callback: () => void) => void;
    play: () => void;
    pause: () => void;
    setVolume: (volume: number) => void;
}

declare global {
    interface Window {
        SC?: { Widget: ((iframe: HTMLIFrameElement) => ISoundCloudWidget) & { Events: { READY: string } } };
    }
}

const readVolume = (): number => {
    try {
        const saved = Number(window.localStorage.getItem(VOLUME_KEY));

        return Number.isFinite(saved) && saved > 0 && saved <= 100 ? saved : 60;
    } catch {
        return 60;
    }
};

const saveVolume = (volume: number) => {
    try {
        window.localStorage.setItem(VOLUME_KEY, String(volume));
    } catch {
        // The volume just is not remembered.
    }
};

let soundCloudApi: Promise<void> = null;

const loadSoundCloudApi = (): Promise<void> => {
    if (window.SC) return Promise.resolve();

    soundCloudApi ??= new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');

        script.src = SOUNDCLOUD_API;
        script.onload = () => resolve();
        script.onerror = () => {
            soundCloudApi = null;
            reject(new Error('The SoundCloud player could not be loaded.'));
        };
        document.head.appendChild(script);
    });

    return soundCloudApi;
};

const soundCloudSource = (url: string) =>
    `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=true&visual=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false`;

const hostOf = (url: string) => {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return url;
    }
};

export const RoomStreamWidgetView: FC<{}> = () => {
    const { stream = null } = useRoomStreamWidget();
    const [volume, setVolume] = useState<number>(readVolume);
    const [paused, setPaused] = useState(false);
    const [blocked, setBlocked] = useState(false);
    const [closedUrl, setClosedUrl] = useState<string>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const frameRef = useRef<HTMLIFrameElement>(null);
    const widgetRef = useRef<ISoundCloudWidget>(null);
    const url = stream?.url ?? null;
    const kind = stream?.kind ?? null;

    // A new link starts playing again, even when the person closed the last one.
    useEffect(() => {
        setPaused(false);
        setBlocked(false);
        setClosedUrl(null);
        widgetRef.current = null;
    }, [url]);

    useEffect(() => {
        if (audioRef.current) audioRef.current.volume = volume / 100;

        widgetRef.current?.setVolume(volume);
    }, [volume, url]);

    useEffect(() => {
        const audio = audioRef.current;

        if (!audio) return;

        if (paused) {
            audio.pause();

            return;
        }

        audio.play().then(() => setBlocked(false)).catch(() => setBlocked(true));
    }, [paused, url]);

    useEffect(() => {
        if (kind !== 'soundcloud' || !frameRef.current) return;

        let active = true;

        loadSoundCloudApi()
            .then(() => {
                if (!active || !frameRef.current || !window.SC) return;

                const widget = window.SC.Widget(frameRef.current);

                widget.bind(window.SC.Widget.Events.READY, () => {
                    widgetRef.current = widget;
                    widget.setVolume(readVolume());
                });
            })
            .catch(() => undefined);

        return () => {
            active = false;
        };
    }, [kind, url]);

    useEffect(() => {
        if (paused) widgetRef.current?.pause();
        else widgetRef.current?.play();
    }, [paused]);

    if (!stream || closedUrl === stream.url) return null;

    const changeVolume = (value: number) => {
        setVolume(value);
        saveVolume(value);
    };

    return (
        <div className="room-stream" role="region" aria-label="Room music">
            <span className="room-stream-icon" aria-hidden="true">
                ♪
            </span>
            <div className="room-stream-text">
                <span className="room-stream-title">{stream.kind === 'soundcloud' ? 'SoundCloud' : hostOf(stream.url)}</span>
                <span className="room-stream-by">{blocked ? 'Press play to listen' : `Started by ${stream.setBy}`}</span>
            </div>
            <button
                aria-label={paused || blocked ? 'Play the room music' : 'Pause the room music'}
                className="room-stream-button"
                type="button"
                onClick={() => setPaused((value) => (blocked ? false : !value))}
            >
                {paused || blocked ? '▶' : '❚❚'}
            </button>
            <input
                aria-label="Room music volume"
                className="room-stream-volume"
                max={100}
                min={0}
                type="range"
                value={volume}
                onChange={(event) => changeVolume(Number(event.target.value))}
            />
            <button aria-label="Turn the room music off for me" className="room-stream-button" type="button" onClick={() => setClosedUrl(stream.url)}>
                ✕
            </button>
            {stream.kind === 'stream' && closedUrl !== stream.url && <audio key={stream.url} ref={audioRef} loop={false} preload="none" src={stream.url} />}
            {stream.kind === 'soundcloud' && (
                <iframe
                    key={stream.url}
                    ref={frameRef}
                    allow="autoplay"
                    className="room-stream-frame"
                    src={soundCloudSource(stream.url)}
                    title="SoundCloud"
                />
            )}
        </div>
    );
};
