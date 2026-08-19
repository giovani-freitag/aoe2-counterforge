import type { ArmourClass } from '../enums/armour-class.ts';

/** One entry of an attack or armour table: how much a given armour class is worth. */
export interface ClassAmount {
    readonly armourClass: ArmourClass;
    readonly amount: number;
}
