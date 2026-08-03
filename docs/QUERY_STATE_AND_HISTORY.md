# Query State and History

This document describes synchronization between editable animation state and the browser URL, plus
the query-backed undo/redo model. The encoded data contract is documented in
[`QUERY_STRING_FORMAT.md`](./QUERY_STRING_FORMAT.md).

The authoritative implementations are:

- `src/composables/useSpiroAnimQS.ts` for encoding, decoding, and query history.
- `src/composables/useMainRoute.ts` for synchronization between `ROOT` and the browser URL.
- `src/features/editor/components/properties/` and Concepts controls for history-group boundaries.

## URL synchronization

`useMainRoute.ts` owns the main runtime synchronization:

- On startup, if `route.query.r` exists, it decodes the query and replaces `ROOT`.
- A watcher on `ROOT` encodes the complete current animation and calls `router.replace()`.
- `router.replace()` updates the current browser history entry rather than adding an entry for
  every edit.
- `qsPause` can suppress ROOT-to-URL writes, although normal property controls do not toggle it.
- Route query changes after initial startup are tracked for subsequent path replacements, but the
  composable does not continuously decode every later query change back into `ROOT`.

Because `ROOT` is a `shallowRef`, nested edits must call `triggerRef(ROOT)`. Replacing `ROOT.value`
directly, as Concepts generation and undo do, triggers watchers naturally.

## Query-backed undo and redo

Undo history stores canonical encoded query strings rather than object snapshots. It is session
state and is not persisted.

- Identical consecutive encodings are deduplicated.
- A new edit clears redo history.
- History is capped at 500 entries.
- Undo moves the current entry to `qsFuture` and decodes the preceding entry.
- Redo moves an entry back and decodes it.
- `qsSkip` prevents the ROOT update caused by undo/redo from immediately adding a duplicate history
  entry.

Continuous decimal interactions use `beginHistoryGroup()` and `endHistoryGroup()`. The original
state and final encoded state remain, while intermediate slider/input events replace the same
history slot. Controls that make one discrete write generally do not need grouping.

Since undo snapshots are query strings, fields omitted by the active format are also omitted from
undo snapshots. Query-format coverage therefore defines undo coverage.

## Interaction boundaries

Editor decimal sliders start a history group on pointer-down or key-down. Pointer-up,
pointer-cancel, key-up, or blur closes the group. Manual decimal input starts one group on focus and
ends it on blur.

VTG and Quarter Spacing use the same gesture boundary for their Scale, Thick, and BPM sliders.
Discrete controls, including checkboxes and matrix selections, normally produce one write and do
not need an explicit group.

## Regression coverage

Changes to state synchronization or history should cover:

- Initial URL hydration.
- ROOT-to-URL replacement after nested mutations and full ROOT replacement.
- Gesture grouping and retention of only the original and final states.
- Undo, redo, deduplication, history limits, and redo invalidation.
- Fields intentionally omitted from query and undo coverage.
- Canonical re-encoding after historical or malformed input is decoded.
