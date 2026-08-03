# Documentation Index

Use this index to find the document that owns a behavior before changing it. Keep each guide
focused on its named responsibility, and link to related guides instead of duplicating their
details.

## Animation and editor data

- [`QUERY_STRING_AND_PROPERTY_MODEL.md`](./QUERY_STRING_AND_PROPERTY_MODEL.md) - overview of the
  complete control, state, compilation, URL, and history data path.
- [`PROPERTY_CONTROLS.md`](./PROPERTY_CONTROLS.md) - property metadata, forms, displayed
  inheritance, constraints, slider behavior, and control tests.
- [`ANIMATION_FRAME_MODEL.md`](./ANIMATION_FRAME_MODEL.md) - sparse frame defaults, inheritance,
  compilation, worker ownership, move offsets, and safe compaction.
- [`SHIFT.md`](./SHIFT.md) - Shift eligibility, endpoint warnings, reconstruction, durations,
  timeline selections, seams, and regression coverage.
- [`QUERY_STRING_FORMAT.md`](./QUERY_STRING_FORMAT.md) - versioned URL schemas, packing, sparse
  encoding, defaults, decoder tolerance, and compatibility requirements.
- [`QUERY_STATE_AND_HISTORY.md`](./QUERY_STATE_AND_HISTORY.md) - ROOT/URL synchronization and
  query-backed undo/redo behavior.

## Concepts

- [`VTG_AND_QUARTER_SPACING.md`](./VTG_AND_QUARTER_SPACING.md) - VTG and Quarter Spacing controls,
  builders, transforms, matching, relationship classification, and headers.

## Web delivery

- [`SEO.md`](./SEO.md) - search-rendering boundary and build flow.
- [`PRERENDERING.md`](./PRERENDERING.md) - step-by-step checklist for adding a public page.
- [`PWA.md`](./PWA.md) - installation, offline behavior, service-worker updates, recovery, and PWA
  validation.
- [`APP_ICONS.md`](./APP_ICONS.md) - authoritative icon source, design contract, generation, and
  visual checks.
- [`HOSTING.md`](./HOSTING.md) - production route handling, cache rules, Cloudflare Pages behavior,
  and deployment validation.

## Change routing

| When changing...                                  | Start with...                  |
| ------------------------------------------------- | ------------------------------ |
| An editor slider, field, or property panel        | `PROPERTY_CONTROLS.md`         |
| Frame inheritance, compilation, or worker inputs  | `ANIMATION_FRAME_MODEL.md`     |
| The Shift operation                               | `SHIFT.md`                     |
| Encoded URL fields, ranges, bits, or versions     | `QUERY_STRING_FORMAT.md`       |
| URL hydration, replacement, undo, or redo         | `QUERY_STATE_AND_HISTORY.md`   |
| VTG or Quarter Spacing controls and relationships | `VTG_AND_QUARTER_SPACING.md`   |
| Public routes or search metadata                  | `SEO.md` and `PRERENDERING.md` |
| Installation, offline, or service-worker updates  | `PWA.md`                       |
| The application icon                              | `APP_ICONS.md`                 |
| Production routing, headers, or caching           | `HOSTING.md`                   |
