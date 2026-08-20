# How the counters are calculated

The ranking is a simulation, not a table somebody typed out. Every matchup runs the game's own
damage formula over the two stat lines and compares what each side destroys per second.

## The four steps

1. **Damage per hit** uses the game's formula: for every armour class the two sides share, attack
   minus armour; sum them; a floor of 1 damage. Negative armour increases the damage taken, as in
   the game.
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
takes the technologies and bonuses of the civilization you picked, if you picked one.

## How the list is read

Favourable, unfavourable and complete are three views of one ranking rather than three lists, so the
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
