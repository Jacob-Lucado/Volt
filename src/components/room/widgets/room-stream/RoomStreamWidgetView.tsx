import { CSSProperties, FC, useEffect, useRef, useState } from 'react';
import { useRoomStreamWidget } from '../../../../hooks';
import './RoomStreamWidgetView.css';

const VOLUME_KEY = 'room-stream-volume';
const VIDEO_WIDTH_KEY = 'room-stream-video-width';
const CARD_WIDTH = 360;
const MIN_VIDEO_WIDTH = 240;
const MAX_VIDEO_WIDTH = 800;
const SOUNDCLOUD_API = 'https://w.soundcloud.com/player/api.js';
const YOUTUBE_API = 'https://www.youtube.com/iframe_api';
const GENERIC_NAMES = ['live', 'stream', 'radio', 'listen', 'audio', 'play', 'music', 'index'];

interface SoundCloudSound {
    title?: string;
    duration?: number;
    artwork_url?: string | null;
    user?: { username?: string; avatar_url?: string | null };
}

interface ISoundCloudWidget {
    bind: (event: string, callback: (data?: { currentPosition?: number }) => void) => void;
    play: () => void;
    pause: () => void;
    setVolume: (volume: number) => void;
    seekTo: (milliseconds: number) => void;
    getCurrentSound: (callback: (sound: SoundCloudSound | null) => void) => void;
}

interface IYouTubePlayer {
    playVideo: () => void;
    pauseVideo: () => void;
    setVolume: (volume: number) => void;
    seekTo: (seconds: number, allowSeekAhead: boolean) => void;
    getCurrentTime: () => number;
    getDuration: () => number;
    getPlayerState: () => number;
    getVideoData: () => { title?: string; author?: string };
    destroy: () => void;
}

interface YouTubePlayerOptions {
    width: string;
    height: string;
    videoId: string;
    playerVars: Record<string, string | number>;
    events: {
        onReady: () => void;
        onStateChange: () => void;
        onAutoplayBlocked: () => void;
    };
}

interface TrackInfo {
    title: string;
    artist: string;
    artwork: string | null;
}

declare global {
    interface Window {
        YT?: {
            Player: new (element: HTMLElement, options: YouTubePlayerOptions) => IYouTubePlayer;
        };
        onYouTubeIframeAPIReady?: () => void;
        SC?: {
            Widget: ((iframe: HTMLIFrameElement) => ISoundCloudWidget) & {
                Events: { READY: string; PLAY: string; PLAY_PROGRESS: string };
            };
        };
    }
}

const clampVideoWidth = (width: number) => Math.round(Math.min(Math.max(width, MIN_VIDEO_WIDTH), Math.min(MAX_VIDEO_WIDTH, window.innerWidth - 24)));

const readVideoWidth = (): number =>
{
    try
    {
        const saved = Number(window.localStorage.getItem(VIDEO_WIDTH_KEY));

        return Number.isFinite(saved) && saved > 0 ? clampVideoWidth(saved) : CARD_WIDTH;
    }
    catch
    {
        return CARD_WIDTH;
    }
};

const saveVideoWidth = (width: number) =>
{
    try
    {
        window.localStorage.setItem(VIDEO_WIDTH_KEY, String(width));
    }
    catch
    {
        // The size just is not remembered.
    }
};

const readVolume = (): number =>
{
    try
    {
        const saved = Number(window.localStorage.getItem(VOLUME_KEY));

        return Number.isFinite(saved) && saved > 0 && saved <= 100 ? saved : 60;
    }
    catch
    {
        return 60;
    }
};

const saveVolume = (volume: number) =>
{
    try
    {
        window.localStorage.setItem(VOLUME_KEY, String(volume));
    }
    catch
    {
        // The volume just is not remembered.
    }
};

let soundCloudApi: Promise<void> = null;

const loadSoundCloudApi = (): Promise<void> =>
{
    if (window.SC) return Promise.resolve();

    soundCloudApi ??= new Promise<void>((resolve, reject) =>
    {
        const script = document.createElement('script');

        script.src = SOUNDCLOUD_API;
        script.onload = () => resolve();
        script.onerror = () =>
        {
            soundCloudApi = null;
            reject(new Error('The SoundCloud player could not be loaded.'));
        };
        document.head.appendChild(script);
    });

    return soundCloudApi;
};

