# Animation Frame Model

This document describes how editable Animation and Motion frames become compiled animation data,
how the worker interprets that data, and how sparse frames can be compacted safely. The Shift
management operation is documented separately in [`SHIFT.md`](./SHIFT.md).

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

`plane` and `axis` do not inherit from the preceding frame. A repeated nonzero `plane` therefore
cannot be deleted merely because the previous frame used the same value. `axis` can be deleted
when it equals the current frame's `plane`.

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

## Independent Motion frames

Each finalized prop owns two independent frame arrays:

```text
prop.anim    Animation frames
prop.motion  Motion frames
```

Motion frames currently contain `beats` and `move`. Their frame boundaries do not need to align
with Animation. An unused Motion track is always represented in memory as `motion: []`.

The Manage pane follows the selected frame set. Animation exposes its point and prop management
tools. Motion exposes Insert Frame and Delete Selection; Insert Frame adds an empty frame before or
after the current position or selected range without invoking player point selection.

Motion `beats` defaults to `1` on the first frame and inherits afterward. `move` is a delta and
defaults to `[0, 0, 0]` on every frame. Before playback, the compiler creates cumulative offsets:

```text
offset[0] = move[0]
offset[i] = offset[i - 1] + move[i]
```

A Motion segment interpolates from `offset[i]` to `offset[i + 1]`. Animation and Motion are both
evaluated at the same absolute playback time. When either frame set ends first, it holds its final
state while the other continues. Overall playback ends at the last frame boundary from either set.

Motion translates the live prop, arms, anchors, guides, and active point during playback. Completed
Paths and Hands are not children of that translated group. Instead, the worker samples Motion at
the absolute time of every generated point and bakes that world-space offset into the line. Nodes
likewise store the sampled world-space offset for their Animation frame. This makes the completed
visualizations show where the prop traveled without sliding the already-drawn geometry as playback
continues. Motion boundaries inside an Animation segment are included as exact line samples so
direction changes remain intact even when the two frame sets do not align. When Motion outlasts
Animation, the final animated pose continues contributing baked line points through the remaining
Motion boundaries.

QS versions 1 through 3 stored `move` on Animation frames. Version 4 migration removes those
legacy fields and builds a Motion track with equivalent boundaries. Stationary spans may be
collapsed, but the Animation frame immediately before a transition must remain as a Motion
boundary because its outgoing `beats` value determines when movement begins.

## Sparse frame compaction

After a management operation, frames should be compacted against the same rules used by the
compiler:

- Delete inherited values when they equal the preceding effective value.
- On the first frame, delete inherited values when they equal their first-frame default.
- Delete `plane` only when it is zero.
- Delete `axis` only when it equals the current frame's `plane`.

Query values are integer-based. Derived floating-point noise near an integer must be
snapped before it reaches the editor or serializer.

The URL-level representation of undefined fields, empty frames, separators, and stripped trailing
groups belongs to [`QUERY_STRING_FORMAT.md`](./QUERY_STRING_FORMAT.md).
