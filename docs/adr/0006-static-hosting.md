# 0006 — Static hosting with a hash router

**Status:** Accepted

## Context

The guide has no backend and never will: the dataset is committed and every calculation runs in the
browser. It should be free to host and it should survive being served from a subpath, which is what
GitHub Pages gives a project site.

## Decision

The app is a static bundle. Routing uses React Router's hash router, so every route resolves from
one `index.html` with no server rewrite rules. Vite is configured with `base: './'`, and any URL the
code builds goes through `assetUrl()`, which prefixes `import.meta.env.BASE_URL` — the app never
hard-codes an absolute path.

Deployment is a workflow step: release-please cuts the release, and the same run builds the bundle
and publishes it to Pages.

## Consequences

- No hosting bill, no server to keep alive, and the site can be dropped in any static folder.
- URLs carry a `#`, which is a small aesthetic cost and keeps deep links working anywhere.
- The whole roster ships in the initial bundle, so the first load is heavier than a data-fetching
  app — and every load after it needs no network at all.
