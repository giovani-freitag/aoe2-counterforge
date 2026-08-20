# 0008 — One shape for every filter row

**Status:** Accepted

## Context

Four screens narrow a list: the roster, the technologies, the civilizations and a unit's matchups.
They grew apart. Three of them stacked every filter as a labelled field in a grid — a caption over a
control, one per column — while the fourth had already moved to a search box over a row of small
buttons. On a phone the difference was not cosmetic: three stacked fields cost about four hundred
pixels of screen before the first row of results, and the same filters as chips cost a hundred and
fifty. A reader who had just learnt one screen arrived at the next and found the same job done in a
different shape.

A second confusion sat underneath it. The same labelled-field component was being used for two
different jobs: narrowing a list, and asking the question a page exists to answer. Those deserve
different weight, and giving them the same one made the filters look like content.

## Decision

A list is narrowed in exactly two parts, in this order:

1. **One name filter**, full width, its label present for assistive technology and hidden on screen
   because the placeholder already says what it is.
2. **One row of chips** that wraps, holding everything else. A choice is a picker carrying its own
   name inside the button (`Type: All`); an on-or-off filter is a button with `aria-pressed`. They
   are the same size and the same shape, so the row reads as one control group rather than as a
   form.

The chips are ordered by how much of the list they cut, widest first. Anything that changes what is
in the list at all — the civilization whose roster is being drawn from, for instance — comes before
the choices that only sort or narrow it.

A control that selects *what a page is about* is not a filter and does not join the row. It stays a
labelled field in a grid, because it is the page's subject rather than a way of looking at it.

Three components carry this, and pages do not hand-roll the markup: `SearchField` with `hideLabel`,
`FilterPicker`, and `FilterToggle`. `Directory` takes the two parts as separate inputs — `search`
and `filters` — so a page cannot accidentally put them in one row.

## Consequences

- The four screens are learnt once. The chips also survive translation better: a long Portuguese
  label wraps the row instead of stretching a column.
- Roughly two hundred and fifty pixels of a phone screen go back to the list on the pages that were
  stacking fields.
- The filter's name lives inside the button, so its accessible name is `label: value` rather than
  the label alone. Tests that looked controls up by label text have to look them up by role and
  name.
- A page with many filters gets a two or three line chip row rather than a tidy grid. That is the
  trade: density and one shape everywhere, against the alignment a grid would give.
- The distinction between a filter and a subject has to be made deliberately. When it is unclear,
  the question to ask is whether the control changes *which rows are shown* or *what the page is
  showing at all*.
