import { inflateSync } from 'node:zlib';

export interface DecodedPng {
    width: number;
    height: number;
    /** Straight-alpha RGBA, one byte per channel. */
    pixels: Uint8Array;
}

const SIGNATURE_SIZE = 8;
const BYTES_PER_PIXEL = 4;

/**
 * Decodes an eight bit PNG, whether it stores every channel or an index into a palette.
 *
 * @param file - The file contents.
 * @returns The image the file describes, always as straight-alpha RGBA.
 * @throws Error when the file is interlaced or of another bit depth.
 */
export function decodePng(file: Buffer): DecodedPng {
    if (file.readUInt32BE(0) !== 0x89504e47) throw new Error('Not a PNG file.');

    let cursor = SIGNATURE_SIZE;
    let width = 0;
    let height = 0;
    let colourType = 6;
    let palette: Buffer | null = null;
    let transparency: Buffer | null = null;
    const parts: Buffer[] = [];

    while (cursor < file.length) {
        const length = file.readUInt32BE(cursor);
        const type = file.toString('ascii', cursor + 4, cursor + 8);
        const data = file.subarray(cursor + 8, cursor + 8 + length);

        if (type === 'IHDR') {
            width = data.readUInt32BE(0);
            height = data.readUInt32BE(4);
            colourType = data[9];
            if (data[8] !== 8 || data[12] !== 0) throw new Error('Unsupported PNG shape.');
            if (colourType !== 3 && colourType !== 6) throw new Error('Unsupported PNG colour type.');
        }
        if (type === 'PLTE') palette = Buffer.from(data);
        if (type === 'tRNS') transparency = Buffer.from(data);
        if (type === 'IDAT') parts.push(Buffer.from(data));

        cursor += 12 + length;
    }

    const channels = colourType === 3 ? 1 : BYTES_PER_PIXEL;
    const raw = unfilter(inflateSync(Buffer.concat(parts)), width, height, channels);

    return { width, height, pixels: palette ? expand(raw, palette, transparency) : raw };
}

/** Turns one index per pixel back into the four channels the caller expects. */
function expand(indexes: Uint8Array, palette: Buffer, transparency: Buffer | null): Uint8Array {
    const pixels = new Uint8Array(indexes.length * BYTES_PER_PIXEL);

    for (let i = 0; i < indexes.length; i++) {
        const entry = indexes[i] * 3;
        pixels[i * BYTES_PER_PIXEL] = palette[entry];
        pixels[i * BYTES_PER_PIXEL + 1] = palette[entry + 1];
        pixels[i * BYTES_PER_PIXEL + 2] = palette[entry + 2];
        pixels[i * BYTES_PER_PIXEL + 3] = transparency?.[indexes[i]] ?? 255;
    }

    return pixels;
}

function unfilter(raw: Buffer, width: number, height: number, channels: number): Uint8Array {
    const stride = width * channels;
    const pixels = new Uint8Array(stride * height);

    for (let y = 0; y < height; y++) {
        const filter = raw[y * (stride + 1)];
        const row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));

        for (let i = 0; i < stride; i++) {
            const left = i < channels ? 0 : pixels[y * stride + i - channels];
            const up = y === 0 ? 0 : pixels[(y - 1) * stride + i];
            const upLeft = y === 0 || i < channels ? 0 : pixels[(y - 1) * stride + i - channels];

            pixels[y * stride + i] = (row[i] + predictor(filter, left, up, upLeft)) & 0xff;
        }
    }

    return pixels;
}

function predictor(filter: number, left: number, up: number, upLeft: number): number {
    if (filter === 1) return left;
    if (filter === 2) return up;
    if (filter === 3) return Math.floor((left + up) / 2);
    if (filter === 4) return paeth(left, up, upLeft);

    return 0;
}

function paeth(left: number, up: number, upLeft: number): number {
    const estimate = left + up - upLeft;
    const toLeft = Math.abs(estimate - left);
    const toUp = Math.abs(estimate - up);
    const toUpLeft = Math.abs(estimate - upLeft);

    if (toLeft <= toUp && toLeft <= toUpLeft) return left;

    return toUp <= toUpLeft ? up : upLeft;
}

/**
 * Builds an uncompressed 32 bit Targa file.
 *
 * @param image - Size and straight-alpha RGBA pixels, rows from top to bottom.
 * @param options - Set bottomUp to store the rows the other way round, as most Targa files do.
 * @returns The file contents.
 */
export function encodeTarga(
    image: { width: number; height: number; pixels: readonly number[] },
    options: { bottomUp?: boolean } = {},
): Buffer {
    const header = Buffer.alloc(18);
    header[2] = 2;
    header.writeUInt16LE(image.width, 12);
    header.writeUInt16LE(image.height, 14);
    header[16] = 32;
    header[17] = options.bottomUp ? 0x08 : 0x28;

    const body = Buffer.alloc(image.width * image.height * BYTES_PER_PIXEL);
    for (let y = 0; y < image.height; y++) {
        const row = options.bottomUp ? image.height - 1 - y : y;
        for (let x = 0; x < image.width; x++) {
            const from = (row * image.width + x) * BYTES_PER_PIXEL;
            const to = (y * image.width + x) * BYTES_PER_PIXEL;
            body[to] = image.pixels[from + 2];
            body[to + 1] = image.pixels[from + 1];
            body[to + 2] = image.pixels[from];
            body[to + 3] = image.pixels[from + 3];
        }
    }

    return Buffer.concat([header, body]);
}
