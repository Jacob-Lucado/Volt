import { GetRoomEngine, GetYoutubeDisplayStatusMessageComposer, RoomObjectCategory, YoutubeDisplayVideoMessageEvent } from '@volt/renderer';
import { FC, useEffect, useRef, useState } from 'react';
import { AddAnimationTickerCallback, GetRoomObjectBounds, SendMessageComposer } from '../../../../api';
import { useMessageEvent, useRoom } from '../../../../hooks';
import { getRoomStreamPosition, RoomStreamPlayback, useRoomStreamPlayback } from '../room-stream/roomStreamPlayback';
import './VideoScreenWidgetView.css';

const SCREEN_CLASS = 'ads_videoplayer';
const FOLLOW_MUSIC = '@music';
const VOLUME_KEY = 'room-stream-volume';
const SCAN_MS = 1000;
const DRIFT_SECONDS = 6;

// The glass of the furni, as a share of its picture.
const INSET = { left: 0.018, right: 0.018, top: 0.035, bottom: 0.04 };

const readVolume = () => {
    try {
        const stored = Number(window.localStorage.getItem(VOLUME_KEY));

        return Number.isFinite(stored) && window.localStorage.getItem(VOLUME_KEY) !== null ? Math.min(100, Math.max(0, stored)) : 50;
    } catch {
        return 50;
    }
};

const embed = (videoId: string, options: { muted: boolean; start?: number }) =>
    `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=0&disablekb=1&fs=0&modestbranding=1&rel=0&playsinline=1&loop=1&playlist=${videoId}&enablejsapi=1${
        options.muted ? '&mute=1' : ''
    }${options.start ? `&start=${Math.floor(options.start)}` : ''}&origin=${encodeURIComponent(window.location.origin)}`;

const youTubeVideoId = (url: string): string | null => {
    try {
        return new URL(url).searchParams.get('v');
    } catch {
        return null;
    }
};

/** One screen: it follows the furni on the room's animation clock and shows its own video or the room music. */
const VideoScreenView: FC<{ roomId: number; objectId: number; value: string; music: RoomStreamPlayback | null }> = ({ roomId, objectId, value, music }) => {
    const boxRef = useRef<HTMLDivElement>(null);
    const frameRef = useRef<HTMLIFrameElement>(null);
    const [startAt, setStartAt] = useState(0);

    const followMusic = value === FOLLOW_MUSIC;
    const musicVideoId = followMusic && music?.kind === 'youtube' ? youTubeVideoId(music.url) : null;
    const videoId = followMusic ? musicVideoId : value || null;
    const frameKey = `${videoId}|${followMusic ? music?.url : ''}`;

    const startAtRef = useRef(0);
    const startedAtRef = useRef(Date.now());

    // A screen that follows the music starts where the song is now and checks now and then that it has not drifted.
    useEffect(() => {
        if (!musicVideoId) return;

        const begin = (seconds: number) => {
            startAtRef.current = seconds;
            startedAtRef.current = Date.now();
            setStartAt(seconds);
        };

        begin(getRoomStreamPosition());

        const timer = window.setInterval(() => {
            if (music?.paused) return;

            const now = getRoomStreamPosition();
            const played = startAtRef.current + (Date.now() - startedAtRef.current) / 1000;

            if (Math.abs(played - now) > DRIFT_SECONDS) begin(now);
        }, 3000);

        return () => window.clearInterval(timer);
    }, [musicVideoId, music?.url, music?.paused]);

    useEffect(() => {
        const update = () => {
            const box = boxRef.current;
            const container = box?.parentElement;
            const bounds = GetRoomObjectBounds(roomId, objectId, RoomObjectCategory.FLOOR, 1);

            if (!box || !container || !bounds) {
                if (box) box.style.visibility = 'hidden';

                return;
            }

            const inView = bounds.left + bounds.width >= 0 && bounds.left <= container.clientWidth && bounds.top + bounds.height >= 0 && bounds.top <= container.clientHeight;

            box.style.visibility = inView ? 'visible' : 'hidden';
            box.style.left = `${bounds.left + bounds.width * INSET.left}px`;
            box.style.top = `${bounds.top + bounds.height * INSET.top}px`;
            box.style.width = `${bounds.width * (1 - INSET.left - INSET.right)}px`;
            box.style.height = `${bounds.height * (1 - INSET.top - INSET.bottom)}px`;
        };

        update();

        return AddAnimationTickerCallback(update);
    }, [roomId, objectId]);

    // The embedded player takes its volume by message, so the screen plays at the room music volume.
    const onLoad = () => {
        if (followMusic) return;

        const volume = readVolume();
        const send = (func: string, args: unknown[]) => frameRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), '*');

        send('setVolume', [volume]);
        send(volume === 0 ? 'mute' : 'unMute', []);
    };

    let content = null;

    if (videoId) {
        content = (
            <iframe
                key={frameKey}
                ref={frameRef}
                allow="autoplay; encrypted-media"
                src={embed(videoId, { muted: followMusic, start: followMusic ? startAt : 0 })}
                title="Video screen"
                onLoad={onLoad}
            />
        );
    } else if (followMusic && music) {
        content = (
            <div className="volt-video-screen__card">
                {music.artwork && <div className="volt-video-screen__art" style={{ backgroundImage: `url("${music.artwork}")` }} />}
                <div className="volt-video-screen__title">{music.title}</div>
                {music.artist && <div className="volt-video-screen__artist">{music.artist}</div>}
            </div>
        );
    }

    return (
        <div ref={boxRef} className={`volt-video-screen${content && !videoId ? ' volt-video-screen--card' : ''}`} style={{ visibility: 'hidden' }}>
            {content}
        </div>
    );
};

