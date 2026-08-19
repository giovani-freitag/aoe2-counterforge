import { describe, expect, it } from 'vitest';
import { EntityNotFoundError } from '../../../../src/domain/errors/domain-error.ts';
import { CatalogAssembler } from '../../../../src/services/game-catalog/catalog-assembler.ts';
import { GameCatalogService } from '../../../../src/services/game-catalog/game-catalog-service.ts';
import { civilizationRecord, technologyRecord, unitRecord } from '../../../fixtures/records.ts';

function buildCatalog() {
    return new GameCatalogService({
        assembler: new CatalogAssembler(),
        units: [
            unitRecord({ key: 'militia', age: 1, line: 'militia', civs: ['britons', 'franks'] }),
            unitRecord({ key: 'man-at-arms', age: 2, line: 'militia', upgradesFrom: 'militia', civs: ['britons'] }),
            unitRecord({ key: 'knight', age: 3, category: 'cavalry', civs: ['franks'] }),
            unitRecord({ key: 'villager', age: 1, category: 'civilian', civs: ['britons', 'franks'] }),
        ],
        technologies: [
            technologyRecord({ key: 'forging', civs: ['britons', 'franks'] }),
            technologyRecord({ key: 'chivalry', building: 'castle', civs: ['franks'] }),
        ],
        civilizations: [civilizationRecord('britons'), civilizationRecord('franks')],
    });
}

describe('GameCatalogService', () => {
    it('finds a unit by its slug', () => {
        const catalog = buildCatalog();

        expect(catalog.unit('knight').key).toBe('knight');
    });

    it('reports an unknown slug instead of returning nothing', () => {
        const catalog = buildCatalog();

        expect(() => catalog.unit('nonexistent')).toThrow(EntityNotFoundError);
    });

    it('keeps only the units a civilization can train', () => {
        const catalog = buildCatalog();

        const units = catalog.units({ civ: 'franks' });

        expect(units.map((unit) => unit.key)).toEqual(['militia', 'villager', 'knight']);
    });

    it('drops civilian units when only combat units are asked for', () => {
        const catalog = buildCatalog();

        const units = catalog.units({ combatOnly: true });

        expect(units.map((unit) => unit.key)).not.toContain('villager');
    });

    it('returns a whole upgrade line in age order', () => {
        const catalog = buildCatalog();

        const line = catalog.units({ line: 'militia' });

        expect(line.map((unit) => unit.key)).toEqual(['militia', 'man-at-arms']);
    });

    it('keeps only the technologies owned by a single civilization when asked', () => {
        const catalog = buildCatalog();

        const unique = catalog.technologies({ uniqueOnly: true });

        expect(unique.map((technology) => technology.key)).toEqual(['chivalry']);
    });

    it('lists civilizations sorted by slug', () => {
        const catalog = buildCatalog();

        expect(catalog.civilizations().map((civilization) => civilization.key)).toEqual(['britons', 'franks']);
    });
});
