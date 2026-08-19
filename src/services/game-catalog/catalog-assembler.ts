import { Civilization } from '../../domain/entities/civilization.ts';
import { Technology } from '../../domain/entities/technology.ts';
import { Unit, type UnitUpgradeInfo } from '../../domain/entities/unit.ts';
import { toAgeId } from '../../domain/enums/age.ts';
import { isArmourClass } from '../../domain/enums/armour-class.ts';
import { isUnitCategory } from '../../domain/enums/unit-category.ts';
import { ArmourProfile } from '../../domain/values/armour-profile.ts';
import { AttackProfile } from '../../domain/values/attack-profile.ts';
import type { ClassAmount } from '../../domain/values/class-amount.ts';
import { ResourceCost } from '../../domain/values/resource-cost.ts';
import { TechEffect } from '../../domain/values/tech-effect.ts';
import { UnitStats } from '../../domain/values/unit-stats.ts';
import type {
    CivilizationRecord,
    ClassAmountRecord,
    CostRecord,
    TechnologyRecord,
    UnitRecord,
} from '../../data/records.ts';

/** Maps the flat generated records onto the domain entities the services work with. */
export class CatalogAssembler {
    /**
     * Builds a unit entity from its generated record.
     *
     * @param record - Raw unit row emitted by the dataset build.
     * @returns The unit with its cost and stat line already materialised.
     */
    public toUnit(record: UnitRecord): Unit {
        return new Unit({
            id: record.id,
            classId: record.classId,
            key: record.key,
            icon: record.icon,
            category: isUnitCategory(record.category) ? record.category : 'civilian',
            tags: record.tags,
            age: toAgeId(record.age),
            buildings: record.buildings,
            cost: this.toCost(record.cost),
            trainTime: record.trainTime,
            stats: new UnitStats({
                hp: record.hp,
                attack: new AttackProfile({ entries: this.toClassAmounts(record.attacks) }),
                armour: new ArmourProfile({ entries: this.toClassAmounts(record.armours) }),
                range: record.range,
                minRange: record.minRange,
                reloadTime: record.reloadTime,
                accuracy: record.accuracy,
                blastWidth: record.blastWidth,
                speed: record.speed,
                lineOfSight: record.lineOfSight,
            }),
            line: record.line,
            upgradesFrom: record.upgradesFrom,
            upgradesTo: record.upgradesTo,
            upgrade: this.toUpgradeInfo(record),
            civs: record.civs,
            uniqueTo: record.uniqueTo,
        });
    }

    /**
     * Builds a technology entity from its generated record.
     *
     * @param record - Raw technology row emitted by the dataset build.
     * @returns The technology entity.
     */
    public toTechnology(record: TechnologyRecord): Technology {
        return new Technology({
            id: record.id,
            key: record.key,
            icon: record.icon,
            age: toAgeId(record.age),
            building: record.building,
            cost: this.toCost(record.cost),
            researchTime: record.researchTime,
            civs: record.civs,
            effects: record.effects.map((effect) => new TechEffect(effect)),
        });
    }

    /**
     * Builds a civilization entity from its generated record.
     *
     * @param record - Raw civilization row emitted by the dataset build.
     * @returns The civilization entity.
     */
    public toCivilization(record: CivilizationRecord): Civilization {
        return new Civilization({
            key: record.key,
            icon: record.icon,
            era: record.era,
            uniqueUnits: record.uniqueUnits,
            uniqueTechs: record.uniqueTechs,
            bonuses: record.bonusEffects.map((effect) => new TechEffect(effect)),
        });
    }

    private toCost(record: CostRecord): ResourceCost {
        return new ResourceCost(record);
    }

    private toClassAmounts(records: readonly ClassAmountRecord[]): ClassAmount[] {
        return records
            .filter((record) => isArmourClass(record.class))
            .map((record) => ({ armourClass: record.class, amount: record.amount }) as ClassAmount);
    }

    private toUpgradeInfo(record: UnitRecord): UnitUpgradeInfo | null {
        if (record.upgradeTechId === null || record.upgradeCost === null) return null;

        return {
            techId: record.upgradeTechId,
            cost: this.toCost(record.upgradeCost),
            researchTime: record.upgradeResearchTime ?? 0,
        };
    }
}
