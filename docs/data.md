# Where the data comes from

Everything the guide shows is read out of an installed copy of the game. The result is committed to
`src/data/generated/` and `public/img/`, so the app runs offline and asks nothing of the network at
runtime. See [ADR 0004](adr/0004-ship-the-dataset.md) for why, and
[ADR 0005](adr/0005-numbers-from-the-game.md) for the rule that nothing here is authored by hand.

## Regenerating it

Copy `.env.example` to `.env`, point `AOE2_GAME_ROOT` at the install folder — the one holding
`resources/` and `widgetui/` — and run:

```sh
npm run data:build   # attributes, costs, technologies, civilizations, localised strings
npm run data:icons   # only the icons the dataset actually references
```

Both are TypeScript running under `vite-node`, with no build step.

## What is read

| File in the install | What comes out of it |
|---|---|
| `resources/_common/dat/empires2_x2_p1.dat` | attributes, costs and times of units and technologies, and the effect table |
| `resources/_common/dat/CivTechTrees/*.json` | availability, age and building of every node, per civilization |
| `resources/_common/dat/civilizations.json` | the civilization list, in the order the data file numbers them |
| `resources/<language>/strings/key-value/` | official names and descriptions, in English and Portuguese |
| `widgetui/textures/` | unit, technology and civilization icons |
| `widgetui/textures/menu/` | age shields, the portrait frame and the resource icons |

## The binary

The `.dat` is a compressed file with no index: it is a sequence of records that only makes sense
read in order. `scripts/extract/binary-reader.ts` walks the fields in the exact order the game
writes them, and `scripts/extract/genie-dat.ts` validates each section before moving to the next.

Three encodings in that file are worth knowing about, because they look like ordinary numbers and
are not:

- **Attack and armour pack the damage class into the value**, as `class * 256 + amount`.
- **A multiplier on attack or armour is a whole percentage** (`125` means ×1.25), while every other
  multiplier is a plain float.
- **An effect that does nothing is written as setting a value to −1**, not as an absent effect.

## The icons

The textures ship as DDS, some of them BC1/BC3 compressed. `texconv.exe`, which the game itself
distributes in `Tools_Builds/`, decodes them at full size and `scripts/extract/image.ts` does the
rest.

The first step is player colour. An icon texture is opaque from edge to edge, so transparency in it
means something else: it marks the part of the unit that belongs to the player — the Militia's
tunic, the Knight's barding — and the grey kept underneath is the shading to paint it with. The
game resolves this while drawing; an image on a page has to resolve it beforehand, so the guide
paints every icon in the first player's blue.

Unit and technology textures are 256 px and are written out whole, with no pixel averaging anywhere
in the path. What keeps the weight down is the encoding: `sharp` reduces each icon to a 256-colour
palette, which changes nothing visible here because the art is a small crop of a rendered model, and
costs less than half of writing channel by channel. Civilization emblems come from a 104 px PNG and
are only re-encoded.

## What the dataset ends up holding

- Attributes and costs for 226 units and 192 technologies.
- Availability per civilization, derived from all 53 tech trees.
- Official names and descriptions in **English and Portuguese**, including the "Strong vs…" and
  "Weak vs…" lines written by the game's designers.
- Upgrade lines rebuilt from the upgrade links.
- The game's effect table: 121 of the 192 technologies carry a modelled effect, plus 1,229
  civilization bonus effects across 44 civilizations.
- Duplicate entries merged: several units exist twice in the game because a second building can
  train them (Donjon, Krepost, Stable), and the guide shows one entry listing both places.

## Reading the whole thing at once

`npm run data:export` writes everything the game's files carry into readable JSON, under the ids the
game itself uses. It has nothing to do with what the site ships: that dataset is curated and
committed, this one is faithful and large, and it exists so a question about the game can be
answered by reading a file instead of by opening the binary again.

Every table comes over: units with every field of every block, the tasks that say what a unit knows
how to do, technologies, effects, the connection table that draws the tech tree, terrain
restrictions, graphics, sounds, colours, the string tables, and the files the game keeps beside the
binary. The sixty civilization tables each carry the whole roster and all but a few thousand entries
are byte-identical, so the reference table is written once and only the differences beside it.

**Nothing in the binary is fixed width.** Every record is as long as its own contents say, so the
only way to reach the last table is to have read every field of every record before it correctly.
That is also the proof: the walk ends on the last byte of the file, with zero left over, and the
manifest records where each table ended. A single field read one byte wide too many or too few
moves that endpoint. The reader also refuses any revision but the one it was written for, because
the format's conditionals were resolved once, by hand, and a reader that re-derived them at run
time would re-open every one of them.

## The technology that never names the unit

Ballistics changes no archer. It sets a flag on the arrows, and the game files carry the missile
each unit fires, so an effect aimed at a projectile is read back onto whoever shoots it. Sixty units
turn out to be listed that way, and the reader who opens the Crossbowman is asking about the archer.

## What links a unit to a civilization

Two statements in the same install, and they agree. The civilization's tech tree lists the node,
which is the menu a player clicks; and the technology that switches the unit on carries the number
of the civilization it belongs to, which is the switch behind that menu. Seventy units carry both,
and `tests/feature/extract/game-install.test.ts` checks that all seventy match — joining a renamed
civilization back to the file through its emblem, which keeps the old name: Hindustanis to Indians,
Maya to Mayans.

Nothing switches on the units a game starts with — the Militia, the Villager, the Scout are simply
on — so the tree stays the source the dataset is built from, with the effect table as the check.

## The unit the trees leave out

A tech tree is a menu, and one soldier is not on it: the Xolotl Warrior, which a converted Stable
turns out for a civilization with no cavalry of its own. It ships anyway, and everything about it is
read rather than typed — a technology switches it on, that technology waits on the Castle Age, and
the building trains whatever its owner knows how to train, which is how it ends up listed for the
six civilizations whose Stable has no cavalry.

Three hundred other creatable units are left out, and the file says why for each kind:

- **Campaign characters** carry a hero flag. That is 176 of them, Richard the Lionheart through
  King Arthur.
- **Villagers at work** — the Lumberjack, the Farmer, the Shepherd — are the same villager drawn
  doing a job, and the trees already list the Villager.
- **Alternate stances** such as the melee Ratha and the barrage War Chariot carry no help text of
  their own and are created by the same button as the unit they belong to, which is already listed.
- **Scenario-editor units** — the Ninja, the War Dog, the Crusader Knight — are what is left, and
  nothing in the file connects them to a game: no tree, no technology, no unit they replace.

The Condottiero and the Genitour look like they belong here and do not: their owners' trees name
them, so they arrive with everyone else.

`tests/feature/extract/game-install.test.ts` re-runs the extraction and compares it against the
committed dataset. It only runs when `AOE2_GAME_ROOT` is set.