const VideoScreenLayerView: FC<{ roomId: number }> = ({ roomId }) => {
    const [screens, setScreens] = useState<Record<number, string>>({});
    const askedRef = useRef(new Set<number>());
    const music = useRoomStreamPlayback();

    useMessageEvent<YoutubeDisplayVideoMessageEvent>(YoutubeDisplayVideoMessageEvent, (event) => {
        const parser = event.getParser();

        setScreens((current) => (parser.furniId in current || askedRef.current.has(parser.furniId) ? { ...current, [parser.furniId]: parser.videoId } : current));
    });

    // Every Video Screen in the room asks the server once what it shows, and one that is picked up is forgotten.
    useEffect(() => {
        const scan = () => {
            const ids = new Set<number>();

            for (const object of GetRoomEngine().getRoomObjects(roomId, RoomObjectCategory.FLOOR) ?? []) {
                if (object?.type === SCREEN_CLASS && object.id >= 0) ids.add(object.id);
            }

            for (const id of ids) {
                if (askedRef.current.has(id)) continue;

                askedRef.current.add(id);
                SendMessageComposer(new GetYoutubeDisplayStatusMessageComposer(id));
            }

            for (const id of [...askedRef.current]) {
                if (ids.has(id)) continue;

                askedRef.current.delete(id);
                setScreens((current) => {
                    const { [id]: _gone, ...rest } = current;

                    return rest;
                });
            }
        };

        scan();

        const timer = window.setInterval(scan, SCAN_MS);

        return () => window.clearInterval(timer);
    }, [roomId]);

    return (
        <div className="volt-video-screen-layer" data-testid="video-screen-layer">
            {Object.entries(screens).map(([id, value]) => (
                <VideoScreenView key={id} music={music} objectId={Number(id)} roomId={roomId} value={value} />
            ))}
        </div>
    );
};

/** Draws a video on every Video Screen furni in the room. Keyed by room so a new room starts clean. */
export const VideoScreenWidgetView: FC<{}> = () => {
    const { roomSession = null } = useRoom();

    if (!roomSession) return null;

    return <VideoScreenLayerView key={roomSession.roomId} roomId={roomSession.roomId} />;
};
