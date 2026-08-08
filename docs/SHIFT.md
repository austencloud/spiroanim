# Shift

Shift moves the first displayed interval of every selected prop, or every selected timeline range,
to the end. This document describes its eligibility, reconstruction, timing, selection, and seam
behavior. Read [`ANIMATION_FRAME_MODEL.md`](./ANIMATION_FRAME_MODEL.md) first for the underlying
frame defaults, incoming axes, and worker ownership rules.

The authoritative implementations are:

- `src/math/animation/shiftAnimationFrames.ts` for endpoint checks and reconstruction shared by the
  editor and VTG generator.
- `src/features/editor/components/properties/manage/ShiftFrames.vue` for selection, warning, and
  atomic application behavior.
- `src/features/vtg/math/shiftVtgStartingBeat.ts` for applying the same operation to VTG's selected
  starting beat.

## Eligibility and endpoint warning

A target range requires at least three frames. The endpoint alignment check compares the compiled
first and last states with a small floating-point tolerance:

```text
C0.pos == Cn.pos
C0.rot == Cn.rot
```

Raw object equality is not meaningful because frames can express the same result through
inheritance or equivalent rotations.

Matching endpoints allow the spatial path to be shifted cyclically. Mismatched endpoints do not
disable Shift, but the UI warns before proceeding because the spatial path can change in unexpected
ways. The user can suppress later mismatch warnings for the current component lifetime.

When several props are selected, eligibility and reconstruction are calculated for every prop
before any root data is changed. The UI applies the results atomically; an invalid selected range
prevents the operation for all selected props.

## Closed-loop reconstruction

For aligned endpoints, let the original compiled states be:

```text
C0, C1, C2, ... Cn
```

The shifted position and base-rotation order is:

```text
C1, C2, ... Cn, C1
```

The incoming segment definitions on frames after the new first frame map as:

```text
old frame 2, old frame 3, ... old frame n, old frame 1
```

Their original `posx`, `rotx`, `arc`, transition type, turns, and adjustment are preserved. Because
`plane` and `axis` are relative to transported references, their raw degree values are recalculated
from those compiled axes.

Shift changes the timeline's starting point while leaving a closed loop's complete spatial
position and rotation paths where they were. The new first frame's incoming path is not displayed,
so a minimal position and rotation are used. Its adjustment is re-expressed around the
reconstructed rotation axis.

VTG's 1-4 starting-beat control applies this operation zero through three times. Beat 1 preserves
the authored cycle, Beat 2 applies Shift once, Beat 3 twice, and Beat 4 three times.

## Durations and outgoing state

Durations belong to the segment's starting frame, so the used duration order becomes:

```text
old beats 1, old beats 2, ... old beats n - 1, old beats 0
```

The UI requests preservation of the original final frame's outgoing values. The shifted final frame
therefore retains the old final `beats`, `scale`, `depth`, and `adjust` values needed by the next
unselected interval. For a whole animation, the final `beats` value remains unused until another
management operation moves that endpoint.

## Move offsets

The new first frame receives the sum of the old first and second `move` deltas so that it begins at
the old second frame's world offset. Later shifted frames retain their incoming deltas.

For a selected timeline range, the old final move delta has already moved earlier in the shifted
range. The new final frame therefore uses a zero delta to keep the cumulative offset at the
following frame unchanged.

## Timeline selections

When timeline selection mode is active, Shift operates only on each selected prop's frames within
the selected time range. The range must contain at least three frames. A mismatch between its first
and last compiled positions or rotations follows the same warning flow as a complete animation.

A selected range can begin after frame 0. Its reconstructed first frame therefore starts from the
preceding compiled frame and the position and rotation references transported by that frame. The
shifted raw range is compacted against the preceding frame's effective inherited values, not
against first-frame defaults.

The selected loop's final position and rotation move with the shifted loop. The final frame retains
the outgoing state used by the following unselected interval:

- `beats`
- `scale`
- `depth`
- `adjust`
- cumulative `move`

Rotating the visible durations preserves the selection's total duration, and retaining the final
outgoing `beats` value keeps every later frame at its original timeline time. After timing is
recalculated, the selection handles are restored to those same boundary times.

## Closure scope and unavoidable seam differences

Endpoint alignment checks compiled position and base rotation. It does not require the first and
last frame to match scale, depth, adjustment, or cumulative move offset.

If those additional states differ at the original seam, no cyclic reorder can preserve both
adjacent segments perfectly: one output frame would need to be the old final state for the segment
arriving at it and the old first state for the segment leaving it. The current behavior rotates the
compiled keyframe positions and rotations while preserving the selected range's outgoing boundary
state. Authors who need a fully seamless loop should also make scale, depth, adjustment, and offset
agree at the original first and last frames.

For mismatched position or rotation endpoints, the same reconstruction can still be requested, but
closed-loop path preservation is not guaranteed. That is why the UI requires confirmation.

## Regression coverage

Shift tests cover:

- Position and rotation endpoint checks and mismatch confirmation.
- Reconstructed starting state.
- Preservation of incoming `posx` and `rotx` segment axes for closed ranges.
- Rotation of segment durations.
- Preservation of the final outgoing properties.
- Cumulative move handling.
- Timeline-range shifting and restoration of its selection times.
- Sparse raw output.
- Atomic multi-prop behavior.
- A two-prop VTG pattern through query-string encode/decode.
- VTG starting beats 1-4 preserving the same closed position and rotation cycle.
