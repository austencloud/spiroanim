# Timeline

This document records Timeline-specific layout controls. Animation frame timing and selection are
documented in [`ANIMATION_FRAME_MODEL.md`](./ANIMATION_FRAME_MODEL.md), while Quick Slot behavior is
documented in [`QUICK_SLOTS.md`](./QUICK_SLOTS.md).

## Responsive columns

Timeline first calculates its normal responsive column count from the pane dimensions. The
persisted column offset is then added to that automatic result:

```text
final columns = clamp(automatic columns + offset, 1, 6)
```

The offset starts at `0`, has a minimum of `-3`, and a maximum of `5`. Zero therefore preserves the
automatic result. For example, an automatic result of four columns plus an offset of five still
renders the six-column maximum.

The minus, value, and plus control is centered over the bottom of Timeline independently of the
vertical scroll position. Its bottom spacing uses the same workspace offset as the pane-selection
control, and its surface is 50 percent transparent. Desktop tooltips use the shared Timeline
tooltip behavior; touch devices follow the tooltip component's existing mobile handling.

The authoritative state is `src/stores/useTimelineSettingsStore.ts`, and the layout consumer is
`src/components/SpiroAnim/AnimTimeline.vue`.

## Embedded surface lifetime

`src/views/SpiroAnim.vue` owns the single live Player used by the main Player view, Timeline, and
Builder. The pane components expose lightweight placement markers; the workspace keeps the
initialized Player in a stable layer and sizes that layer to the active marker. This preserves the
canvas, renderer worker, playback state, and camera state while the Player moves between those
contexts. Timeline and Builder continue to own their local pane controls and supply the placement
state used for Player control clearances.

The shared Player unmounts when none of those three contexts needs it. The same workspace surface
pattern keeps one Timeline instance alive while it moves between Editor and the main Timeline pane,
preserving its worker and scroll state. A pane hijack is different: its displaced view is unused and
fully unmounts, including Timeline's worker. Exiting the hijack mounts a fresh instance of the
restored view.
