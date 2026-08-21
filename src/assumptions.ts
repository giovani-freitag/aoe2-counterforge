/**
 * Every number this guide writes down rather than reads.
 *
 * The game states what a unit costs, how fast it shoots and how much a villager gathers, and all
 * of that is extracted rather than typed. What the game does not state, the guide has to decide:
 * how far a villager walks to a drop-off, how many exchanges a skirmish stands for, where the line
 * between a favourable trade and an even one falls. Those decisions live here, one scalar each,
 * with the reason written beside them.
 *
 * The shape is deliberately narrow. A number that belongs in the game's own files cannot be
 * smuggled in as a table, because there are no tables here: a gather rate would cost eight entries
 * and eight sentences claiming the game is silent about it, all visible in one diff, all false.
 */
export interface Assumption {
    value: number;
    reason: string;
}

export const ASSUMPTIONS = {
    foodWeight: { value: 1, reason: 'Food is the unit the other three resources are priced against.' },
    woodWeight: { value: 1, reason: 'Wood is as renewable as food, so it trades against it one for one.' },
    goldWeight: {
        value: 1.6,
        reason: 'Gold cannot be farmed, so a gold-heavy unit has to earn more than its food price.',
    },
    stoneWeight: {
        value: 1.6,
        reason: 'Stone is scarcer than gold and buys defences the guide does not model.',
    },
    dominantTrade: { value: 2, reason: 'Twice the value destroyed is where a matchup stops being close.' },
    favourableTrade: { value: 1.25, reason: 'A quarter more value is the smallest edge worth naming.' },
    evenTrade: { value: 0.8, reason: 'Below this the trade is losing, above it the two sides are trading.' },
    unfavourableTrade: { value: 0.5, reason: 'Half the value destroyed is where a matchup becomes a counter.' },
    maxFreeHits: {
        value: 6,
        reason: 'A ranged unit closing a gap cannot land more than a handful of unanswered shots.',
    },
    kiteRepeats: {
        value: 3,
        reason: 'How many approach-and-shoot exchanges one skirmish stands for.',
    },
    commonOpponentCivs: {
        value: 20,
        reason: 'A unit most civilizations train is one you can expect to meet; below this it is a surprise.',
    },
    dropOffTilesNearby: {
        value: 2,
        reason: 'Tiles from a farm or a sheep to the drop-off. The game states no distance.',
    },
    dropOffTilesOrdinary: {
        value: 3,
        reason: 'Tiles from a bush, a tree, a mine or the shore to the drop-off. The game states no distance.',
    },
    dropOffTilesHunt: {
        value: 4,
        reason: 'Tiles from a boar or deer to the drop-off, which sit further out than the rest.',
    },
} as const satisfies Record<string, Assumption>;
