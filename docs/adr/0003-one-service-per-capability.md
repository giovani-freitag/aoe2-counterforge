# 0003 — One service per capability, one entrypoint each

**Status:** Accepted

## Context

"Where does this belong?" is the question that decides whether a codebase stays navigable. Without
an answer written down, ranking logic ends up half in a component and half in a helper module, and
two files grow the same function.

## Decision

Each capability owns a folder under `src/services/`, and the folder holds exactly one entrypoint
named after it: `services/<domain>/<domain>-service.ts`, exporting a class suffixed `Service`.
Helpers of that capability live in the same folder and never carry the suffix.

The capabilities today:

| Service | Owns |
|---------|------|
| `GameCatalogService` | The only read path into the dataset |
| `GameTextService` | Localised names and descriptions |
| `CombatService` | Damage per hit, DPS, hits and time to kill |
| `MatchupService` | Counter ranking and trade efficiency |
| `UnitRankingService` | Sorting the roster by any stat |
| `UpgradeService` | Which technologies reach a unit, and the resulting stat line |
| `EconomyService` | Villagers per resource for continuous production |
| `SearchService` | The search index, per locale and per civilization |

`tests/arch/layering.test.ts` asserts the file layout, so a service in the wrong place fails the
suite rather than review.

## Consequences

- Reading the folder list is enough to know what the application can do.
- A capability can be rewritten behind its entrypoint without touching callers.
- Some services are thin. That is acceptable: the cost of a small file is lower than the cost of
  ambiguity about where its logic belongs.
