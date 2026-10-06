# 0010 — Every address names its language, English by default

**Status:** Accepted — amends [0009](0009-a-page-for-every-address.md)

## Context

[0009](0009-a-page-for-every-address.md) gave the default language, Brazilian Portuguese, the bare
address (`/unit/knight`) and every other language a folder (`/en/unit/knight`). With four languages
that made one of them the odd one out: an address could not be read for its language without
knowing which one happened to be the default, and the guide's own game names and fallback strings
are English anyway.

## Decision

**Every language lives in a folder named after it**, the default one included: `/en/`, `/es/`,
`/it/` and `/pt-br/`. **English is the default language**: the one the site root shows and the one
`x-default` points search engines at.

An address without a language — the site root, or a link shared while Portuguese owned the bare
address — is moved by the bundle to the same page in the language the reader chose, or in English
when they never chose one. The root is written as the English home page, with `/en/` as its
canonical address, so a crawler that runs no script still finds a page there.

## Consequences

- An address always says which language it is in, and the four languages are served alike.
- A bare address other than the root no longer has a file: GitHub Pages answers it with `404.html`,
  and the bundle then moves the reader to the page they asked for. Readers land where they meant
  to; search engines see the old bare addresses drop out and the new ones in the sitemap.
