/** A window kept centred while it resizes. */
export interface CentredWindow {
    left: number;
    width: number;
    /** The odd pixel of the last resize, carried to the next one. */
    rest: number;
}

export const startCentred = (left: number, width: number): CentredWindow => ({ left, width, rest: 0 });

/**
 * WindowController.setRectangle with "on resize align center": each resize moves the window by half the width change, truncated
 * toward zero, and carries the odd pixel to the next resize.
 */
export const resizeCentred = (window: CentredWindow, width: number): void => {
    const change = window.rest - (width - window.width);
    const step = Math.trunc(change / 2);
    window.left += step;
    window.rest = change - step * 2;
    window.width = width;
};
