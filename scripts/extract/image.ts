export interface Image {
    width: number;
    height: number;
    /** Straight-alpha RGBA, one byte per channel, rows from top to bottom. */
    pixels: Uint8Array;
}

const TARGA_HEADER_SIZE = 18;
const TARGA_UNCOMPRESSED_TRUE_COLOUR = 2;
const TARGA_TOP_DOWN = 0x20;
const BYTES_PER_PIXEL = 4;

const LUMA = { red: 0.2126, green: 0.7152, blue: 0.0722 };

/**
 * Reads an uncompressed 32-bit Targa image.
 *
 * @param buffer - The file contents.
 * @returns The decoded image.
 * @throws Error when the file is compressed, paletted or not 32 bits per pixel.
 */
export function readTarga(buffer: Buffer): Image {
    if (buffer[2] !== TARGA_UNCOMPRESSED_TRUE_COLOUR || buffer[16] !== 32) {
        throw new Error(`Unsupported Targa image: type ${String(buffer[2])}, ${String(buffer[16])} bits.`);
    }

    const width = buffer.readUInt16LE(12);
    const height = buffer.readUInt16LE(14);
    const topDown = (buffer[17] & TARGA_TOP_DOWN) !== 0;
    const start = TARGA_HEADER_SIZE + buffer[0];
    const pixels = new Uint8Array(width * height * BYTES_PER_PIXEL);

    for (let y = 0; y < height; y++) {
        const row = topDown ? y : height - 1 - y;
        for (let x = 0; x < width; x++) {
            const from = start + (y * width + x) * BYTES_PER_PIXEL;
            const to = (row * width + x) * BYTES_PER_PIXEL;
            pixels[to] = buffer[from + 2];
            pixels[to + 1] = buffer[from + 1];
            pixels[to + 2] = buffer[from];
            pixels[to + 3] = buffer[from + 3];
        }
    }

    return { width, height, pixels };
}

/**
 * Paints the parts of a texture the game leaves for the player's colour.
 *
 * An icon tile is opaque from edge to edge, so transparency in it means something else: it marks
 * how much of the player's colour belongs on that pixel, and the colour stored underneath is the
 * shading to paint it with. The engine resolves that while it draws; a picture on a page has to
 * settle it once.
 *
 * @param image - The texture as the game stores it.
 * @param colour - Red, green and blue of the player to paint with.
 * @returns The finished, fully opaque picture.
 */
export function paintPlayerColour(image: Image, colour: readonly [number, number, number]): Image {
    const pixels = Uint8Array.from(image.pixels);

    for (let i = 0; i < pixels.length; i += BYTES_PER_PIXEL) {
        const share = 1 - pixels[i + 3] / 255;

        for (let channel = 0; channel < 3; channel++) {
            const painted = (pixels[i + channel] * colour[channel]) / 255;
            pixels[i + channel] = clamp(pixels[i + channel] * (1 - share) + painted * share);
        }

        pixels[i + 3] = 255;
    }

    return { width: image.width, height: image.height, pixels };
}

/**
 * Scales an image to a square of the given side.
 *
 * Every destination pixel averages the source area it covers, weighted by transparency so the
 * colour of an invisible pixel never bleeds into its neighbours.
 *
 * @param image - The image to scale.
 * @param size - Side of the result, in pixels.
 * @returns The scaled image.
 */
export function resizeImage(image: Image, size: number): Image {
    const pixels = new Uint8Array(size * size * BYTES_PER_PIXEL);
    const horizontal = image.width / size;
    const vertical = image.height / size;

    for (let y = 0; y < size; y++) {
        const top = y * vertical;
        const bottom = (y + 1) * vertical;

        for (let x = 0; x < size; x++) {
            const left = x * horizontal;
            const right = (x + 1) * horizontal;
            let red = 0;
            let green = 0;
            let blue = 0;
            let opacity = 0;
            let area = 0;

            for (let sourceY = Math.floor(top); sourceY < Math.ceil(bottom); sourceY++) {
                const heightShare = Math.min(bottom, sourceY + 1) - Math.max(top, sourceY);

                for (let sourceX = Math.floor(left); sourceX < Math.ceil(right); sourceX++) {
                    const widthShare = Math.min(right, sourceX + 1) - Math.max(left, sourceX);
                    const share = widthShare * heightShare;
                    const source = (sourceY * image.width + sourceX) * BYTES_PER_PIXEL;
                    const visible = (share * image.pixels[source + 3]) / 255;

                    red += image.pixels[source] * visible;
                    green += image.pixels[source + 1] * visible;
                    blue += image.pixels[source + 2] * visible;
                    opacity += visible;
                    area += share;
                }
            }

            const target = (y * size + x) * BYTES_PER_PIXEL;
            const visible = opacity || 1;
            pixels[target] = Math.round(red / visible);
            pixels[target + 1] = Math.round(green / visible);
            pixels[target + 2] = Math.round(blue / visible);
            pixels[target + 3] = Math.round((opacity / area) * 255);
        }
    }

    return { width: size, height: size, pixels };
}

/**
 * Restores the edge definition that scaling down takes away.
 *
 * @param image - The scaled image.
 * @param amount - How much of the difference against the neighbours to add back.
 * @returns The sharpened image.
 */
export function sharpenImage(image: Image, amount: number): Image {
    const pixels = Uint8Array.from(image.pixels);
    const stride = image.width * BYTES_PER_PIXEL;

    for (let y = 1; y < image.height - 1; y++) {
        for (let x = 1; x < image.width - 1; x++) {
            const centre = (y * image.width + x) * BYTES_PER_PIXEL;

            for (let channel = 0; channel < 3; channel++) {
                const value = image.pixels[centre + channel];
                const neighbours =
                    (image.pixels[centre - stride + channel] +
                        image.pixels[centre + stride + channel] +
                        image.pixels[centre - BYTES_PER_PIXEL + channel] +
                        image.pixels[centre + BYTES_PER_PIXEL + channel]) /
                    4;

                pixels[centre + channel] = clamp(value + (value - neighbours) * amount);
            }
        }
    }

    return { width: image.width, height: image.height, pixels };
}

/**
 * Pushes every colour away from grey.
 *
 * @param image - The image to adjust.
 * @param amount - Factor applied to the distance from grey; one leaves the image alone.
 * @returns The adjusted image.
 */
export function saturateImage(image: Image, amount: number): Image {
    const pixels = Uint8Array.from(image.pixels);

    for (let i = 0; i < pixels.length; i += BYTES_PER_PIXEL) {
        const grey =
            LUMA.red * pixels[i] + LUMA.green * pixels[i + 1] + LUMA.blue * pixels[i + 2];

        pixels[i] = clamp(grey + (pixels[i] - grey) * amount);
        pixels[i + 1] = clamp(grey + (pixels[i + 1] - grey) * amount);
        pixels[i + 2] = clamp(grey + (pixels[i + 2] - grey) * amount);
    }

    return { width: image.width, height: image.height, pixels };
}

function clamp(value: number): number {
    return Math.max(0, Math.min(255, Math.round(value)));
}
