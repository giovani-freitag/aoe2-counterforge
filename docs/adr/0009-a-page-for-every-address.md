# 0009 — A prerendered page for every address, in every language

**Status:** Accepted — supersedes [0006](0006-static-hosting.md); amended by [0010](0010-every-address-names-its-language.md)

## Context

To a search engine, the guide was one page. Everything after the `#` of a hash route stays in the
browser: it is never sent to a server and never indexed, so the units, technologies and
civilizations — the pages people actually search for — did not exist as addresses. The one address
that did exist arrived as an empty `<div>` waiting for a megabyte of JavaScript, with the same title
and description whatever it was about to show. And the language was read from the browser, so a
crawler only ever met one of the two.

The guide still has no backend, and GitHub Pages still serves nothing but files.

## Decision

**Routes are paths, and the language is part of the path.** The browser router replaces the hash
router. The default locale owns the bare address (`/unit/knight`), English lives under `/en/`
(`/en/unit/knight`). The address decides the language: the picker goes to the same page in the
other language, and remembers the choice so that a later visit to an address in the other language
is moved to the reader's. Crawlers keep no storage between pages, so they never see that move.

**Every address is written to a file at build time.** After `vite build`, `scripts/prerender.ts`
renders each route in each language with the static router and writes it into the template the
bundler produced. A page is `unit/knight.html`, not `unit/knight/index.html`: GitHub Pages answers
`/unit/knight` from the first directly, while the second makes every address without a trailing
slash a redirect. The same step writes `sitemap.xml`, `robots.txt` and the `404.html` GitHub Pages
answers unknown addresses with.

**Each page states its own head.** A page renders `<PageMeta>` with its title and description,
taken from the game's own summary where it has one. One description of the head feeds both the
static file and the live document, so the canonical address, the links to the other language, the
sharing card and the breadcrumb data are the same whether a crawler or a reader asked.

**The browser renders over the static markup instead of hydrating it.** The reader's stored
civilization and theme change what the first render shows, so hydration would mismatch for exactly
the readers who use the guide the most, and a mismatch renders from scratch anyway.

**The site knows its own address.** Canonical addresses must be absolute, and pages now sit at
different depths, so the base path is absolute too. Both come from `SITE_URL`, which defaults to
`homepage` in `package.json`.

## Consequences

- Every unit, technology and civilization is a page of its own a search engine can find, read
  without running a script, and show with its own title and description, in both languages.
- Links shared with a `#/` still work: the bundle rewrites them to the path they now have.
- The bundle no longer drops into any folder: it is built for one address. Moving the site, or
  giving it a custom domain, means rebuilding with `SITE_URL` set.
- A route added to the router is only written ahead of time once `pagePaths()` lists it.
- State kept in the query string — a unit's tab, a list's filters — is not written ahead of time,
  and shares the canonical address of the page it belongs to.
- `robots.txt` only counts at the root of a host. While the site is a project page under
  `github.io`, the sitemap has to be submitted in Search Console instead.
- The build writes close to a thousand pages and takes about half a minute longer.
