import { ColorConverter } from '@volt/renderer';

/**
 * A linear RGB fade from the current color to a target color. The lightness byte fades on its own
 * and replaces the HSL lightness of the faded color, like AIR's ColorTransitioner.
 */
export class ColorTransitioner {
    private _color: number;
    private _lightness: number;
    private _originalColor: number;
    private _originalLightness: number;
    private _targetColor: number;
    private _targetLightness: number;
    private _changedTime = 0;
    private _length = 0;

    constructor(color: number = 0xffffff, lightness: number = 255) {
        this._color = this._originalColor = this._targetColor = color;
        this._lightness = this._originalLightness = this._targetLightness = lightness;
    }

    public startTransition(color: number, lightness: number, time: number, length: number = 1500): void {
        this._originalColor = this._color;
        this._originalLightness = this._lightness;
        this._targetColor = color;
        this._targetLightness = lightness;
        this._changedTime = time;
        this._length = length;
    }

    /** Moves the fade to `time`. Returns false when no fade is running. */
    public updateColor(time: number): boolean {
        if (!this._changedTime) return false;

        if (time - this._changedTime >= this._length) {
            this._color = this._targetColor;
            this._lightness = this._targetLightness;
            this._changedTime = 0;

            return true;
        }

        const progress = (time - this._changedTime) / this._length;
        const fade = (from: number, to: number) => (from + (to - from) * progress) | 0;
        const channel = (color: number, shift: number) => (color >> shift) & 0xff;

        this._color =
            (fade(channel(this._originalColor, 16), channel(this._targetColor, 16)) << 16) +
            (fade(channel(this._originalColor, 8), channel(this._targetColor, 8)) << 8) +
            fade(channel(this._originalColor, 0), channel(this._targetColor, 0));
        this._lightness = fade(this._originalLightness, this._targetLightness);

        return true;
    }

    public get color(): number {
        return ColorConverter.hslToRGB((ColorConverter.rgbToHSL(this._color) & 0xffff00) + this._lightness);
    }
}
