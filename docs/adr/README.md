# Architecture decisions

The rules this codebase is held to, one file per decision, in the order they were taken. Each one
records what the problem was, what was chosen, and what the choice costs — so a later change can
argue with the reasoning instead of guessing at it.

| # | Decision | Status |
|---|----------|--------|
| [0001](0001-logic-outside-react.md) | The logic does not know React exists | Accepted |
| [0002](0002-one-config-object-per-constructor.md) | One typed config object per constructor | Accepted |
| [0003](0003-one-service-per-capability.md) | One service per capability, one entrypoint each | Accepted |
| [0004](0004-ship-the-dataset.md) | The dataset is extracted once and committed | Accepted |
| [0005](0005-numbers-from-the-game.md) | Every number comes from the game, never from a hand-written table | Accepted |
| [0006](0006-static-hosting.md) | Static hosting with a hash router | Accepted |
| [0007](0007-three-layers-of-tests.md) | Three layers of tests, one of them structural | Accepted |
| [0008](0008-one-shape-for-every-filter.md) | One shape for every filter row | Accepted |

Two of these are enforced by tooling rather than by review: `eslint.config.js` fails the build when
`domain/` or `services/` reach for React or the DOM, and `tests/arch/layering.test.ts` reads the
source tree to check the same boundaries and the service file layout.
