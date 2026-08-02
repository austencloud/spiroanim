# Animation Frame Model

This document describes how editable animation frames become compiled animation data, how the
worker interprets that data, and the invariants required by frame-management operations such as
Shift.

The authoritative implementations are:

- `src/math/animation/AnimFunc.ts` for compilation.
- `src/math/animation/OrthogonalFunc.ts` for chained spherical rotations.
- `src/workers/animation/createSpiroAnimator.ts` for playback and path rendering.
- `src/composables/useSpiroAnimQS.ts` and `src/services/query/versions/` for query-string
  serialization.

## Frames and displayed segments

An animation with `N` editable frames has `N - 1` displayed segments.

For a segment at index `i`, the worker calls the current compiled frame `p1` and the next compiled
frame `p2`:

```text
compiled[i] ------ displayed segment i ------> compiled[i + 1]
     p1                                               p2
```

The final frame is an endpoint. Its `beats` value is not used unless a management operation moves
that endpoint to a position from which a segment leaves.

The first raw frame is also special. There is no editable frame before it. The compiler calculates
it from the fixed application basis:

- Initial point: `PPOS[PNTIND.MBC]`
- Initial orthogonal reference: `PPOS[PNTIND.ML]`

Consequently, removing the first raw object does not make the old second compiled frame become the
new starting state. Its relative angles would instead be applied directly to the fixed basis.
Operations that change the first frame must reconstruct it.

## Raw values, defaults, and inheritance

`AnimData` is sparse. A missing property either inherits from the preceding frame or uses a
per-frame default. These are different behaviors.

| Property |     First-frame default | Later frame when undefined | Role                                                      |
| -------- | ----------------------: | -------------------------- | --------------------------------------------------------- |
| `turns`  |                     `0` | Inherit                    | Incoming rotation amount                                  |
| `beats`  |                     `1` | Inherit                    | Duration of the outgoing segment                          |
| `scale`  |                    `10` | Inherit                    | State at this frame                                       |
| `depth`  |                     `0` | Inherit                    | State at this frame                                       |
| `type`   |               Spherical | Inherit                    | Incoming transition type                                  |
| `adjust` |                     `0` | Inherit                    | Adjusted rotation state                                   |
| `arc`    |                     `0` | Inherit                    | Incoming position arc and spherical rotation contribution |
| `plane`  |                     `0` | Always default to `0`      | Incoming position plane                                   |
| `axis`   | Current frame's `plane` | Current frame's `plane`    | Incoming rotation axis                                    |
| `move`   |             `[0, 0, 0]` | Always default to zero     | Per-frame offset delta                                    |

`plane`, `axis`, and `move` do not inherit from the preceding frame. A repeated nonzero `plane`
therefore cannot be deleted merely because the previous frame used the same value. `axis` can be
deleted when it equals the current frame's `plane`.

`rootCompile()` JSON-clones the root before filling inherited values, so compilation does not
expand the editor's sparse source objects.

## Compilation

Each prop starts with separate position and rotation state:

```text
position = InitialPoint
position reference = InitialOrtho
rotation = InitialPoint
rotation reference = InitialOrtho
```

For every frame, the compiler calculates:

```text
position arc = radians(arc)
rotation amount =
  radians(turns) + radians(arc)   for Spherical
  radians(turns)                  for Linear
```

`orthoNext()` performs a chained rotation:

1. Convert `plane` or `axis` into an orthogonal point relative to the current source and reference.
2. Cross the source with that point to produce the rotation direction.
3. Rotate the source around that direction.
4. Transport the orthogonal reference to the new source for the next frame.

The resulting direction vectors are saved as:

- `posx`: axis used for the frame's incoming spherical position arc.
- `rotx`: axis used for the frame's incoming rotation.

These vectors are essential data. Matching only the compiled `pos` and `rot` endpoints is not
enough to preserve a path: different `posx` or `rotx` values can connect identical endpoints along
different three-dimensional arcs.

The compiler also creates:

```text
adju = rot rotated around rotx by adjust
```

`adju` is the adjusted orientation used by smooth rotation blending.

## Worker ownership of values

A displayed segment combines values from both endpoint frames.

| Behavior                       | Source                                              |
| ------------------------------ | --------------------------------------------------- |
| Segment duration               | `p1.beats`                                          |
| Starting position and rotation | `p1.pos`, `p1.rot`                                  |
| Starting adjusted rotation     | `p1.adju`                                           |
| Starting scale and depth       | `p1.scale`, `p1.depth`                              |
| Transition type                | `p2.type`                                           |
| Spherical position path        | Rotate `p1.pos` around `p2.posx` by `p2.arc`        |
| Linear position path           | Interpolate `p1.pos` to `p2.pos`                    |
| Rotation path                  | Rotate `p1.rot` around `p2.rotx`                    |
| Rotation amount                | `p2.turns + p2.adjust`, plus `p2.arc` for Spherical |
| Ending scale and depth         | `p2.scale`, `p2.depth`                              |

