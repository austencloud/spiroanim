# Candidate: VTG `0:0` Stationary Timing

Status: Future candidate. Do not implement until the per-prop rotation amount and its interaction
with Twist and Axis have been designed.

This document records the proposed VTG `0:0` timing behavior, unresolved decisions, and the results
of the 2026-08-24 repository scan and simulation. It is intentionally a design note rather than a
current application contract.

Related current behavior is documented in:

- [`../VTG_TIMING_RATIOS.md`](../VTG_TIMING_RATIOS.md)
- [`../VTG_AND_QUARTER_SPACING.md`](../VTG_AND_QUARTER_SPACING.md)
- [`../ANIMATION_FRAME_MODEL.md`](../ANIMATION_FRAME_MODEL.md)
- [`../QUERY_STRING_FORMAT.md`](../QUERY_STRING_FORMAT.md)

## Motivation

Add `0:0` to the two individual VTG timing dropdowns without adding it to the primary timing
buttons. A user could make either prop stationary or keep both props stationary for a duration:

```text
0:0v1:3  - first prop stationary, second prop moving at 1:3
1:3v0:0  - first prop moving at 1:3, second prop stationary
0:0      - both props stationary
0:0v2:3  - first prop stationary across the moving prop's two-rotation cycle
```

Stationary means that the prop's hand position does not travel. It does not mean that the prop is
an inert object. The prop may still rotate and may use Twist, Axis, Scale, or future animation
properties during the stationary duration.

Span Spinner and Fan work is a primary use case. A performer may keep a fan centered in one place
while rotating it 180 degrees or a complete 360 degrees. Another stationary section may apply
Twist instead of ordinary Turns, or change the prop through behavior equivalent to Axis
manipulation. A useful `0:0` section must support these actions independently; it cannot assume
that standard prop rotation is always present.

Both props must be allowed to use `0:0`. The feature cannot depend on another moving prop to supply
all of its behavior.

## Why implementation is deferred

The direction of stationary prop rotation can be inherited from the cell's 1:1 Anti/In definition,
but `0:0` does not define how much the prop rotates. A separate per-prop Turns control for `0:0`
will probably be required.

That control has not been designed yet. Its range, step, default, persistence, interaction with
cell selection, and relationship to Twist and Axis remain open. The feature should be reconsidered
after Twist behavior is established and Axis manipulation is better understood.

Users are likely to specify the desired total physical result, such as 180 or 360 degrees, rather
than calculate a continuation-frame Turns amount. The control may therefore need to accept total
rotation for the selected stationary duration and compile that value into the necessary per-frame
Turns. It remains undecided whether a compound two-cycle timing repeats that amount once per
four-beat virtual 1:1 cycle or distributes it once across the complete combined duration.

## Candidate semantic model

`0:0` should be a tagged stationary timing internally, even if its stored and displayed string is
`"0:0"`. It must not be passed through ordinary ratio arithmetic as `{ numerator: 0,
denominator: 0 }`.

Ordinary VTG ratios require positive reduced values and calculate Turns by dividing by the timing
numerator. Treating `0:0` as an ordinary ratio would introduce division by zero, invalid LCM cycle
calculations, and incorrect even-denominator behavior.

### Use 1:1 as the definition family

The cell's 1:1 definition is the proposed source of its latent Anti/In direction, Plane, Axis, and
other relationship data. This allows a stationary prop to rotate in either direction according to
the same cell definition that governs 1:1.

For a normal 1:1 45-degree continuation:

```text
Arc = 45
absolute prop rotation = Arc + Turns = 45 or -45
```

A stationary conversion that preserves that absolute rotation would be:

```text
Arc = 0
Turns = previous Arc + previous Turns
```

That produces `Turns = 45` for the In direction and `Turns = -45` for the Anti direction. These are
useful candidate defaults, but they must not be treated as the final design because the user may
need to choose a different per-prop rotation amount.

Plane and Axis information should remain present even while positional Arc is zero. They provide
the latent direction used by Builder junctions and future Axis behavior.

### Cycle and Beat behavior

For cycle calculations, stationary timing should contribute a virtual cycle count of one:

- `0:0` has one eight-interval/four-beat cycle.
- In `0:0v1:3`, the complete pattern has one cycle.
- In `0:0v2:3`, the moving prop determines the two-cycle pattern length.
- In `0:0`, both stationary prop tracks still receive the complete one-cycle frame structure.

Starting Beat remains meaningful because it can change prop rotation phase, Twist, Axis, Scale,
and future properties even when hand position does not move.

## Observable labels and latent motion

The application must distinguish internal latent direction from observable motion labels.

Internally, Builder alignment may use the 1:1-derived Anti/In and Plane/Axis directions. The visible
label must use `X` when actual zero positional motion makes a relationship indeterminate.

### Builder `AA`, `AI`, `IA`, and `II` labels

Anti/In describes prop rotation relative to hand movement. A stationary hand has no observable
movement direction, so the stationary prop's character should be `X`:

```text
0:0v1:3 -> XA or XI
1:3v0:0 -> AX or IX
0:0     -> XX
```

The second half of a Builder motion label compares hand directions and prop rotation directions.
A hand-direction comparison involving a stationary hand should use `X`. Prop rotation direction
can remain `S` or `O` when both rotation directions are known. Example candidate labels include:

```text
XA / XS
XI / XO
XX / XS
```

`X` must not replace the internal latent direction used by Builder junction selection. Treating
`X` as an internal wildcard could select an arbitrary Plane or Axis and make later pieces or
future property changes behave incorrectly.

### `TS / TS` relationship labels

Together/Split/Quarter phase can still be determined from actual positions. Same/Opposite hand
movement direction cannot be determined when either compared hand is stationary. Candidate labels
therefore include:

```text
TX / TS
SX / TO
QX / QS
```

If standard prop rotation is also zero, the prop-direction character may likewise be `X`.

Partial `X` labels are expected classifications and must not produce warnings. The existing
`XX / XX` error label remains reserved for genuine classification failures, such as unsupported
noncanonical relationship vectors.

## Pattern generation and inference

Generation should branch explicitly for stationary timing:

1. Select the cell's 1:1 definition family for the stationary prop.
2. Retain the starting placement frame.
3. Set continuation positional Arc to zero.
4. Retain the latent Plane and Axis.
5. Apply the selected per-prop stationary Turns amount using the definition's Anti/In direction.
6. Preserve the complete frame count required by the combined timing.

Timing inference must also recognize stationary tracks explicitly. It cannot use the ordinary
`abs((Arc + Turns) / Arc)` ratio calculation.

Inference should examine the complete continuation track rather than classifying a prop from one
zero-Arc frame. An otherwise moving authored pattern may legitimately contain an isolated
zero-Arc interval. A stationary candidate instead has no positional Arc across the complete
timing-bearing continuation range.

Inference should eventually allow zero standard Turns as well. A user may hold position and use
only Twist, Axis, Scale, or another future property. In that case, frame structure and candidate
matching must establish `0:0`; nonzero prop rotation cannot be the only marker.

## Pattern matching and duplicate handling

The current matcher rejects every stationary simulation because timing inference rejects zero Arc.
Once stationary inference exists, the current coarse direction signature would also produce large
candidate buckets because it intentionally omits most prop rotation data.

The 2026-08-24 simulation generated 38,400 Beat/orientation/Swap/180 variants. The largest bucket
sharing one current coarse signature was:

| Scenario                           | Simulated variants | Largest coarse-signature bucket |
| ---------------------------------- | -----------------: | ------------------------------: |
| Left stationary                    |              7,680 |                              96 |
| Right stationary                   |              7,680 |                              96 |
| Both stationary                    |              7,680 |                           1,152 |
| Stationary plus a two-cycle timing |             15,360 |                             192 |

These were primarily signature collisions rather than physically identical animations. A stronger
stationary signature using compiled position, latent position and rotation axes, prop orientation,
rotation direction, and Beats reduced the largest buckets to two for one-stationary cases and four
for both-stationary cases.

Matching should therefore use tiers:

1. Use a strong stationary signature for ordinary generated patterns.
2. Rank exact compiler-regenerated candidates within that small bucket.
3. Fall back to the existing permissive signature when user-authored Turns, Axis, Twist, or other
   modifications prevent a strong match.

