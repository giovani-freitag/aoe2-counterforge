import { describe, expect, it } from 'vitest';
import type { Image } from '../../../../scripts/extract/image.ts';
import { encodePng } from '../../../../scripts/extract/png-encoder.ts';
import { decodePng } from '../../../fixtures/png.ts';

function image(width: number, height: number, pixels: readonly number[]): Image {
    return { width, height, pixels: Uint8Array.from(pixels) };
}

describe('encodePng', () => {
    it('opens with the signature every PNG reader looks for', async () => {
        const file = await encodePng(image(1, 1, [0, 0, 0, 255]));

        expect([...file.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    });

    it('declares the size of the image in its header', async () => {
        const decoded = decodePng(await encodePng(image(4, 2, new Array(4 * 2 * 4).fill(255))));

        expect([decoded.width, decoded.height]).toEqual([4, 2]);
    });

    it('writes back every colour of a picture the palette can hold', async () => {
        const source = image(2, 2, [255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 8, 8, 8, 255]);

        const decoded = decodePng(await encodePng(source));

        expect([...decoded.pixels]).toEqual([...source.pixels]);
    });

    it('keeps the transparency of a picture that has any', async () => {
        const source = image(2, 1, [255, 0, 0, 255, 0, 0, 255, 0]);

        const decoded = decodePng(await encodePng(source));

        expect([decoded.pixels[3], decoded.pixels[7]]).toEqual([255, 0]);
    });

    it('stays close to the original once the colours outgrow the palette', async () => {
        const pixels = Array.from({ length: 64 * 64 * 4 }, (_, i) => (i % 4 === 3 ? 255 : (i * 7) % 256));

        const decoded = decodePng(await encodePng(image(64, 64, pixels)));

        const worst = Math.max(...[...decoded.pixels].map((value, i) => Math.abs(value - pixels[i])));
        expect(worst).toBeLessThan(48);
    });
});
