import { RefObject, useCallback, useEffect, useRef, useState } from 'react';

/** AIR RecyclerEngineAnimator: the pointer swings in random steps and the machine shakes until the pointer reaches the right end. */
const MIN_ANGLE = -88;
const MAX_ANGLE = 88;
const FINISH_ANGLE = 82;
const FINAL_STEP_ANGLE = 68;
const BIAS_GROWTH = 0.00008;
const BASE_BIAS = 0.35;
const FIRST_BIAS = 0.2;
const TICK_MS = 16;
const RESET_TIME = 250;
const SHAKE_TIMEOUT = 50;
const SHAKE_PIXELS = 3;
const MIN_TIME_ACTIVE = 3000;
const FINAL_STEP_AFTER = 2700;
const SHAKE_PIXELS_E = 24;
const STEP_SIZE_E = 70;
const STEP_DURATION_E = 20;
const TOTAL_DURATION_E = 5000;
const STEP_DURATION_MIN = 400;
const STEP_DURATION_MAX = 200;
const STEP_SIZE_MIN = 20;
const STEP_SIZE_MAX = 55;

const rand = (min: number, max: number) => Math.trunc(min + Math.random() * (max - min));

interface AnimatorState {
    timer: ReturnType<typeof setInterval> | null;
    resetting: boolean;
    easterEgg: boolean;
    startTime: number;
    stepBegin: number;
    stepDuration: number;
    from: number;
    to: number;
    rotation: number;
    shakeLast: number;
}

export const useRecyclerEngineAnimator = (arrowRef: RefObject<HTMLElement>, machineRef: RefObject<HTMLElement>, onFinish: () => void) => {
    const [busy, setBusy] = useState(false);
    const finishRef = useRef(onFinish);
    const state = useRef<AnimatorState>({
        timer: null,
        resetting: false,
        easterEgg: false,
        startTime: 0,
        stepBegin: 0,
        stepDuration: 0,
        from: 0,
        to: 0,
        rotation: 0,
        shakeLast: 0
    });

    finishRef.current = onFinish;

    const setRotation = useCallback(
        (angle: number) => {
            state.current.rotation = angle;

            if (arrowRef.current) arrowRef.current.style.transform = angle ? `rotate(${angle}deg)` : '';
        },
        [arrowRef]
    );

    const setShake = useCallback(
        (x: number, y: number) => {
            if (machineRef.current) machineRef.current.style.transform = x || y ? `translate(${x}px, ${y}px)` : '';
        },
        [machineRef]
    );

    const stopTimer = useCallback(() => {
        if (state.current.timer) clearInterval(state.current.timer);

        state.current.timer = null;
    }, []);

    const nextStep = useCallback((final = false, first = false) => {
        const current = state.current;

        current.from = current.rotation;
        current.stepBegin = performance.now();

        if (final) {
            current.to = MAX_ANGLE;
        } else if (current.easterEgg) {
            current.to = current.from - STEP_SIZE_E;
        } else {
            const elapsed = performance.now() - current.startTime;
            let back: boolean;

            if (current.from <= MIN_ANGLE + 5) back = false;
            else if (current.from >= MAX_ANGLE - 5) back = true;
            else back = Math.random() > (first ? FIRST_BIAS : BASE_BIAS + elapsed * BIAS_GROWTH);

            const step = (back ? -1 : 1) * rand(STEP_SIZE_MIN, STEP_SIZE_MAX);

            current.to = Math.max(MIN_ANGLE, Math.min(MAX_ANGLE, current.from + step));
        }

        current.stepDuration = current.easterEgg ? STEP_DURATION_E : rand(STEP_DURATION_MIN, STEP_DURATION_MAX);
    }, []);

    const tick = useCallback(() => {
        const current = state.current;
        const now = performance.now();
        const stepTime = now - current.stepBegin;
        const progress = Math.max(0, Math.min(1, stepTime / current.stepDuration));
        const angle = Math.trunc((current.to - current.from) * progress + current.from);

        setRotation(angle);

        if (!current.resetting && now > current.shakeLast + SHAKE_TIMEOUT) {
            const pixels = current.easterEgg ? SHAKE_PIXELS_E : SHAKE_PIXELS;

            current.shakeLast = now;
            setShake(rand(-pixels, pixels), rand(-pixels, pixels));
        }

        if (stepTime < current.stepDuration) return;

        if (current.resetting) {
            stopTimer();
            current.resetting = false;
        } else if (
            (!current.easterEgg && angle >= FINISH_ANGLE && now - current.startTime > MIN_TIME_ACTIVE) ||
            (current.easterEgg && now - current.startTime > TOTAL_DURATION_E)
        ) {
            stopTimer();
            setShake(0, 0);
            setBusy(false);
            finishRef.current();
        } else {
            nextStep(angle >= FINAL_STEP_ANGLE && now - current.startTime > FINAL_STEP_AFTER && !current.easterEgg);
        }
    }, [nextStep, setRotation, setShake, stopTimer]);

    const start = useCallback(
        (easterEgg = false) => {
            stopTimer();
            Object.assign(state.current, { resetting: false, easterEgg, startTime: performance.now() });
            setRotation(0);
            setShake(0, 0);
            nextStep(false, true);
            state.current.timer = setInterval(tick, TICK_MS);
            setBusy(true);
        },
        [nextStep, setRotation, setShake, stopTimer, tick]
    );

    const stop = useCallback(() => {
        stopTimer();
        setShake(0, 0);
        state.current.resetting = false;
        setBusy(false);
    }, [setShake, stopTimer]);

    const reset = useCallback(() => {
        const current = state.current;

        stopTimer();
        current.resetting = true;
        current.from = current.rotation % 360;
        current.to = 0;
        current.stepBegin = performance.now();
        current.stepDuration = RESET_TIME;
        setShake(0, 0);
        current.timer = setInterval(tick, TICK_MS);
    }, [setShake, stopTimer, tick]);

    useEffect(() => stopTimer, [stopTimer]);

    return { busy, start, stop, reset };
};
