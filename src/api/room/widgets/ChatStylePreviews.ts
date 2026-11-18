// style_<assetId>_selector_preview bitmaps (ChatStyleLibrary.as:107), keyed by chat style id.
const CHAT_STYLE_PREVIEWS = Object.fromEntries(Object.entries(import.meta.glob('../../../assets/images/chat-style-previews/*.png', { eager: true, import: 'default' }) as Record<string, string>)
    .map(([ path, url ]) => [ Number(path.slice(path.lastIndexOf('/') + 1, -4)), url ])) as Record<number, string>;

export const GetChatStylePreviewUrl = (styleId: number): string => CHAT_STYLE_PREVIEWS[styleId] ?? null;

const HALF_PREVIEWS = new Map<number, Promise<string>>();

const loadImage = (url: string) => new Promise<HTMLImageElement>((resolve, reject) =>
{
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
});

const halve = (image: HTMLImageElement): string =>
{
    const width = Math.floor(image.naturalWidth / 2);
    const height = Math.floor(image.naturalHeight / 2);
    const source = document.createElement('canvas');

    source.width = image.naturalWidth;
    source.height = image.naturalHeight;

    const sourceContext = source.getContext('2d');

    sourceContext.drawImage(image, 0, 0);

    const input = sourceContext.getImageData(0, 0, source.width, source.height).data;
    const target = document.createElement('canvas');

    target.width = width;
    target.height = height;

    const targetContext = target.getContext('2d');
    const output = targetContext.createImageData(width, height);

    const hasOddDimension = source.width % 2 !== 0 || source.height % 2 !== 0;

    for(let y = 0; y < height; y++)
    {
        for(let x = 0; x < width; x++)
        {
            let red = 0;
            let green = 0;
            let blue = 0;
            let alpha = 0;

            // For an odd source dimension, AIR smooths the first row and column with a 1:2:1 filter.
            const smoothEdge = hasOddDimension && (x === 0 || y === 0);
            const size = smoothEdge ? 3 : 2;
            let totalWeight = 0;

            for(let dy = 0; dy < size && y * 2 + dy < source.height; dy++)
            {
                for(let dx = 0; dx < size && x * 2 + dx < source.width; dx++)
                {
                    const index = ((y * 2 + dy) * source.width + x * 2 + dx) * 4;
                    const weight = (smoothEdge && dy === 1 ? 2 : 1) * (smoothEdge && dx === 1 ? 2 : 1);
                    const coverage = input[index + 3] * weight;

                    red += input[index] * coverage;
                    green += input[index + 1] * coverage;
                    blue += input[index + 2] * coverage;
                    alpha += coverage;
                    totalWeight += weight;
                }
            }

            const out = (y * width + x) * 4;

            if(alpha > 0)
            {
                output.data[out] = Math.round(red / alpha);
                output.data[out + 1] = Math.round(green / alpha);
                output.data[out + 2] = Math.round(blue / alpha);
            }

            output.data[out + 3] = Math.round(alpha / totalWeight);
        }
    }

    targetContext.putImageData(output, 0, 0);

    return target.toDataURL('image/png');
};

export const GetChatStyleHalfPreviewUrl = (styleId: number): Promise<string> =>
{
    const url = GetChatStylePreviewUrl(styleId);

    if(!url) return Promise.resolve(null);

    if(!HALF_PREVIEWS.has(styleId)) HALF_PREVIEWS.set(styleId, loadImage(url).then(halve).catch(() => null));

    return HALF_PREVIEWS.get(styleId);
};