The strong signature must be a fast discriminator, not a replacement for compiler-based truth.
Some generated selections are physically identical. The matcher must choose a deterministic
canonical interpretation after a fresh load, while the existing last-selection fast path should
retain the user's current equivalent selection during editing.

The matcher must preserve `0:0` as the detected timing. It must not return `1:1` merely because 1:1
provided the definition data; doing so would make the prop move again when the detected selection
is regenerated.

## Systems that require explicit handling

### Timing utilities

- Parsing and canonical validation must accept `0:0` only as the stationary sentinel.
- Compound formatting must preserve `0:0v1:3` and `1:3v0:0`; two stationary props collapse to
  `0:0`.
- Cycle calculation treats stationary timing as a neutral one-cycle contribution.
- Even-denominator and paired-layout checks must ignore stationary timing.
- Default orientation should treat stationary timing like 1:1 rather than treating denominator
  zero as even.

### Scale and headers

- A stationary side should not automatically force 1:1's Scale adjustment onto a moving side.
- When both sides are stationary, using 1:1 Scale and header behavior is a reasonable candidate.
- Compound timings may retain the existing compound-header fallback behavior.

### Pattern Builder

- Internal motion data needs explicit stationary flags plus latent 1:1 directions.
- Display labels derive `X` from stationary flags.
- Junction reorientation must never change stationary continuation Arc away from zero.
- Appending, inserting, replacing, swapping, and rejoining pieces need stationary regression tests.
- Builder preview relationship resolution depends on the matcher and cannot work until stationary
  matching is supported.

### QTR and Trans

The simulation found no structural reason to disable QTR or Trans:

- QTR changed initial placement while stationary continuation positions remained fixed.
- Trans reversed stationary prop Turns while leaving hand position fixed.
- Transition structure remained analyzable.

Both still require dedicated semantic, matching, Quick Slot, and Builder tests before release.

### Query strings and frame operations

No new query-string version appeared necessary in the simulation. Explicit continuation `Arc = 0`
and nonzero Turns survived current v10 encoding and decoding. Twist, Axis, and Scale also
round-tripped.

The simulated stationary tracks also survived:

- Compiler resolution
- Every starting-frame Shift
- Frame compression
- Double Frames followed by Halve Frames
- Swap and 180 transforms
- All six tested orientations

The timing choice itself is not serialized as selection metadata, so reliable inference and
canonical matching remain mandatory.

### UI and persistence

- Add `0:0` only to the individual timing dropdown choices.
- Do not add it to the primary timing radio buttons.
- Do not automatically add it to every established-ratio exhaustive audit.
- Update persisted Concepts-store validation so a saved `0:0` selection is not reset to the
  default timing during hydration.
- Design a per-prop stationary Turns control before implementation.

## Open decisions

1. Is stationary Turns entered as total rotation over the selected duration or as a per-frame
   continuation amount?
2. In a compound two-cycle timing, does a requested 180- or 360-degree stationary rotation repeat
   once per virtual four-beat cycle or occur once across the complete eight-beat duration?
3. What is the default stationary Turns amount: 45 degrees per interval from virtual 1:1, 180 or
   360 degrees per duration, zero, or another value?
4. What range and precision should the per-prop stationary Turns control support?
5. Does changing the selected cell reset that amount or preserve it?
6. Is the amount signed directly, or is its magnitude separate from the cell's Anti/In direction?
7. How does stationary Turns interact with Twist when both rotate a Fan or another multi-head prop?
8. Which Axis controls or equivalent transformations are available while positional Arc is zero?
9. How should a completely rotation-free stationary track retain detectable `0:0` identity after
   a fresh URL load?
10. Which physically equivalent stationary cells should be canonical after matching?

## Candidate implementation order

1. Finish and document Twist semantics.
2. Define stationary per-prop Turns and Axis behavior.
3. Introduce a tagged stationary timing type and update timing utilities.
4. Add generation based on 1:1 definitions plus zero positional Arc.
5. Add stationary timing inference.
6. Separate latent Builder motion from visible `X` labels.
7. Add the strong stationary matcher tier and canonical ranking.
8. Update Builder, QTR, Trans, Quick Slots, persistence, headers, and Scale behavior.
9. Add focused one-static, two-static, compound two-cycle, property-animation, query round-trip,
   and exhaustive matching audits.
