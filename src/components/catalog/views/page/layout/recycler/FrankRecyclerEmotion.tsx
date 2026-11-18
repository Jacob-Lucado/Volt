import { FC, useEffect, useRef } from 'react';
import blushImage from '../../../../../../assets/images/catalog/air/recycler/franks-emotions-blush.png';
import heartImage from '../../../../../../assets/images/catalog/air/recycler/franks-emotions-heart.png';

/** FrankRecyclerEmotion: emoji_2_template (32, 210) moved 20px left to 49px right, rising 30 to 110px a second and fading in over 0.8s. */
const TEMPLATE_X = 32;
const TEMPLATE_Y = 210;
const END_Y = -50;

export interface FrankEmotion {
    id: number;
    image: string;
    x: number;
    speed: number;
}

export const createFrankEmotion = (id: number): FrankEmotion => ({
    id,
    image: Math.random() < 0.5 ? blushImage : heartImage,
    x: TEMPLATE_X + Math.floor(Math.random() * 70) - 20,
    speed: Math.random() * 80 + 30
});

export const FrankRecyclerEmotion: FC<{ emotion: FrankEmotion; onDone: (id: number) => void }> = ({ emotion, onDone }) => {
    const ref = useRef<HTMLImageElement>(null);

    useEffect(() => {
        const element = ref.current;

        if (!element) return;

        const start = performance.now();
        let frame = requestAnimationFrame(function tick(now) {
            const seconds = (now - start) / 1000;
            const y = TEMPLATE_Y - emotion.speed * seconds;

            element.style.opacity = String(Math.min(1, seconds * 1.25));
            element.style.top = `${Math.trunc(y)}px`;

            if (y < END_Y) onDone(emotion.id);
            else frame = requestAnimationFrame(tick);
        });

        return () => cancelAnimationFrame(frame);
    }, [emotion, onDone]);

    return (
        <img
            ref={ref}
            alt=""
            className="volt-catalog-recycler-emotion"
            draggable={false}
            src={emotion.image}
            style={{ left: emotion.x, top: TEMPLATE_Y, opacity: 0 }}
        />
    );
};
