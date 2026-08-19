import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EmberField } from '../../../../src/react/effects/ember-field.ts';
import { createCanvas } from '../../../mocks/canvas.ts';

const BOX = { width: 260, height: 160 };

beforeEach(() => {
    vi.stubGlobal('devicePixelRatio', 2);
});

describe('EmberField', () => {
    it('matches the drawing buffer to the pixels the screen actually has', () => {
        const recording = createCanvas(BOX);

        new EmberField({ canvas: recording.canvas, isLight: () => false });

        expect([recording.canvas.width, recording.canvas.height]).toEqual([520, 320]);
    });

    it('scales the crowd to the size of the surface', () => {
        const small = createCanvas({ width: 100, height: 100 });
        const large = createCanvas({ width: 300, height: 300 });

        new EmberField({ canvas: small.canvas, isLight: () => false }).step();
        new EmberField({ canvas: large.canvas, isLight: () => false }).step();

        expect(large.circles.length).toBeGreaterThan(small.circles.length);
    });

    it('answers the density it was given', () => {
        const calm = createCanvas(BOX);
        const busy = createCanvas(BOX);

        new EmberField({ canvas: calm.canvas, density: 0.5, isLight: () => false }).step();
        new EmberField({ canvas: busy.canvas, density: 2, isLight: () => false }).step();

        expect(busy.circles.length).toBeGreaterThan(calm.circles.length * 2);
    });

    it('keeps new embers inside the column it is pointed at', () => {
        const recording = createCanvas(BOX);
        const field = new EmberField({
            canvas: recording.canvas,
            isLight: () => false,
            column: () => ({ from: 100, width: 40 }),
        });

        field.step();

        const strays = recording.circles.filter((circle) => circle.x < 95 || circle.x > 145);
        expect(strays).toEqual([]);
    });

    it('adds light over a dark plate and ink over a pale one', () => {
        const dark = createCanvas(BOX);
        const light = createCanvas(BOX);
        let mode = false;

        new EmberField({ canvas: dark.canvas, isLight: () => mode }).step();
        expect(dark.paint.globalCompositeOperation).toBe('source-over');

        mode = true;
        const field = new EmberField({ canvas: light.canvas, isLight: () => mode });
        field.step();

        expect(light.paint.createRadialGradient).toHaveBeenCalled();
    });

    it('paints nothing at all on a canvas the page gave no room', () => {
        const recording = createCanvas({ width: 0, height: 0 });

        new EmberField({ canvas: recording.canvas, isLight: () => false }).step();

        expect(recording.circles).toEqual([]);
    });

    it('wipes the canvas when the effect is switched off', () => {
        const recording = createCanvas(BOX);
        const field = new EmberField({ canvas: recording.canvas, isLight: () => false });

        field.clear();

        expect(recording.paint.clearRect).toHaveBeenCalled();
    });
});
