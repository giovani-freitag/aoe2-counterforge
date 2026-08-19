import { describe, expect, it } from 'vitest';
import { BinaryReader } from '../../../../scripts/extract/binary-reader.ts';

function reader(...bytes: number[]): BinaryReader {
    return new BinaryReader({ buffer: Buffer.from(bytes) });
}

describe('BinaryReader', () => {
    it('reads little-endian signed shorts', () => {
        const source = reader(0xff, 0xff, 0x0a, 0x00);

        expect([source.int16(), source.int16()]).toEqual([-1, 10]);
    });

    it('reads little-endian signed longs', () => {
        const source = reader(0x28, 0x9a, 0x01, 0x00);

        expect(source.int32()).toBe(105000);
    });

    it('reads single precision floats', () => {
        const source = reader(0x00, 0x00, 0x00, 0x40);

        expect(source.float()).toBe(2);
    });

    it('advances the cursor by the size of what it read', () => {
        const source = reader(1, 0, 0, 0, 2, 0);
        source.int32();

        expect(source.position).toBe(4);
    });

    it('reads a length-prefixed string', () => {
        const source = new BinaryReader({
            buffer: Buffer.concat([Buffer.from([0x60, 0x0a, 0x05, 0x00]), Buffer.from('Alpha')]),
        });

        expect(source.string()).toBe('Alpha');
    });

    it('reads an empty string without consuming anything else', () => {
        const source = new BinaryReader({ buffer: Buffer.from([0x60, 0x0a, 0x00, 0x00, 0x07, 0x00]) });
        source.string();

        expect(source.int16()).toBe(7);
    });

    it('refuses a string whose marker is missing, since the cursor has drifted', () => {
        const source = reader(0x00, 0x00, 0x02, 0x00);

        expect(() => source.string()).toThrow(/string marker/);
    });

    it('refuses to skip past the end of the buffer', () => {
        const source = reader(1, 2, 3);

        expect(() => { source.skip(4); }).toThrow(RangeError);
    });

    it('reports how much is left', () => {
        const source = reader(1, 2, 3, 4);
        source.skip(3);

        expect(source.remaining).toBe(1);
    });

    it('reads a list of records in file order', () => {
        const source = reader(1, 0, 2, 0, 3, 0);

        expect(source.list(3, () => source.int16())).toEqual([1, 2, 3]);
    });
});
