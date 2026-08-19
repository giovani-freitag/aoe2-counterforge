import { describe, expect, it } from 'vitest';
import { textureIndex } from '../../../../scripts/extract/icon-extractor.ts';

describe('textureIndex', () => {
    it('reads the index off the name the game gives each texture', () => {
        const index = textureIndex(['000_50730.DDS', '074_50730.DDS', '017_forging.DDS']);

        expect([...index]).toEqual([
            [0, '000_50730.DDS'],
            [74, '074_50730.DDS'],
            [17, '017_forging.DDS'],
        ]);
    });

    it('ignores the files that carry no index', () => {
        const index = textureIndex(['readme.txt', 'castle.png', '007_castle.DDS']);

        expect([...index.keys()]).toEqual([7]);
    });

    it('keeps the last file when two share an index', () => {
        const index = textureIndex(['007_castle.DDS', '007_castle_hd.DDS']);

        expect(index.get(7)).toBe('007_castle_hd.DDS');
    });
});
