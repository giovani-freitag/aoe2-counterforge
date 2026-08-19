# 0001 — The logic does not know React exists

**Status:** Accepted

## Context

The guide is mostly arithmetic: damage formulas, trade efficiency, gather rates, technology
effects. That arithmetic is the part worth testing, the part worth reading twice, and the part most
likely to outlive the current interface. Written inside components it would be reachable only
through a renderer, tested only through the DOM, and impossible to move.

## Decision

Domain entities, value objects and services are plain TypeScript classes. They never import React,
never import from `src/react/`, and never touch `window` or `document`. React reaches them through
thin hook adapters (`useMatchups`, `useProductionPlan`, `useUnitUpgrades`) whose only job is to
memoise a call and hand back the result.

The boundary is machine-checked twice: `eslint.config.js` bans the imports and the globals in those
folders, and `tests/arch/layering.test.ts` reads the files and asserts the same thing.

## Consequences

- Every calculation is unit-testable without a renderer, and the suite runs in milliseconds.
- A component that needs a number has to ask a service for it, which keeps derived state out of the
  render tree.
- There is real indirection: a new field has to travel through the record type, the entity, the
  service and the hook before a component can show it.
- Effects that are genuinely visual — the ember field, the specular highlight — still live as
  framework-free classes under `src/react/effects/`, adapted by their own hooks.
