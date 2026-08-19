import sharp from 'sharp';
import type { Image } from './image.ts';

/**
 * Colours kept when the picture is reduced to a palette.
 *
 * An icon is a small crop of a rendered model, so a full palette carries every shade it uses and
 * the file ends up about a third of the size of the same picture written channel by channel.
 */
const PALETTE_COLOURS = 256;
const PALETTE_QUALITY = 90;
const COMPRESSION_EFFORT = 10;

/**
 * Encodes an image as a PNG.
 *
 * @param image - The finished picture, one byte per channel.
 * @returns The file contents, ready to be written to disk.
 */
export async function encodePng(image: Image): Promise<Buffer> {
    return sharp(Buffer.from(image.pixels), {
        raw: { width: image.width, height: image.height, channels: 4 },
    })
        .png({
            palette: true,
            colours: PALETTE_COLOURS,
            quality: PALETTE_QUALITY,
            effort: COMPRESSION_EFFORT,
        })
        .toBuffer();
}
