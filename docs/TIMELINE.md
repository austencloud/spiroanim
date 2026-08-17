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
