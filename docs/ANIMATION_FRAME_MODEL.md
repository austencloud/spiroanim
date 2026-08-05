# Animation Frame Model

This document describes how editable animation frames become compiled animation data, how the
worker interprets that data, and how sparse frames can be compacted safely. The Shift management
operation is documented separately in [`SHIFT.md`](./SHIFT.md).

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
| Linear position path           | Interpolate the scaled Cartesian endpoints          |
| Rotation path                  | Rotate `p1.rot` around `p2.rotx`                    |
| Rotation amount                | `p2.turns + p2.adjust`, plus `p2.arc` for Spherical |
| Ending scale and depth         | `p2.scale`, `p2.depth`                              |

The same setup routine is used for playback and for constructing visible path/hand lines. A
management operation must therefore preserve the incoming axes on the new `p2`, not just its final
coordinates.

For a Linear transition, the worker applies each frame's Scale to its endpoint before
interpolating. Interpolating position and Scale separately and then multiplying them would produce
a quadratic curve when both values change.

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

## Sparse frame compaction

After a management operation, frames should be compacted against the same rules used by the
compiler:

- Delete inherited values when they equal the preceding effective value.
- On the first frame, delete inherited values when they equal their first-frame default.
- Delete `plane` only when it is zero.
- Delete `axis` only when it equals the current frame's `plane`.
- Delete `move` only when all three coordinates are zero.

Version 1 query values are integer-based. Derived floating-point noise near an integer must be
snapped before it reaches the editor or serializer.

The URL-level representation of undefined fields, empty frames, separators, and stripped trailing
groups belongs to [`QUERY_STRING_FORMAT.md`](./QUERY_STRING_FORMAT.md).
