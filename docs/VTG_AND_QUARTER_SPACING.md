# VTG and QTR Mode

This document describes the Concepts controls and the shared VTG/QTR pattern pipeline,
including player settings, transforms, matching, relationship classification, and matrix headers.
These controls are separate from the editor property-panel pipeline documented in
[`PROPERTY_CONTROLS.md`](./PROPERTY_CONTROLS.md).

Eight Step uses the same shared Concepts controls but has a separate pattern model documented in
[`EIGHT_STEP.md`](./EIGHT_STEP.md).

The authoritative implementations are:

- `src/features/vtg/data/vtgPlayerSettings.ts` for numeric controls and rendering settings.
- `src/features/vtg/data/vtgPatternCatalog.ts` for the VTG pattern catalog and builder inputs.
- `src/features/vtg/math/` for VTG building, matching, and relationship classification.
- `src/features/vtg/qtr/` for the VTG-owned QTR transforms, matching, labels, and frame-derived
  headers, with the shared QTR contracts in `src/features/vtg/types.ts`.
- The shared Concepts store for QTR mode, Speed Ratio, Swap, and Flip state.
- `src/math/animation/subdivideAnimationPlayback.ts` for frame subdivision that preserves the
  visible path while changing the authored playback rate.

## Control and player behavior

The Concepts pane does not use `PropertyPanel`, `DynamicVal`, or `useProperties.constraints()`.
Its VTG and Eight Step panels use the same native player and transform controls. VTG sends a
`VtgPatternSelection` to the VTG builder when QTR is disabled and a `QtrPatternSelection` to the Qtr
builder when QTR is enabled. Eight Step sends an `EightStepPatternSelection` to its builder. QTR,
Speed Ratio, Swap, Flip, and the player controls are held in the shared Concepts store so their
applicable values remain unchanged when switching panels. Persisted selections from the retired
Quarter Spacing panel migrate to VTG with QTR enabled. Legacy Quarter Spacing routes do the same and
then canonicalize to the VTG route.

Scale, Thick, Spacing, and BPM appear below the Starting Beat and transition controls in VTG. Each
slider gesture is one undo step. The sliders begin a query
history group on pointer-down or key-down and end it on pointer-up, pointer-cancel, key-up, or blur,
matching the editor slider interaction boundary. On devices recognized by the shared mobile/iPad
detection, sliders allow vertical touch panning. If the browser cancels a slider gesture to begin
page scrolling, its original value is restored rather than committing the touch-down position.

Paths, Hands, Arms, Left, and Right are native checkbox controls above the sliders. Left and Right
represent `props[0]` and `props[1]` and default to checked. Unchecking one writes `paths`, `hands`,
`arms`, and `visible` as `false` on that prop; checking it removes those prop-level overrides so
they are inherited and omitted from the query string. At least one prop must remain enabled;
disabling the only enabled side automatically enables the other side. VTG and Quarter Spacing
players default to Paths on, Hands off, and Arms on; non-default choices are added to the pattern
selection before the player animation is built. These choices are intentionally excluded from
`usePatternPreviews`: thumbnail animations always use their canonical Paths-on, Hands-off,
Arms-off rendering settings.

Current VTG numeric behavior is:

| Control                | UI range and step    | Stored transform                                                    |
| ---------------------- | -------------------- | ------------------------------------------------------------------- |
| BPM                    | 40..140, step 1      | Explicitly clamped by `clampVtgBpm()`                               |
| Scale                  | 0.5..1.4, step 0.1   | Explicitly clamped, multiplied by 10, and rounded for frame `scale` |
| Scale-derived Distance | Piecewise 14..15..25 | Interpolated from Scale and rounded to the nearest whole number     |
| Thick                  | 1..15, step 1        | Defaults to 5 and is passed directly from the UI selection          |
| Spacing                | 0..20, step 1        | Alternates precise horizontal placement between the two props       |

Spacing is a persisted Concepts preference and is never inferred from a loaded pattern. Its
default is `1`. The integer value is distributed outward one step at a time: `0 -> (0, 0)`,
`1 -> (+1, 0)`, `2 -> (+1, -1)`, `3 -> (+2, -1)`, and so on. These placements are stored as one
Precision Motion frame per nonzero prop. In QS v6 the first positive and negative moves encode as
`m0=_1_mxqv__` and `m1=_1_J1qv__`, respectively.

The Scale-to-Distance mapping uses a pivot:

```text
Scale 0.5 -> Distance 14
Scale 0.6 -> Distance 15
Scale 1.4 -> Distance 25
```

Values between those points are linearly interpolated within their side of the pivot and then
rounded. For example, Scale `0.8` produces Distance `18`.

VTG builds a new two-prop pattern, merges most current root settings, applies the selected rendering
features, replaces pattern props, and then assigns `ROOT.value`. The normal route watcher
subsequently serializes it.

