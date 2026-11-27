export interface Tile {
    readonly x: number;
    readonly y: number;
}

/** Screen directions clockwise from "right", as room tile steps. Matches useRoomKeyboardMovement: right is (1,-1), down is (1,1). */
const DIRECTION_STEPS: readonly Tile[] = [
    { x: 1, y: -1 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
    { x: -1, y: 1 },
    { x: -1, y: 0 },
    { x: -1, y: -1 },
    { x: 0, y: -1 }
];

export const WALK_STICK_MAX_STEPS = 6;
const DEAD_ZONE = 0.25;

export interface WalkStickAim {
    readonly step: Tile;
    readonly steps: number;
}

export interface WalkPlan {
    readonly route: readonly Tile[];
    readonly stop: Tile | null;
    readonly blocked: Tile | null;
}

export const EMPTY_WALK_PLAN: WalkPlan = { route: [], stop: null, blocked: null };

/** A drag of (dx, dy) screen pixels on a stick of the given radius. Null inside the dead zone, which cancels. */
export const aimWalkStick = (dx: number, dy: number, radius: number): WalkStickAim | null => {
    const distance = Math.min(Math.hypot(dx, dy) / radius, 1);

    if (distance < DEAD_ZONE) return null;

    const sector = (Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) + 8) % 8;
    const steps = Math.max(1, Math.ceil(((distance - DEAD_ZONE) / (1 - DEAD_ZONE)) * WALK_STICK_MAX_STEPS));

    return { step: DIRECTION_STEPS[sector], steps };
};

export const isFullWalkAim = (aim: WalkStickAim | null) => aim?.steps === WALK_STICK_MAX_STEPS;

/** Tiles from origin along the aim, stopping at the first tile that is not part of the room. */
export const planWalk = (origin: Tile, aim: WalkStickAim | null, isRoomTile: (tile: Tile) => boolean): WalkPlan => {
    if (!aim) return EMPTY_WALK_PLAN;

    const tiles: Tile[] = [];

    for (let i = 1; i <= aim.steps; i++) {
        const tile = { x: origin.x + aim.step.x * i, y: origin.y + aim.step.y * i };

        if (!isRoomTile(tile)) return { route: tiles.slice(0, -1), stop: tiles.at(-1) ?? null, blocked: tile };

        tiles.push(tile);
    }

    return { route: tiles.slice(0, -1), stop: tiles.at(-1) ?? null, blocked: null };
};
