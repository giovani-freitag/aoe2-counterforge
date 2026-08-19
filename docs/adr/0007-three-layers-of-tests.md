# 0007 — Three layers of tests, one of them structural

**Status:** Accepted

## Context

The risks in this codebase are of three different kinds, and one kind of test does not catch all
three. A damage formula can be quietly wrong. An extraction can drift from the committed dataset.
An architectural rule can be broken by a single convenient import.

## Decision

Tests live under `tests/`, in a folder per kind, mirroring the source path:

- **`unit/`** — one class at a time, collaborators stubbed. This is where the arithmetic is pinned.
- **`feature/`** — several pieces together with real data, mocking only what crosses a boundary.
  This is where the shipped dataset is checked against the game it came from.
- **`arch/`** — rules read off the source files: layer boundaries, service file layout.

Files are named `*.test.ts`; the folder says what kind it is. Each test follows arrange–act–assert
with one act, separated by blank lines rather than comments.

## Consequences

- A broken rule fails the suite instead of waiting for someone to notice it in review.
- The extraction test needs the game installed, so it skips itself elsewhere — including in CI,
  where the committed dataset is taken as given.
- Three folders means deciding where a test goes; the mirroring rule usually answers it.
