# 0008 — One shape for every filter row, and every field keeps its label

**Status:** Accepted

## Context

Four screens narrow a list: the roster, the technologies, the civilizations and a unit's matchups.
They grew apart. Three of them stacked every filter as a labelled field in a grid — a caption over a
control, one per column — while the fourth had already moved to a search box over a row of small
buttons. A reader who had just learnt one screen arrived at the next and found the same job done in
a different shape.

The tempting fix was to drop the captions and let placeholders carry the naming, which is denser and
wrong. A placeholder is not a label: it vanishes the moment someone types, it is grey enough to read
as disabled, and it leaves a field that has been filled in with nothing on screen saying what it
holds. The density has to come from somewhere else.

A second confusion sat underneath it. The same labelled-field component was being used for two
different jobs: narrowing a list, and asking the question a page exists to answer. Those deserve
different weight, and giving them the same one made the filters look like content.

## Decision

**Every field carries a visible label.** A caption above the control, tied to it by `for` and `id`,
present on screen and not only for assistive technology. The placeholder is an example of what to
type, never the name of the field. `SearchField` has no way to switch this off.

A list is then narrowed in exactly two parts, in this order:

1. **One name filter**, full width, labelled.
2. **One row of chips** that wraps, holding everything else. A choice is a picker that carries its
   own name *inside* the button — `Type: All` — which is how a chip satisfies the label rule without
   a caption above it. An on-or-off filter is a button with `aria-pressed` whose text is its name.
   They are the same size and the same shape, so the row reads as one control group rather than as a
   form.

The chips are ordered by how much of the list they cut, widest first. Anything that changes what is
in the list at all — the civilization whose roster is being drawn from, for instance — comes before
the choices that only sort or narrow it.

A control that selects *what a page is about* is not a filter and does not join the row. It stays a
labelled field in a grid, because it is the page's subject rather than a way of looking at it.

Three components carry this, and pages do not hand-roll the markup: `SearchField`, `FilterPicker`
and `FilterToggle`. `Directory` takes the two parts as separate inputs — `search` and `filters` — so
a page cannot accidentally put them in one row.

## Consequences

- The four screens are learnt once, and every control says what it is whether or not it has been
  filled in.
- The chips survive translation better than a grid: a long Portuguese label wraps the row instead of
  stretching a column.
- The density comes from the chips, not from deleting captions. A row of six chips is about a third
  the height of six stacked fields, and the name filter keeps its caption on top of that row.
- The filter's name lives inside the chip, so its accessible name is `label: value` rather than the
  label alone. Tests that looked controls up by label text have to look them up by role and name.
- A page with many filters gets a two or three line chip row rather than a tidy grid. That is the
  trade: density and one shape everywhere, against the alignment a grid would give.
- The distinction between a filter and a subject has to be made deliberately. When it is unclear,
  the question to ask is whether the control changes *which rows are shown* or *what the page is
  showing at all*.
