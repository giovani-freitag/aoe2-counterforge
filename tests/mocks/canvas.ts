import { vi } from 'vitest';

export interface CanvasRecording {
    canvas: HTMLCanvasElement;
    paint: {
        clearRect: ReturnType<typeof vi.fn>;
        setTransform: ReturnType<typeof vi.fn>;
        createRadialGradient: ReturnType<typeof vi.fn>;
        beginPath: ReturnType<typeof vi.fn>;
        arc: ReturnType<typeof vi.fn>;
        fill: ReturnType<typeof vi.fn>;
        fillStyle: string;
        globalCompositeOperation: string;
    };
    /** Centre and radius of every circle painted, in the order they were painted. */
    circles: { x: number; y: number; radius: number }[];
}

/**
 * A canvas that records what was drawn on it.
 *
 * @param size - Box the page is pretending to give the canvas.
 * @returns The canvas, its context, and the circles painted so far.
 */
export function createCanvas(size: { width: number; height: number }): CanvasRecording {
    const circles: { x: number; y: number; radius: number }[] = [];

    const paint = {
        clearRect: vi.fn(),
        setTransform: vi.fn(),
        createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
        beginPath: vi.fn(),
        arc: vi.fn((x: number, y: number, radius: number) => circles.push({ x, y, radius })),
        fill: vi.fn(),
        fillStyle: '',
        globalCompositeOperation: '',
    };

    const canvas = {
        width: 0,
        height: 0,
        getContext: () => paint,
        getBoundingClientRect: () => ({ ...size, top: 0, left: 0, right: size.width, bottom: size.height }),
    };

    return { canvas: canvas as unknown as HTMLCanvasElement, paint, circles };
}
