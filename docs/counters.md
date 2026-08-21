# How the counters are calculated

The ranking is a simulation, not a table somebody typed out. Every matchup runs the game's own
damage formula over the two stat lines and compares what each side destroys per second.

## The four steps

1. **Damage per hit** uses the game's formula: for every armour class the two sides share, attack
   minus armour, floored at zero so that armour cancels a class rather than eating the damage of
   the others. A handful of units carry a negative amount in a class on purpose — the game's way of
   saying a weapon does less against those — and those survive to the sum, as does negative armour,
   which increases the damage taken. A class the defender does not carry falls back to the value
   the game keeps for that case, which almost every unit sets far above any attack. The total is
   floored at 1: a hit always hurts. A shot that puts more than one missile in the air resolves
   each of them separately, and floors each separately — which is why a weapon with a second arrow
   keeps hurting a target whose armour cancels the first. Only a weapon whose extra missile carries
   a damage list of its own counts as a volley; a siege weapon also declares several projectiles,
   but those are the pieces of one blast.

   Two of the game's own exceptions ride on top. A weapon built to go through armour skips the two
   base classes and nothing else, unless the defender is one of the units built to hold against
   exactly that. And a unit can carry resistance to bonus damage, which scales down every class
   except the base ones after their armour has already been taken off — what it resists is damage,
   not attack.
2. **DPS** applies accuracy for ranged units and divides by the reload time. An accuracy recorded as
   zero (Rocket Cart, Petard, fire ships) means the game resolves that projectile through a special
   case rather than the accuracy roll, so it is read as always hitting instead of never hitting.
   One-shot units, with a reload of zero, have no sustained DPS.
3. **Range** enters as exposure. The outranged side spends part of the fight unable to answer, in
   proportion to the time it takes to close the gap. Losing the speed race on top of the range gap
   adds the kiting penalty, because the approach never ends.
4. **Trade efficiency** compares how much value each side destroys per second, with gold and stone
   weighted above food and wood. Past four to one the fight grows by its logarithm rather than in a
   straight line: a Rocket Cart needs eleven minutes to kill the cavalry that kills it in five
   seconds, and the difference between a hundred to one and thirty to one is not something anyone
   can act on. Nothing is cut off, so the order still holds and no two fights collapse into the same
   number — the runaway end simply stops drowning out the matchups worth thinking about.

Both sides are rated fully upgraded by default — you can face any civilization — and the subject
takes the technologies and bonuses of the civilization you picked, if you picked one and if it can
train the unit. On a unit it cannot train, the civilization is ignored rather than applied: the
Paladin a Mesoamerican player meets belongs to whoever fielded it, and stripping it of every
upgrade that reader's own civilization happens to lack would invent a unit nobody can build.

The opposition can be narrowed to what that civilization trains, and then it is rated with that
civilization's upgrades and bonuses rather than generically. On a unit your civilization cannot
build the list starts that way, because nobody opens an enemy unit to read how it fights for them.

## How the list is read

Strong, weak and complete are three views of one ranking rather than three lists, so the
tab holds a single card, named after the unit whose page it is: the switch above the rows picks
which end of it you are looking at, and each side carries how many matchups it holds. The name filter, the unit type and the opponent breadth apply to
all three.

Breadth decides who is in the ranking at all:

| Breadth | Who is in it |
|---|---|
| Common | One representative per line, only what most civilizations train (~11 opponents) |
| Include unique units | One representative per line, now with the unique units (~95) |
| Every version | Each step of each line on its own (~190) |

A search that finds nothing at the current breadth offers the widest one rather than a dead end.

There is no ceiling on efficiency. Across all thirty-seven thousand pairs the median is an even
trade, nine in ten land under 5x, and the most lopsided fight in the game reaches 75x.

## Whose side a row is on

A row names the opponent, so everything on its left describes that opponent: more or less range, a
minimum range, splash damage, faster or slower, and which way the bonus damage runs. The right side
belongs to the unit whose page you are on — the trade ratio and the verdict — and the column
headings say so, because the two halves of a row are about two different units.

## What the model does not do

It is one unit against one unit. It does not model mass battles, focus fire, area damage over a
group, monk conversions or perfect micro. Units that only exist to knock down buildings (Trebuchet,
Petard) are left out of the ranking, and units with no attack (Monk) show an explanation instead of
a simulation.

The result is always shown next to the game's own summary, and the damage breakdown for any matchup
is one tap away.
