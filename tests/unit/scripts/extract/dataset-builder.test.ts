import { describe, expect, it } from 'vitest';
import {
    datasetBuilderFixture,
    genieUnit,
    sampleCivilization,
    sampleGameData,
    sampleStrings,
    sampleTechTree,
    techTreeNode,
    STRING_IDS,
    type DatasetFixtureInput,
} from '../../../fixtures/game-data.ts';

const dataset = datasetBuilderFixture().build();
const militia = dataset.units.find((entry) => entry.key === 'militia');
const manAtArms = dataset.units.find((entry) => entry.key === 'man-at-arms');

describe('DatasetBuilder', () => {
    it('keys units on the name players see', () => {
        expect(dataset.units.map((entry) => entry.key)).toEqual(['militia', 'man-at-arms', 'stand-in-rider']);
    });

    it('carries the stats straight through from the game data', () => {
        expect(militia).toMatchObject({
            hp: 40,
            speed: 0.9,
            reloadTime: 2,
            accuracy: 100,
            lineOfSight: 4,
            trainTime: 21,
            cost: { food: 50, wood: 0, gold: 20, stone: 0 },
        });
    });

    it('names the armour classes the damage model needs', () => {
        expect(militia?.armours).toEqual([
            { class: 'infantry', amount: 0 },
            { class: 'base-pierce', amount: 1 },
            { class: 'base-melee', amount: 0 },
        ]);
    });

    it('classifies a unit from the armour classes it carries', () => {
        expect(militia?.category).toBe('infantry');
    });

    it('takes the age and the training building from the tech tree', () => {
        expect([manAtArms?.age, manAtArms?.buildings]).toEqual([2, ['barracks']]);
    });

    it('links an upgrade to the unit it replaces', () => {
        expect(dataset.units.map((entry) => [entry.key, entry.upgradesFrom, entry.line])).toEqual([
            ['militia', null, 'militia'],
            ['man-at-arms', 'militia', 'militia'],
            ['stand-in-rider', null, 'stand-in-rider'],
        ]);
    });

    it('prices the upgrade from the technology the node triggers', () => {
        expect([manAtArms?.upgradeCost, manAtArms?.upgradeResearchTime]).toEqual([
            { food: 100, wood: 0, gold: 40, stone: 0 },
            40,
        ]);
    });

    it('leaves a unit nobody upgrades into without an upgrade price', () => {
        expect(militia?.upgradeCost).toBeNull();
    });

    it('records every civilization that can train the unit', () => {
        expect(militia?.civs).toEqual(['britons']);
    });

    it('builds the technology records from the researchable nodes', () => {
        expect(dataset.technologies).toEqual([
            {
                id: 0,
                key: 'forging',
                icon: 8,
                age: 2,
                building: 'blacksmith',
                cost: { food: 150, wood: 0, gold: 0, stone: 0 },
                researchTime: 50,
                civs: ['britons'],
                effects: [
                    {
                        mode: 'add',
                        unit: null,
                        unitClass: 6,
                        attribute: 'attack',
                        value: 1,
                        damageClass: 'base-melee',
                    },
                ],
            },
        ]);
    });

    it('keeps a unit the trees leave out but a technology switches on', () => {
        const standIn = dataset.units.find((entry) => entry.key === 'stand-in-rider');

        expect(standIn).toMatchObject({ buildings: ['barracks'], civs: ['britons'], inTechTree: false });
    });

    it('reads the passive bonuses of a civilization off its own technologies', () => {
        expect(dataset.civilizations[0]?.bonusEffects).toEqual([
            { mode: 'multiply', unit: null, unitClass: 6, attribute: 'hp', value: 1.2 },
        ]);
    });

    it('splits the unit help into a role and the two verdicts', () => {
        expect(dataset.strings.get('en')?.units.militia).toEqual({
            name: 'Militia',
            role: 'All-purpose Infantry.',
            strongVs: 'Strong vs. buildings.',
            weakVs: '',
            upgradesHint: 'Upgrades: attack.',
        });
    });

    it('splits the civilization help into an intro and its bonuses', () => {
        expect(dataset.strings.get('en')?.civs.britons).toMatchObject({
            name: 'Britons',
            intro: 'Foot Archer civilization',
            bonuses: ['Shepherds work +25% faster'],
        });
    });
});

describe('DatasetBuilder duplicates', () => {
    it('lists both places a unit is trained as a single entry', () => {
        const built = datasetBuilderFixture(withSecondBuilding()).build();

        expect(built.units.map((entry) => [entry.key, entry.buildings])).toEqual([
            ['militia', ['barracks', 'castle']],
            ['man-at-arms', ['barracks']],
            ['stand-in-rider', ['barracks']],
        ]);
    });

    it('drops the copy handed out for free instead of merging it', () => {
        const free = withSecondBuilding();
        free.game.civilizations[1].units.set(76, genieUnit({ id: 76, nameStringId: STRING_IDS.militiaUnit, costs: [] }));

        const built = datasetBuilderFixture(free).build();

        expect(built.units.map((entry) => [entry.key, entry.buildings])).toEqual([
            ['militia', ['barracks']],
            ['man-at-arms', ['barracks']],
            ['stand-in-rider', ['barracks']],
        ]);
    });
});

describe('DatasetBuilder replacements', () => {
    it('prices a unique unit like the upgrade it stands in for', () => {
        const game = sampleGameData();
        game.civilizations[1].units.set(76, genieUnit({ id: 76, nameStringId: 5081, hitPoints: 50 }));

        const tree = sampleTechTree();
        tree.civ_techs_units.push(
            techTreeNode({
                'Node ID': 76,
                'Name String ID': 14081,
                'Node Type': 'UniqueUnit',
                'Link Node Type': 'UnitUpgrade',
                'Link ID': 74,
                'Age ID': 2,
            }),
        );

        const strings = sampleStrings();
        strings.set(14081, 'Guard');

        const built = datasetBuilderFixture({ game, trees: [tree], strings }).build();

        expect(built.units.find((entry) => entry.key === 'guard')).toMatchObject({
            upgradesFrom: 'militia',
            upgradeCost: { food: 100, wood: 0, gold: 40, stone: 0 },
        });
    });
});

describe('DatasetBuilder era filter', () => {
    it('leaves out the civilizations of another era', () => {
        const built = datasetBuilderFixture({
            civilizations: [{ ...sampleCivilization(), era: 'antiquity' }],
        }).build();

        expect([built.units, built.civilizations]).toEqual([[], []]);
    });
});

/** The same unit reachable from a second building, which the game stores as its own id. */
function withSecondBuilding(): Partial<DatasetFixtureInput> & Pick<DatasetFixtureInput, 'game'> {
    const game = sampleGameData();
    game.civilizations[1].units.set(76, genieUnit({ id: 76, nameStringId: STRING_IDS.militiaUnit }));

    const tree = sampleTechTree();
    tree.civ_techs_units.push(
        techTreeNode({ 'Node ID': 76, 'Name String ID': STRING_IDS.militiaName, 'Building ID': 82 }),
    );

    return { game, trees: [tree], strings: sampleStrings() };
}
