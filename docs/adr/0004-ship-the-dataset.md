# 0004 — The dataset is extracted once and committed

**Status:** Accepted

## Context

Every number and icon in the guide comes out of an installed copy of the game. Reading it at
runtime is impossible in a browser, and fetching it from a third-party API would tie a static site
to somebody else's uptime, rate limits and licensing.

## Decision

Extraction is an offline step. `npm run data:build` and `npm run data:icons` read the install and
write `src/data/generated/` and `public/img/`, and both are committed. The application imports the
JSON as a module and requests no data at runtime.

The scripts read the install path from `AOE2_GAME_ROOT`, which lives in an untracked `.env`. Nobody
needs the game to run, build or test the app — only to regenerate the data.

## Consequences

- The site is a folder of static files: no server, no API key, no runtime dependency.
- A patch to the game means re-running two scripts and reviewing a diff — and that diff is readable,
  which is how balance changes get noticed.
- The repository carries a few megabytes of icons.
- `tests/feature/extract/game-install.test.ts` re-runs the extraction and compares it against the
  committed dataset, so drift is caught; it skips itself when no install is available.
