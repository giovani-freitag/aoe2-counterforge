import { describe, expect, it } from 'vitest';
import {
    paintPlayerColour,
    readTarga,
    resizeImage,
    saturateImage,
    sharpenImage,
    type Image,
} from '../../../../scripts/extract/image.ts';
import { encodeTarga } from '../../../fixtures/png.ts';

function image(width: number, height: number, pixels: readonly number[]): Image {
    return { width, height, pixels: Uint8Array.from(pixels) };
}

function flat(width: number, height: number, colour: readonly number[]): Image {
    return image(width, height, Array.from({ length: width * height }, () => colour).flat());
}

describe('readTarga', () => {
    it('turns the stored blue-green-red order back into red-green-blue', () => {
        const file = encodeTarga({ width: 1, height: 1, pixels: [10, 20, 30, 255] });

        expect([...readTarga(file).pixels]).toEqual([10, 20, 30, 255]);
    });

    it('puts the rows of a bottom-up file back in reading order', () => {
        const file = encodeTarga({ width: 1, height: 2, pixels: [1, 1, 1, 255, 2, 2, 2, 255] }, { bottomUp: true });

        expect([...readTarga(file).pixels]).toEqual([1, 1, 1, 255, 2, 2, 2, 255]);
    });

    it('reports the size the header declares', () => {
        const file = encodeTarga({ width: 2, height: 3, pixels: new Array(2 * 3 * 4).fill(0) });

        expect([readTarga(file).width, readTarga(file).height]).toEqual([2, 3]);
    });

    it('refuses a file it cannot read', () => {
        const file = encodeTarga({ width: 1, height: 1, pixels: [0, 0, 0, 0] });
        file[2] = 10;

        expect(() => readTarga(file)).toThrow(/Unsupported Targa/);
    });
});

describe('paintPlayerColour', () => {
    const blue: [number, number, number] = [110, 166, 235];

    it('leaves the part of the picture the game draws as it is', () => {
        const source = image(1, 1, [200, 150, 100, 255]);

        expect([...paintPlayerColour(source, blue).pixels]).toEqual([200, 150, 100, 255]);
    });

    it('paints the marked part with the player colour, keeping its shading', () => {
        const source = image(1, 1, [255, 255, 255, 0]);

        expect([...paintPlayerColour(source, blue).pixels]).toEqual([110, 166, 235, 255]);
    });

    it('keeps the shading of a marked pixel that is not white', () => {
        const source = image(1, 1, [128, 128, 128, 0]);

        expect([...paintPlayerColour(source, blue).pixels].slice(0, 3)).toEqual([55, 83, 118]);
    });

    it('meets a half marked pixel halfway', () => {
        const source = image(1, 1, [255, 255, 255, 128]);

        const painted = paintPlayerColour(source, [0, 0, 0]);

        expect(painted.pixels[0]).toBe(128);
    });

    it('hands back a picture with nothing left transparent', () => {
        const source = image(2, 1, [10, 10, 10, 0, 20, 20, 20, 40]);

        const painted = paintPlayerColour(source, blue);

        expect([painted.pixels[3], painted.pixels[7]]).toEqual([255, 255]);
    });
});

describe('resizeImage', () => {
    it('averages the block that each destination pixel covers', () => {
        const source = image(2, 2, [0, 0, 0, 255, 100, 100, 100, 255, 100, 100, 100, 255, 200, 200, 200, 255]);

        expect([...resizeImage(source, 1).pixels]).toEqual([100, 100, 100, 255]);
    });

    it('leaves the colour of an invisible pixel out of the average', () => {
        const source = image(2, 1, [80, 80, 80, 255, 255, 0, 0, 0]);

        expect([...resizeImage(source, 1).pixels].slice(0, 3)).toEqual([80, 80, 80]);
    });

    it('averages the transparency over the whole block', () => {
        const source = image(2, 1, [10, 10, 10, 255, 10, 10, 10, 0]);

        expect([...resizeImage(source, 1).pixels][3]).toBe(128);
    });

    it('keeps a picture that needs no scaling', () => {
        const source = image(1, 1, [7, 8, 9, 255]);

        expect([...resizeImage(source, 1).pixels]).toEqual([7, 8, 9, 255]);
    });
});

describe('sharpenImage', () => {
    it('leaves an image of a single colour alone', () => {
        const source = flat(3, 3, [40, 60, 80, 255]);

        expect([...sharpenImage(source, 0.6).pixels]).toEqual([...source.pixels]);
    });

    it('pushes a pixel further from the neighbours it differs from', () => {
        const source = flat(3, 3, [100, 100, 100, 255]);
        source.pixels.set([150, 150, 150, 255], (1 * 3 + 1) * 4);

        const sharpened = sharpenImage(source, 0.5);

        expect(sharpened.pixels[(1 * 3 + 1) * 4]).toBe(175);
    });

    it('never leaves the byte range', () => {
        const source = flat(3, 3, [0, 0, 0, 255]);
        source.pixels.set([250, 250, 250, 255], (1 * 3 + 1) * 4);

        expect(sharpenImage(source, 4).pixels[(1 * 3 + 1) * 4]).toBe(255);
    });
});

describe('saturateImage', () => {
    it('leaves grey exactly as it is', () => {
        const source = flat(1, 1, [128, 128, 128, 255]);

        expect([...saturateImage(source, 1.4).pixels]).toEqual([128, 128, 128, 255]);
    });

    it('moves a colour away from its own grey', () => {
        const source = image(1, 1, [200, 100, 100, 255]);

        const saturated = saturateImage(source, 1.5);

        expect(saturated.pixels[0]).toBeGreaterThan(200);
    });

    it('leaves transparency untouched', () => {
        const source = image(1, 1, [200, 100, 100, 40]);

        expect(saturateImage(source, 1.5).pixels[3]).toBe(40);
    });
});
