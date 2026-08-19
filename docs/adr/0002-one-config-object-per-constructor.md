# 0002 — One typed config object per constructor

**Status:** Accepted

## Context

Services depend on each other: the matchup service needs combat, upgrades and the catalog; the
economy service needs the catalog and a gather model. Passed as positional arguments, those
dependencies become an ordering puzzle at every call site, and adding one means editing every
caller.

## Decision

Every class takes exactly one parameter: a config object typed by an exported
`<ClassName>Config` interface. Dependencies are injected, never constructed inside the class.
Concrete instances are wired in one place, `src/composition-root.ts`, which is the only file that
knows the real shape of the graph.

Fields holding dependencies are `private readonly`. Required and optional are distinguished by the
type, not by argument order.

## Consequences

- A test builds a service with whatever collaborators the case needs, and nothing else.
- Adding a dependency is one field in one interface; call sites that already pass an object keep
  compiling.
- The composition root is the single place to look for what the application actually runs with.
- Small classes pay for a config interface they barely need, which is the price of the rule being
  unconditional.