VTG matching identifies patterns from their normalized authored `turns`, `arc`, `plane`, and `axis`
frame values, and identifies Scale from the first frame's internal scale. Matching authored frames
is important because two closed cycles can compile to the same geometry while retaining different
first-frame instructions that identify their selected starting beat. The authored rotation axis is
also pattern-defining and distinguishes cells whose hand paths coincide but whose prop rotations do
not. Equivalent positive and negative angles are normalized before comparison. Root Distance is not
part of the pattern signature, so a distance mismatch does not by itself stop a match. Candidate
indexes derive shifted and doubled variants incrementally from each base pattern and are built only
for the active concept unless fallback matching is required.

Pattern recovery runs in the shared, lazily created Concepts pattern-matching worker. The worker
stays alive while VTG or Eight Step is selected, preserving generated candidate indexes across
animation changes and concept switches. VTG requests include the merged QTR fallback. Selecting a
concept without matching support or unmounting the Concepts pane terminates the worker. Responses
are versioned by the requesting pane so an older result cannot overwrite newer animation data or a
user interaction.

## Starting beat, QTR, Double, and 45-degree transitions

VTG exposes Starting Beat radios `1` through `4` at the bottom of the Concepts pane. Beat `1` is the
default. Each following value applies one additional closed-cycle frame shift
to both prop tracks, so Beat `2` shifts once, Beat `3` twice, and Beat `4` three times. Reset returns
the control to Beat `1`; previews and compiled-geometry matching include the selected shift. Quarter
Spacing applies this shift to the completed QTR animation, after its quarter-arc transform, so the
control changes only the cycle's starting point rather than which source frame receives the QTR
adjustment. The responsive row is ordered Diamond, Box, QTR, beats `1` through `4`, and the
`45° Trans'` button. QTR switches the matrix labels, cell descriptions, previews, generated
selection, matching behavior, and headers as one mode change. The `Qtr #1` and `Qtr #2` radios
appear above the matrix only while QTR is enabled.

The Double control is currently hidden but retained for future experiments. Double subdivision
subdivides every authored frame interval in two and doubles the stored animation BPM. The added
frame is the midpoint of the interval: incremental turns and arcs are
halved, while scale, depth, and adjustment values are interpolated. The BPM control continues to
show the user's undoubled value, and matching maps the stored BPM back to that displayed value.
Because both rate and frame count change by the same multiplier, total duration, interval endpoints,
and visible motion remain unchanged. Subdivision derives its output from the animation's actual
frame tracks and does not assume a fixed pattern length. Added frames remain sparse: inherited
animation values and zero-angle defaults are omitted unless a frame must explicitly change them.

The reciprocal transition toggle is labeled `45° Trans'`. Enabling it also enables Double, and
disabling it turns Double off. Starting from the
doubled closed cycle, the transform inserts one
doubled beat before each relationship change, changes alternating prop tracks, and plays one full
derived cycle between changes. For a change frame, Plane is 180 and Turns is derived as
`-turns - 2 * arc`. This reverses the local rotation axis while preserving the compiled prop
rotation at the handoff. The process visits each prop twice, returning both tracks to their original
turn values before the animation loops into its original doubled cycle. Cycle and transition sizes
come from the animation and subdivision multiplier rather than fixed frame counts.

The transition is temporarily unavailable at 1:1. Its button is hidden and the builder ignores the
transition flag at that ratio. The pane retains the local, non-persisted toggle preference while the
user remains on the pane, so switching back to 1:3 or 1:5 reapplies it automatically. Resetting or
remounting the pane clears that preference normally.

Matching does not precompute the extended transition animations. Their derived frame-count shape is
used to recover the doubled base cycle, which is matched through the existing Double index; the
remaining extended frames are treated as the transition produced by this control. Both the in-memory
form and the URL form with trailing inherited frames omitted are recognized.

## Diamond and Box

VTG exposes the shared Diamond/Box radio controls immediately before the Starting Beat radios in
the responsive playback row.
Diamond is the default and preserves the source definition, so it is omitted from compact pattern
selections. Box rotates each prop's first-frame `arc` by 45 degrees: plane 0 uses `+45`, while plane
180 uses `-45` so both planes rotate in the same spatial direction. The original first continuation
arc is made explicit so sparse-frame inheritance cannot carry the Box adjustment into later frames.

Flip selects the effective plane before the Box direction is calculated, Swap exchanges the
complete transformed tracks afterward, and Quarter Spacing applies its Qtr arc offsets after the
shared VTG shape transform. Previews and compiled-geometry matching include the selected shape.

Cells `1-1`, `1-2`, `2-1`, `2-2`, `3-3`, `3-4`, `4-3`, and `4-4` have an intentional fixed shape in
their source patterns. Diamond and Box therefore produce identical animation data for those cells
in both VTG and Quarter Spacing.

## Quarter Spacing transforms

