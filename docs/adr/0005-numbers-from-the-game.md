# 0005 — Every number comes from the game, never from a hand-written table

**Status:** Accepted

## Context

The first version of the upgrades feature carried a hand-written table: forty technologies, each
with a target and a delta typed out by hand. It was wrong in ways that are hard to notice — a
missing target here, a stale value there — and it could never be complete, because a guide written
by hand goes out of date the moment the game is patched.

## Decision

Nothing about game balance is authored in this repository. The extraction reads the game's own
effect table: for every technology and every civilization bonus, the attribute touched, the mode
(add, set, multiply), the value, and the unit or unit class it reaches. The application applies
those commands the way the game declares them.

The same rule covers civilization bonuses. The game implements each passive bonus as a technology
bound to that civilization and researched for free at the start, so they are read from exactly the
same table rather than transcribed from the description text.

When the game's encoding is unusual, the decoder is the place that knows — not a special case
sprinkled through the services. Two examples live in the extractor: attack and armour pack the
damage class into the value as `class * 256 + amount`, and a multiplier on those two is written as a
whole percentage while every other multiplier is a plain float.

## Consequences

- Coverage is whatever the game has, not whatever somebody remembered: 121 of 192 technologies carry
  a modelled effect, plus 1,229 civilization bonus effects across 44 civilizations.
- A balance patch is picked up by re-running the extraction.
- The guide inherits the game's own quirks, including effects it marks as doing nothing by setting a
  value to −1. Those are dropped in one place, where the reason can be written down.
- Effects outside a soldier's stat line — costs, creation speed, building work rates — are read but
  not modelled, and a technology whose only effect is one of those is shown as reaching the unit
  without a number attached.
