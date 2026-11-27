import { GetRoomEngine, RoomObjectCategory, RoomUnitWalkComposer, Vector3d } from '@volt/renderer';
import { FC, PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react';
import {
    AddAnimationTickerCallback,
    aimWalkStick,
    EMPTY_WALK_PLAN,
    IsTouchLayout,
    isFullWalkAim,
    planWalk,
    SendMessageComposer,
    Tile,
    useVoltLayout,
    WalkPlan,
    WalkStickAim
} from '../../../../api';
import blockedCursor from '../../../../assets/images/room/walk-stick/tile-cursor-blocked.png';
import pathCursor from '../../../../assets/images/room/walk-stick/tile-cursor-path.png';
import stopCursor from '../../../../assets/images/room/walk-stick/tile-cursor-stop.png';
import { useRoom } from '../../../../hooks';

const STICK_RADIUS = 60;
const KNOB_TRAVEL = 36;
const RETARGET_MS = 350;
const STUCK_TICKS = 3;
const CANVAS_ID = 1;

type CursorKind = 'path' | 'stop' | 'blocked';

const CURSOR_IMAGES: Record<CursorKind, string> = { path: pathCursor, stop: stopCursor, blocked: blockedCursor };

const sameTile = (a: Tile | null, b: Tile | null) => a?.x === b?.x && a?.y === b?.y;

const cursorsFor = (plan: WalkPlan): { tile: Tile; kind: CursorKind }[] => [
    ...plan.route.map((tile) => ({ tile, kind: 'path' as const })),
    ...(plan.stop ? [{ tile: plan.stop, kind: 'stop' as const }] : []),
    ...(plan.blocked ? [{ tile: plan.blocked, kind: 'blocked' as const }] : [])
];

/** Left-thumb stick: the further the knob, the more tiles; the room previews them with AIR's TileCursor sprites. */
export const WalkStickView: FC<{}> = () => {
    const isTouch = IsTouchLayout(useVoltLayout());
    const { roomSession = null } = useRoom();
    const [aim, setAim] = useState<WalkStickAim | null>(null);
    const [knob, setKnob] = useState({ x: 0, y: 0 });
    const [plan, setPlan] = useState<WalkPlan>(EMPTY_WALK_PLAN);
    const stickRef = useRef<HTMLDivElement>(null);
    const layerRef = useRef<HTMLDivElement>(null);
    const lastSent = useRef<Tile | null>(null);

    const roomId = roomSession?.roomId ?? -1;
    const enabled = isTouch && !!roomSession && !roomSession.isSpectator;

    useEffect(() => {
        if (!enabled) return;

        const avatarTile = (): Tile | null => {
            const location = GetRoomEngine().getRoomObject(roomId, roomSession.ownRoomIndex, RoomObjectCategory.UNIT)?.getLocation();

            return location ? { x: Math.round(location.x), y: Math.round(location.y) } : null;
        };

        const heightMap = GetRoomEngine().getFurnitureStackingHeightMap(roomId);
        const isRoomTile = (tile: Tile) => !!heightMap?.validateLocation(tile.x, tile.y, 1, 1, 0, 0, 0, 0, true);
        const isInsideMap = (tile: Tile | null) => !!tile && !!heightMap && tile.x >= 0 && tile.y >= 0 && tile.x < heightMap.width && tile.y < heightMap.height;

        const replan = () => {
            const origin = avatarTile();

            setPlan((previous) => {
                const planned = origin ? planWalk(origin, aim, isRoomTile) : EMPTY_WALK_PLAN;
                // A blocked tile beyond the map edge would float over the wall; only holes inside the room get the red cursor.
                const next = isInsideMap(planned.blocked) ? planned : { ...planned, blocked: null };

                return sameTile(next.stop, previous.stop) && sameTile(next.blocked, previous.blocked) && next.route.length === previous.route.length
                    ? previous
                    : next;
            });
        };

        replan();

        if (!isFullWalkAim(aim)) return AddAnimationTickerCallback(replan);

        // The client height map can mark a tile walkable that the server refuses (e.g. flush against a wall). A step takes
        // longer than one tick, so only a few ticks on the same tile count as stuck; then aim one tile shorter.
        let previousOrigin: Tile | null = null;
        let stillTicks = 0;
        let shortenBy = 0;

        const keepWalking = window.setInterval(() => {
            const origin = avatarTile();

            if (!origin) return;

            const moved = !sameTile(origin, previousOrigin);

            previousOrigin = origin;
            stillTicks = moved || lastSent.current === null ? 0 : stillTicks + 1;

            const stuck = stillTicks >= STUCK_TICKS;

            if (moved) shortenBy = 0;

            if (stuck) {
                shortenBy++;
                stillTicks = 0;
            }

            const { route, stop } = planWalk(origin, aim, isRoomTile);
            const tiles = stop ? [...route, stop] : [];
            const target = tiles[tiles.length - 1 - shortenBy] ?? null;

            if (!target || (sameTile(target, lastSent.current) && !stuck)) return;

            lastSent.current = target;
            SendMessageComposer(new RoomUnitWalkComposer(target.x, target.y));
        }, RETARGET_MS);

        const stopTicker = AddAnimationTickerCallback(replan);

        return () => {
            window.clearInterval(keepWalking);
            stopTicker();
        };
    }, [enabled, roomId, roomSession, aim]);

    useEffect(() => {
        const layer = layerRef.current;

        if (!layer) return;

        const place = () => {
            const engine = GetRoomEngine();
            const geometry = engine.getRoomInstanceGeometry(roomId, CANVAS_ID);
            const canvas = engine.getRoomInstanceRenderingCanvas(roomId, CANVAS_ID);
            const heightMap = engine.getFurnitureStackingHeightMap(roomId);

            if (!geometry || !canvas) return;

            // Same projection as RoomEngine.getRoomObjectScreenLocation: canvas zoom, centre and scroll offset, mirrored when flipped.
            const zoom = canvas.isFlipped ? -canvas.scale : canvas.scale;
            const originX = (canvas.isFlipped ? -canvas.width : canvas.width) / 2 + canvas.screenOffsetX;
            const originY = (canvas.isFlipped ? -canvas.height : canvas.height) / 2 + canvas.screenOffsetY;
            const spriteScale = Math.abs(zoom) * (geometry.scale / 64);

            for (const element of Array.from(layer.children) as HTMLImageElement[]) {
                const x = Number(element.dataset.x);
                const y = Number(element.dataset.y);
                const point = geometry.getScreenPoint(new Vector3d(x, y, heightMap?.getTileHeight(x, y) ?? 0));

                if (!point) continue;

                element.style.transform = `translate(${Math.round(point.x * zoom + originX)}px, ${Math.round(point.y * zoom + originY)}px) translate(-50%, -50%) scale(${spriteScale})`;
            }
        };

        place();

        return AddAnimationTickerCallback(place);
    }, [roomId, plan]);

    if (!enabled) return null;

    const release = () => {
        const target = plan.stop;

        if (target && !isFullWalkAim(aim)) SendMessageComposer(new RoomUnitWalkComposer(target.x, target.y));

        lastSent.current = null;
        setAim(null);
        setKnob({ x: 0, y: 0 });
    };

    const track = (event: ReactPointerEvent<HTMLDivElement>) => {
        const bounds = stickRef.current.getBoundingClientRect();
        const dx = event.clientX - (bounds.left + bounds.width / 2);
        const dy = event.clientY - (bounds.top + bounds.height / 2);
        const reach = Math.min(Math.hypot(dx, dy), STICK_RADIUS);
        const angle = Math.atan2(dy, dx);

        setKnob({ x: (Math.cos(angle) * reach * KNOB_TRAVEL) / STICK_RADIUS, y: (Math.sin(angle) * reach * KNOB_TRAVEL) / STICK_RADIUS });
        setAim(aimWalkStick(dx, dy, STICK_RADIUS));
    };

    return (
        <>
            <div ref={layerRef} className="volt-walk-path-layer">
                {cursorsFor(plan).map(({ tile, kind }) => (
                    <img key={`${kind}-${tile.x}-${tile.y}`} alt="" draggable={false} src={CURSOR_IMAGES[kind]} data-x={tile.x} data-y={tile.y} />
                ))}
            </div>
            <div
                ref={stickRef}
                className={`volt-walk-stick${aim ? ' is-active' : ''}`}
                onPointerDown={(event) => {
                    event.stopPropagation();
                    event.currentTarget.setPointerCapture(event.pointerId);
                    track(event);
                }}
                onPointerMove={(event) => {
                    if (event.currentTarget.hasPointerCapture(event.pointerId)) track(event);
                }}
                onPointerUp={release}
                onPointerCancel={() => {
                    lastSent.current = null;
                    setAim(null);
                    setKnob({ x: 0, y: 0 });
                }}
            >
                <div className="volt-walk-stick__knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
            </div>
        </>
    );
};