let youTubeApi: Promise<void> = null;

const loadYouTubeApi = (): Promise<void> =>
{
    if (window.YT?.Player) return Promise.resolve();

    youTubeApi ??= new Promise<void>((resolve, reject) =>
    {
        const previous = window.onYouTubeIframeAPIReady;
        const script = document.createElement('script');

        window.onYouTubeIframeAPIReady = () =>
        {
            previous?.();
            resolve();
        };
        script.src = YOUTUBE_API;
        script.onerror = () =>
        {
            youTubeApi = null;
            reject(new Error('The YouTube player could not be loaded.'));
        };
        document.head.appendChild(script);
    });

    return youTubeApi;
};

const youTubeVideoId = (url: string): string | null =>
{
    try
    {
        return new URL(url).searchParams.get('v');
    }
    catch
    {
        return null;
    }
};

const soundCloudSource = (url: string) =>
    `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=true&visual=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false`;

const hostOf = (url: string) =>
{
    try
    {
        return new URL(url).hostname.replace(/^www\./, '');
    }
    catch
    {
        return url;
    }
};

const streamTrack = (url: string): TrackInfo =>
{
    const host = hostOf(url);

    try
    {
        const segment = decodeURIComponent(new URL(url).pathname.split('/').filter(Boolean).pop() ?? '');
        const name = segment
            .replace(/\.[a-z0-9]{2,4}$/i, '')
            .replace(/[-_]+/g, ' ')
            .trim();

        if (name.length > 0 && !GENERIC_NAMES.includes(name.toLowerCase())) return { title: name, artist: host, artwork: null };
    }
    catch
    {
        // The host alone is shown.
    }

    return { title: host, artist: 'Web audio stream', artwork: null };
};

const biggerArtwork = (url: string | null | undefined) => (url ? url.replace('-large.', '-t200x200.') : null);