Quarter Spacing provides two mutually exclusive transforms and always has one selected. `Qtr #1`
adds 90 degrees to the original first animation track's first-frame arc. `Qtr #2` rotates the
complete Qtr #1 pattern another 90 degrees using first-frame arc adjustments. Plane 0 receives +90
degrees and plane 180 receives -90 degrees so both planes rotate in the same spatial direction
without changing their paths. Arc adjustments wrap within 0-359 degrees. Qtr #1 is the default;
selecting an active radio again cannot clear it, and Reset returns to Qtr #1. With Swap, the
adjustments move with their original tracks.

QTR previews and matching apply the Qtr transform around the shared VTG pattern builder and matcher
so selected cells and shared options can be recovered when toggling QTR or loading animation data.

## Relationship classification

Matrix labels and cell tooltips are derived from each compiled pattern rather than a cell-label
table. Hand timing compares the two compiled position vectors, prop timing compares the two
rotation vectors, and direction compares their travel axes. Parallel timing is Together (`T`),
antiparallel timing is Split (`S`), and orthogonal timing is Quarter (`Q`); direction remains Same
(`S`) or Opposite (`O`). The generated tooltip expands those letters as
`Hands: Timing / Direction` and `Props: Timing / Direction`.

Beat, Double, and the QTR/VTG transition are playback-only controls and are removed before
relationship classification.
This distinction matters for unequal speed ratios: advancing both tracks by one beat can change
their instantaneous Together/Split checkpoint because their relative phase advances at the
difference between their rates. That checkpoint change does not change the semantic catalog
pattern. Changes to these playback controls still rerun semantic classification so this invariant
remains validated in the reactive UI. Shape, Speed Ratio, Anti, Swap, Flip, and the Qtr mode remain part of
the relationship input because they define the pattern itself rather than only its playback origin
or subdivision.

Prop direction must be compared in the props' local hand/phase frames, not by directly comparing
their world-space rotation axes. A quarter-phase transform can mirror one local frame, making two
props that spin in the same direction expose antiparallel world-space axes. The classifier first
compares the ending rotation axes and then corrects that sign with the orientation parity of the
starting hand phase, starting prop phase, ending hand phase, and ending prop phase.

Cell `6-3` is the worked reference for this distinction. Its VTG relationship is `SO/TS`; Quarter
Spacing changes the timing to produce `QO/QS`. In the default 1:3 Qtr #1 pattern, the ending prop
rotation axes are approximately `+Z` and `-Z`, which yields a raw Opposite sign (`-1`). The four
local phase orientations are `-1`, `-1`, `-1`, and `+1`, whose product is another `-1`. Applying
that local-frame correction gives `(-1) * (-1) = +1`, or Same. This matches the rendered motion:
the props are quarter-spaced and spin in the same direction, so the prop portion is `QS`, not `QO`.
The established `6-3` classification remains the same across the supported speed ratios, Qtr modes,
Swap states, and Flip states.

## QTR headers

Qtr header display labels remain configured separately in `qtrLabels.ts`. Enabling QTR disables all
header tooltips because the normal VTG descriptions do not explain the transformed header
states. It also hides every header divider, including rule 5's offset divider, and hides the prop
diagrams in the top headers. The left-header prop diagrams remain visible.

The visible QTR header props mirror the rendered POI material colors. Each prop's large
end is the head (`COLSET` slot 0), its small end is the handle (`COLSET` slot 1), and its connecting
line is the tether (`COLSET` slot 2). The first header prop uses VTG's Green color set and the second
uses VTG's Orange color set, matching the generated animation's prop colors.

In QTR mode, each left-header prop diagram is recalculated from the first compiled frame of
the first cell in that row (`1-1` through `1-6`). The closest cardinal direction of `pos` selects
top, right, bottom, or left. The sign of `pos dot rot` selects out or in. Placements reuse the exact
bounds demonstrated by left rule 2 for left/right and top rule 2 for top/bottom. Swap and Flip
participate in this calculation; controls that do not change first-frame geometry do not.

The top-header prop diagrams are not displayed in QTR mode.

Flip mirrors each left header from left to right. Its title block, divider, and regular prop
placements move together, including which end of a prop is rendered as the head. Flipped
left-header titles are right-aligned against the right edge. Header numbers remain in their normal
bottom-right position. Top headers keep their normal layout when Flip is enabled. Quarter
Spacing header props are not mirrored a second time because their positions already come from
compiled frames that include the Flip transform; the surrounding title layout still mirrors
normally.

## Regression coverage

Changes in this area should cover the applicable behavior:

- BPM, Scale, Thick, Spacing, and derived Distance boundaries.
- One undo step per continuous slider gesture.
- Player-only Paths, Hands, and Arms settings remaining separate from thumbnails.
- Pattern building, matching, Swap, Flip, Diamond/Box, fixed-shape cells, starting-beat shifts,
  Double subdivision, reciprocal QTR/VTG transitions, speed ratios, and both Qtr modes.
- Relationship classifications derived from compiled geometry, including the `6-3` `QO/QS`
  reference.
- Header labels, tooltip availability, dividers, colors, and prop placement.
- Full generated patterns through query encode/decode when serialized fields change.