The same setup routine is used for playback and for constructing visible path/hand lines. A
management operation must therefore preserve the incoming axes on the new `p2`, not just its final
coordinates.

## Move offsets

`move` is a delta, not an inherited state. Before playback, the worker creates cumulative offsets:

```text
offset[0] = move[0]
offset[i] = offset[i - 1] + move[i]
```

A segment interpolates from `offset[i]` to `offset[i + 1]`.

When the old second frame becomes the new first frame, its original world offset is
`move[0] + move[1]`. Shift writes that sum into the new first frame. Later shifted frames retain
their incoming move deltas, and the moved first segment retains the old `move[1]` delta at the new
end.

## Query-string sparsity

Each frame is encoded independently. Undefined fields use the reserved all-ones bit pattern, and
trailing undefined groups are stripped. Consecutive empty frames therefore add only their dot
separators.

After a management operation, frames should be compacted against the same rules used by the
compiler:

- Delete inherited values when they equal the preceding effective value.
- On the first frame, delete inherited values when they equal their first-frame default.
- Delete `plane` only when it is zero.
- Delete `axis` only when it equals the current frame's `plane`.
- Delete `move` only when all three coordinates are zero.

Version 1 query values are integer-based. Derived floating-point noise near an integer must be
snapped before it reaches the editor or serializer.

## Shift

Shift rotates one displayed interval to the end. Let the original compiled states be:

```text
C0, C1, C2, ... Cn
```

Eligibility requires at least three frames and:

```text
C0.pos == Cn.pos
C0.rot == Cn.rot
```

Comparisons use a small floating-point tolerance. Raw object equality is not meaningful because
frames can express the same result through inheritance or equivalent rotations.

The shifted compiled state order is:

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

Shift changes the timeline's starting point while leaving the complete spatial position and
rotation paths where they were.

The new first frame's incoming path is not displayed, so a minimal position and rotation are used.
Its adjustment is re-expressed around the reconstructed rotation axis.

Durations belong to the segment's starting frame, so the used duration order becomes:

```text
old beats 1, old beats 2, ... old beats n - 1, old beats 0
```

The unused final `beats` value repeats old frame 0 so it can normally remain sparse and repeated
Shift operations continue rotating durations correctly.

When several props are selected, eligibility and reconstruction are calculated for every prop
before any root data is changed. The UI applies the results atomically; one ineligible selected
prop disables the operation for all selected props.

### Timeline selections

When timeline selection mode is active, Shift operates only on each selected prop's frames within
the selected time range. That range must contain at least three frames and its compiled first and
last position and rotation must match, just like a complete animation.

A selected range can begin after frame 0. Its reconstructed first frame therefore starts from the
preceding compiled frame and the position and rotation references transported by that frame. The
shifted raw range is compacted against the preceding frame's effective inherited values, not
against first-frame defaults.

The selected loop's final position and rotation move with the shifted loop. Values used as the
starting state of the following, unselected interval retain their original final-range values:

- `beats`
- `scale`
- `depth`
- `adjust`
- cumulative `move`

The old final `move` delta has already moved earlier in the shifted range, so the new final frame
uses a zero delta to keep the cumulative offset at the following frame unchanged. Rotating the
visible durations preserves the selection's total duration, and retaining the final outgoing
`beats` value keeps every later frame at its original timeline time. After timing is recalculated,
the selection handles are restored to those same boundary times.

## Closure scope and unavoidable seam differences

Shift intentionally gates on compiled position and base rotation because those are the requested
loop invariants. It does not require the first and last frame to match scale, depth, adjustment, or
cumulative move offset.

If those additional states differ at the original seam, no cyclic reorder can preserve both
adjacent segments perfectly: one output frame would need to be the old final state for the segment
arriving at it and the old first state for the segment leaving it. The current behavior rotates the
compiled keyframe states and preserves the requested position/rotation path. Authors who need a
fully seamless loop should also make scale, depth, adjustment, and offset agree at the original
first and last frames.

## Regression coverage

Shift tests cover:

- Position and rotation closure checks.
- Rejection when either endpoint invariant fails.
- Reconstructed starting state.
- Preservation of incoming `posx` and `rotx` segment axes.
- Rotation of segment durations.
- Cumulative move handling.
- Closed timeline-range shifting and preservation of its outgoing boundary values.
- Sparse raw output.
- Atomic multi-prop behavior.
- A two-prop VTG pattern through query-string encode/decode.