const formatTime = (seconds: number) =>
{
    const total = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const rest = String(total % 60).padStart(2, '0');

    return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${rest}` : `${minutes}:${rest}`;
};

const NoteIcon: FC<{}> = () => (
    <svg aria-hidden="true" fill="currentColor" height="22" viewBox="0 0 24 24" width="22">
        <path d="M9 3v11.3A3.5 3.5 0 1 0 11 17.5V8h6V3H9z" />
    </svg>
);

const PlayIcon: FC<{}> = () => (
    <svg aria-hidden="true" fill="currentColor" height="14" viewBox="0 0 24 24" width="14">
        <path d="M7 4.5v15l13-7.5-13-7.5z" />
    </svg>
);

const PauseIcon: FC<{}> = () => (
    <svg aria-hidden="true" fill="currentColor" height="14" viewBox="0 0 24 24" width="14">
        <path d="M6 4h4.5v16H6zM13.5 4H18v16h-4.5z" />
    </svg>
);

const CloseIcon: FC<{}> = () => (
    <svg aria-hidden="true" fill="none" height="12" stroke="currentColor" strokeLinecap="round" strokeWidth="2.4" viewBox="0 0 24 24" width="12">
        <path d="M5 5l14 14M19 5L5 19" />
    </svg>
);

const VideoIcon: FC<{}> = () => (
    <svg aria-hidden="true" fill="currentColor" height="12" viewBox="0 0 24 24" width="12">
        <path d="M3 6.5A2.5 2.5 0 0 1 5.5 4h9A2.5 2.5 0 0 1 17 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 3 17.5v-11zM18.5 9.5 22 7v10l-3.5-2.5v-5z" />
    </svg>
);

const VolumeIcon: FC<{ level: number }> = ({ level }) => (
    <svg aria-hidden="true" fill="currentColor" height="14" viewBox="0 0 24 24" width="14">
        <path d="M3 9.5v5h4l5 4.5V5L7 9.5H3z" />
        {level > 0 && <path d="M15 9a4 4 0 0 1 0 6" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />}
        {level > 50 && <path d="M17.5 6.5a8 8 0 0 1 0 11" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />}
    </svg>
);

export const RoomStreamWidgetView: FC<{}> = () =>
{
    const { stream = null } = useRoomStreamWidget();
    const [volume, setVolume] = useState<number>(readVolume);
    const [paused, setPaused] = useState(false);
    const [blocked, setBlocked] = useState(false);
    const [closedUrl, setClosedUrl] = useState<string>(null);
    const [track, setTrack] = useState<TrackInfo>(null);
    const [position, setPosition] = useState(0);
    const [duration, setDuration] = useState<number>(null);
    const [ready, setReady] = useState(false);
    const [showVideo, setShowVideo] = useState(false);
    const [videoWidth, setVideoWidth] = useState<number>(readVideoWidth);
    const resizeRef = useRef<{ startX: number; startWidth: number }>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const frameRef = useRef<HTMLIFrameElement>(null);
    const widgetRef = useRef<ISoundCloudWidget>(null);
    const videoHostRef = useRef<HTMLDivElement>(null);
    const youTubeRef = useRef<IYouTubePlayer>(null);
    const url = stream?.url ?? null;
    const kind = stream?.kind ?? null;

    // A new link starts playing again, even when the person closed the last one.
    useEffect(() =>
    {
        setPaused(false);
        setBlocked(false);
        setClosedUrl(null);
        setPosition(0);
        setDuration(null);
        setReady(false);
        setShowVideo(false);
        setTrack(url && kind === 'stream' ? streamTrack(url) : null);
        widgetRef.current = null;
        youTubeRef.current = null;
    }, [url, kind]);

    useEffect(() =>
    {
        if (audioRef.current) audioRef.current.volume = volume / 100;

        widgetRef.current?.setVolume(volume);
        youTubeRef.current?.setVolume(volume);
    }, [volume, url]);

    useEffect(() =>
    {
        const audio = audioRef.current;

        if (!audio) return;

        if (paused)
        {
            audio.pause();

            return;
        }

        audio
            .play()
            .then(() => setBlocked(false))
            .catch(() => setBlocked(true));
    }, [paused, url]);

    useEffect(() =>
    {
        if (kind !== 'soundcloud' || !frameRef.current) return;

        let active = true;

        loadSoundCloudApi()
            .then(() =>
            {
                if (!active || !frameRef.current || !window.SC) return;

                const widget = window.SC.Widget(frameRef.current);
                const { Events } = window.SC.Widget;

                const loadSound = () =>
                    widget.getCurrentSound((sound) =>
                    {
                        if (!active || !sound) return;

                        setTrack({
                            title: sound.title || 'SoundCloud track',
                            artist: sound.user?.username ?? '',
                            artwork: biggerArtwork(sound.artwork_url ?? sound.user?.avatar_url)
                        });
                        setDuration(sound.duration && sound.duration > 0 ? sound.duration / 1000 : null);
                        setReady(true);
                    });

                widget.bind(Events.READY, () =>
                {
                    widgetRef.current = widget;
                    widget.setVolume(readVolume());
                    loadSound();
                });
                widget.bind(Events.PLAY, loadSound);
                widget.bind(Events.PLAY_PROGRESS, (data) =>
                {
                    const seconds = Math.floor((data?.currentPosition ?? 0) / 1000);

                    setPosition((current) => (current === seconds ? current : seconds));
                });
            })
            .catch(() => undefined);

        return () =>
        {
            active = false;
        };
    }, [kind, url]);

    useEffect(() =>
    {
        const videoId = kind === 'youtube' && url ? youTubeVideoId(url) : null;
        const host = videoHostRef.current;

        if (!videoId || !host) return;

        let active = true;
        let player: IYouTubePlayer = null;
        let timer = 0;
        const target = document.createElement('div');

        host.appendChild(target);
        setTrack({
            title: 'Loading video...',
            artist: '',
            artwork: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`
        });

        const refresh = () =>
        {
            if (!player || !active) return;

            try
            {
                const data = player.getVideoData();
                const length = player.getDuration();

                setTrack((current) => ({
                    title: data?.title || current?.title || 'YouTube video',
                    artist: data?.author ?? '',
                    artwork: current?.artwork ?? null
                }));
                setPosition(Math.floor(player.getCurrentTime() || 0));
                setDuration(length > 0 ? length : null);
                setReady(true);

                if (player.getPlayerState() === 1) setBlocked(false);
            }
            catch
            {
                // The player is not ready to answer yet.
            }
        };

        loadYouTubeApi()
            .then(() =>
            {
                if (!active || !window.YT) return;

                player = new window.YT.Player(target, {
                    width: '100%',
                    height: '100%',
                    videoId,
                    playerVars: {
                        autoplay: 1,
                        playsinline: 1,
                        rel: 0,
                        modestbranding: 1,
                        origin: window.location.origin
                    },
                    events: {
                        onReady: () =>
                        {
                            youTubeRef.current = player;
                            player.setVolume(readVolume());
                            refresh();
                        },
                        onStateChange: refresh,
                        onAutoplayBlocked: () => setBlocked(true)
                    }
                });
                timer = window.setInterval(refresh, 500);
            })
            .catch(() => undefined);

        return () =>
        {
            active = false;
            window.clearInterval(timer);
            youTubeRef.current = null;

            try
            {
                player?.destroy();
            }
            catch
            {
                // The frame is already gone.
            }

            host.replaceChildren();
        };
    }, [kind, url]);

    useEffect(() =>
    {
        if (paused)
        {
            widgetRef.current?.pause();
            youTubeRef.current?.pauseVideo();
        }
        else
        {
            widgetRef.current?.play();
            youTubeRef.current?.playVideo();
        }
    }, [paused]);

    if (!stream || closedUrl === stream.url) return null;

    const changeVolume = (value: number) =>
    {
        setVolume(value);
        saveVolume(value);
    };

    const seek = (seconds: number) =>
    {
        setPosition(seconds);

        if (audioRef.current) audioRef.current.currentTime = seconds;

        widgetRef.current?.seekTo(seconds * 1000);
        youTubeRef.current?.seekTo(seconds, true);
    };

    const togglePlay = () =>
    {
        if (!blocked)
        {
            setPaused((value) => !value);

            return;
        }

        setPaused(false);
        setBlocked(false);
        widgetRef.current?.play();
        youTubeRef.current?.playVideo();
        audioRef.current?.play().catch(() => setBlocked(true));
    };

    const syncAudio = () =>
    {
        const audio = audioRef.current;

        if (!audio) return;

        setPosition(Math.floor(audio.currentTime));
        setDuration(Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : null);
    };

    const isSoundCloud = stream.kind === 'soundcloud';
    const isYouTube = stream.kind === 'youtube';
    const live = !isSoundCloud && ready && duration === null;
    const playing = !paused && !blocked;
    const progress = duration ? Math.min(100, (position / duration) * 100) : 0;
    const title = track?.title ?? (isSoundCloud ? 'Loading track...' : isYouTube ? 'Loading video...' : hostOf(stream.url));
    const artist = track?.artist ?? '';
    const label = live ? 'Live' : isSoundCloud ? 'SoundCloud' : isYouTube ? 'YouTube' : 'Now playing';

    return (
        <div className="room-stream" role="region" aria-label="Room music" style={{ '--stream-width': `${showVideo && isYouTube ? Math.max(CARD_WIDTH, videoWidth) : CARD_WIDTH}px` } as CSSProperties}>
            <div className="room-stream-card">
                <div className={`room-stream-art${playing ? ' is-playing' : ''}`}>
                    {track?.artwork ? (
                        <img alt="" className="room-stream-art-image" src={track.artwork} />
                    ) : (
                        <span className="room-stream-art-icon">
                            <NoteIcon />
                        </span>
                    )}
                    <span aria-hidden="true" className="room-stream-eq">
                        <i />
                        <i />
                        <i />
                    </span>
                </div>
                <div className="room-stream-body">
                    <div className="room-stream-heading">
                        <span className="room-stream-label">
                            {live && <span className="room-stream-dot" />}
                            {label}
                        </span>
                        <span className="room-stream-by">{blocked ? 'Press play to listen' : `Started by ${stream.setBy}`}</span>
                    </div>
                    <span className="room-stream-title" title={title}>
                        {title}
                    </span>
                    {!!artist && <span className="room-stream-artist">{artist}</span>}
                    <div className="room-stream-progress">
                        <button
                            aria-label={paused || blocked ? 'Play the room music' : 'Pause the room music'}
                            className="room-stream-play"
                            type="button"
                            onClick={togglePlay}
                        >
                            {paused || blocked ? <PlayIcon /> : <PauseIcon />}
                        </button>
                        <span className="room-stream-time">{formatTime(position)}</span>
                        {duration ? (
                            <input
                                aria-label="Song position"
                                className="room-stream-seek"
                                max={Math.floor(duration)}
                                min={0}
                                style={
                                    {
                                        '--progress': `${progress}%`
                                    } as CSSProperties
                                }
                                type="range"
                                value={Math.min(position, Math.floor(duration))}
                                onChange={(event) => seek(Number(event.target.value))}
                            />
                        ) : (
                            <span className={`room-stream-seek-empty${live ? ' is-live' : ''}`} />
                        )}
                        <span className="room-stream-time">{duration ? formatTime(duration) : live ? 'Live' : '--:--'}</span>
                    </div>
                    <div className="room-stream-volume-row">
                        <VolumeIcon level={volume} />
                        <input
                            aria-label="Room music volume"
                            className="room-stream-volume"
                            max={100}
                            min={0}
                            style={{ '--progress': `${volume}%` } as CSSProperties}
                            type="range"
                            value={volume}
                            onChange={(event) => changeVolume(Number(event.target.value))}
                        />
                        {isYouTube && (
                            <button aria-pressed={showVideo} className="room-stream-video-toggle" type="button" onClick={() => setShowVideo((value) => !value)}>
                                <VideoIcon />
                                {showVideo ? 'Hide video' : 'Show video'}
                            </button>
                        )}
                    </div>
                </div>
                <button aria-label="Turn the room music off for me" className="room-stream-close" type="button" onClick={() => setClosedUrl(stream.url)}>
                    <CloseIcon />
                </button>
                {stream.kind === 'stream' && (
                    <audio
                        key={stream.url}
                        ref={audioRef}
                        loop={false}
                        preload="none"
                        src={stream.url}
                        onDurationChange={syncAudio}
                        onLoadedMetadata={() =>
                        {
                            syncAudio();
                            setReady(true);
                        }}
                        onTimeUpdate={syncAudio}
                    />
                )}
                {isSoundCloud && (
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
            {isYouTube && (
                <div className={`room-stream-video${showVideo ? '' : ' is-hidden'}`} style={{ width: videoWidth }}>
                    <div ref={videoHostRef} className="room-stream-video-host" />
                    {showVideo && (
                        <button
                            aria-label="Resize the video"
                            className="room-stream-resize"
                            title="Drag to resize"
                            type="button"
                            onKeyDown={(event) =>
                            {
                                const step = event.key === 'ArrowRight' || event.key === 'ArrowUp' ? 20 : event.key === 'ArrowLeft' || event.key === 'ArrowDown' ? -20 : 0;

                                if (!step) return;

                                event.preventDefault();

                                const next = clampVideoWidth(videoWidth + step);

                                setVideoWidth(next);
                                saveVideoWidth(next);
                            }}
                            onPointerDown={(event) =>
                            {
                                event.preventDefault();
                                event.currentTarget.setPointerCapture(event.pointerId);
                                resizeRef.current = { startX: event.clientX, startWidth: videoWidth };
                            }}
                            onPointerMove={(event) =>
                            {
                                if (!resizeRef.current) return;

                                // The player stays centered, so the width grows by twice the pointer distance.
                                setVideoWidth(clampVideoWidth(resizeRef.current.startWidth + (event.clientX - resizeRef.current.startX) * 2));
                            }}
                            onPointerUp={(event) =>
                            {
                                if (!resizeRef.current) return;

                                resizeRef.current = null;
                                event.currentTarget.releasePointerCapture(event.pointerId);
                                saveVideoWidth(videoWidth);
                            }}
                        />
                    )}
                </div>
            )}
        </div>
    );
};
