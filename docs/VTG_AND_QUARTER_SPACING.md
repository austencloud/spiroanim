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
- The shared Concepts store for the selected concept, Quick Slots, QTR mode, Speed Ratio, Swap,
  and 180° state.
- `src/math/animation/subdivideAnimationPlayback.ts` for frame subdivision that preserves the
  visible path while changing the authored playback rate.

## Control and player behavior

The Concepts pane does not use `PropertyPanel`, `DynamicVal`, or `useProperties.constraints()`.
Its VTG and Eight Step panels use the same native player and transform controls. VTG sends a
`VtgPatternSelection` to the VTG builder when QTR is disabled and a `QtrPatternSelection` to the Qtr
builder when QTR is enabled. Eight Step sends an `EightStepPatternSelection` to its builder. QTR,
Speed Ratio, Swap, 180°, and the player controls are held in the shared Concepts store so their
applicable values remain unchanged when switching panels. Persisted selections from the retired
Quarter Spacing panel migrate to VTG with QTR enabled. Legacy Quarter Spacing routes do the same and
then canonicalize to the VTG route.

The Quick Slots control appears above the concept selector and defaults to four slots with Q1
selected. Adding or removing a slot and selecting Q1, Q2, Q3, and so on currently changes only the
control state. The slot count and selected slot persist in the shared Concepts store, the count
cannot fall below one, and removing the selected last slot selects the new last slot. When the
controls exceed the available width, the slots use the same shared balanced-row layout behavior as
QST pagination. Quick Slot tooltips are explicitly disabled on touch devices.

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

When several control combinations produce the same authored pattern, matching tries every Starting
Beat position before changing the current Swap, 180-degree, or Qtr mode. The lowest Starting Beat is
used only to break a tie between candidates that preserve the same current transform controls.

Pattern recovery runs in the shared, lazily created application-level pattern-matching worker. The
worker remains available for as long as a mounted Concepts pane has VTG, Eight Step, or QST selected,
preserving generated candidate indexes across animation changes. Hiding the Concepts pane or
selecting TKA starts a 30-second idle period. Returning to a matching concept during that period
cancels the pending shutdown, and a worker request is never interrupted. VTG requests include the
merged QTR fallback. TKA does not use this worker. Responses are versioned by the requesting pane so
an older result cannot overwrite newer animation data or a user interaction.

## Starting beat, QTR, and 45-degree transitions

VTG exposes Starting Beat radios `1` through `4` at the bottom of the Concepts pane. Beat `1` is the
default. Each following value applies one additional closed-cycle frame shift
to both prop tracks, so Beat `2` shifts once, Beat `3` twice, and Beat `4` three times. Reset returns
the control to Beat `1`; previews and compiled-geometry matching include the selected shift. Quarter
Spacing applies this shift to the completed QTR animation, after its quarter-arc transform, so the
control changes only the cycle's starting point rather than which source frame receives the QTR
adjustment. The responsive row is ordered Diamond, Box, QTR, beats `1` through `4`, and the
`45° Trans'` button. QTR switches the matrix labels, cell descriptions, previews, generated
selection, matching behavior, headers, and the meaning of the shared transform control as one mode
change. The control is labeled `180°` in VTG and `Flip` in QTR. QTR has no separate
quarter-orientation radios.

The reciprocal transition internally subdivides every authored frame interval in two and doubles
the stored animation BPM before adding its relationship changes. The added frame is the midpoint of
the interval: incremental turns and arcs are
halved, while scale, depth, and adjustment values are interpolated. The BPM control continues to
show the user's original value, and matching maps the stored BPM back to that displayed value.
Because both rate and frame count change by the same multiplier, total duration, interval endpoints,
and visible motion remain unchanged. Subdivision derives its output from the animation's actual
frame tracks and does not assume a fixed pattern length. Added frames remain sparse: inherited
animation values and zero-angle defaults are omitted unless a frame must explicitly change them.

The reciprocal transition toggle is labeled `45° Trans'`. Starting from the internally subdivided
closed cycle, the transform inserts one
doubled beat before each relationship change, changes alternating prop tracks, and plays one full
derived cycle between changes. For a change frame, Plane is 180 and Turns is derived as
`-turns - 2 * arc`. This reverses the local rotation axis while preserving the compiled prop
rotation at the handoff. The process visits each prop twice, returning both tracks to their original
turn values before the animation loops into its original doubled cycle. Cycle and transition sizes
come from the animation and subdivision multiplier rather than fixed frame counts.

The transition controls and builder support every speed ratio on development and production hosts.
When the transition is enabled at 1:1 or 1:2, the interface warns that some or all of these 45°
Transitions may only work with Static Props in the current ratio selection.

Matching does not precompute the extended transition animations. Their derived frame-count shape is
used to recover the internally subdivided base cycle; the
remaining extended frames are treated as the transition produced by this control. Both the in-memory
form and the URL form with trailing inherited frames omitted are recognized.

## Diamond and Box

VTG exposes the shared Diamond/Box radio controls immediately before the Starting Beat radios in
the responsive playback row.
Diamond is the default and preserves the source definition, so it is omitted from compact pattern
selections. Box rotates each prop's first-frame `arc` by 45 degrees: plane 0 uses `+45`, while plane
180 uses `-45` so both planes rotate in the same spatial direction. The original first continuation
arc is made explicit so sparse-frame inheritance cannot carry the Box adjustment into later frames.

Box is calculated from the authored VTG planes. Quarter Spacing then applies its QTR orientation,
followed by Starting Beat and the reciprocal transition when selected. Swap exchanges the
completed tracks. Outside QTR, `180°` reverses the completed pattern's initial motion planes. In QTR
Diamond, it first selects the alternate QTR orientation and then applies that plane reversal,
producing the alternate face-on presentation with the opposite travel direction. QTR Box is already
90-degree symmetric, so `180°` keeps the base QTR orientation and applies only the plane reversal.
Previews and compiled-geometry matching use the same order.

Cells `1-1`, `1-2`, `2-1`, `2-2`, `3-3`, `3-4`, `4-3`, and `4-4` have an intentional fixed shape in
their source patterns. Diamond and Box therefore produce identical animation data for those cells
in both VTG and Quarter Spacing.

## Quarter Spacing transforms

Quarter Spacing uses the former Qtr #1 transform as its base: it adds 90 degrees to the original
first animation track's first-frame arc. In QTR Diamond, the shared `180°` checkbox selects the former
Qtr #2 orientation by rotating the complete base QTR pattern another 90 degrees through equivalent
first-frame arc adjustments. Plane 0 receives +90 degrees and plane 180 receives -90 degrees so both
planes rotate in the same spatial direction without turning the presentation edge-on to the camera.
After playback transforms, the checkbox also applies the normal plane reversal so the alternate
orientation travels in the opposite direction. Because QTR Box hand paths are invariant under that
90-degree presentation rotation, Box skips the alternate-orientation step and applies only the normal
plane reversal. Arc adjustments wrap within 0-359 degrees. Reset clears `180°` and therefore returns
to the base orientation. QTR selections retain an internal quarter-mode discriminator fixed at `1`
for compatibility with existing selection and worker contracts. The QTR adjustments remain on their
authored tracks until final-stage plane reversal and Swap are applied.

QTR previews and matching apply the Qtr transform around the shared VTG pattern builder and matcher
so selected cells and shared options can be recovered when toggling QTR or loading animation data.

## Relationship classification

Matrix labels and cell tooltips are derived from each compiled pattern rather than a cell-label
table. Hand timing compares the two compiled destination position vectors. Prop timing advances the
two real starting rotation vectors through the VTG three-quarter phase checkpoint using each
track's actual incoming axis and travel direction. This local-phase calculation is necessary at
even speed ratios, where opposite half-turn paths can have coincident Cartesian endpoints even
though their semantic relationship is Split. At 1:3, the phase checkpoint is the ordinary compiled
destination, so every established 1:3 label remains unchanged. Direction compares the travel axes.
Parallel timing is Together (`T`), antiparallel timing is Split (`S`), and orthogonal timing is
Quarter (`Q`); direction remains Same (`S`) or Opposite (`O`). The generated tooltip expands those letters as
`Hands: Timing / Direction` and `Props: Timing / Direction`.

An unrotated matrix classifies the destination rule relationship. A 90-degree pattern orientation
swaps the horizontal and vertical rule axes, so the same classifier uses the source relationship.
This transposes the logical relationship matrix without a cell-label map; for example, rotated
`2-1` corresponds to unrotated `1-2`. Both directions retain the real path axes when deriving Same
or Opposite. At 1:2 and 1:4, the rotation selector is ordered `0°`, `90°`, `-90°`, then `180°`.
The 180-degree orientation rotates the starting arcs by a half-turn but does not swap the matrix or
header axes, so it retains the destination relationship checkpoint and established matrix layout.

Some compiled 180-degree animations are exactly equivalent to another cell, starting beat, Swap
state, or orientation. Pattern matching retains the exact 180-degree selection among its candidate
matches, and the last emitted selection prevents an immediate UI reclassification. Animation-only
hydration, including a URL reload without selection metadata, may canonicalize an ambiguous result
to another equivalent interpretation because the rendered animation does not contain enough
information to distinguish how it was authored.

Beat and the QTR/VTG transition are playback-only controls and are removed before
relationship classification.
This distinction matters for unequal speed ratios: advancing both tracks by one beat can change
their instantaneous Together/Split checkpoint because their relative phase advances at the
difference between their rates. That checkpoint change does not change the semantic catalog
pattern. Changes to these playback controls still rerun semantic classification so this invariant
remains validated in the reactive UI. Shape, Speed Ratio, Anti, Swap, 180°, and the Qtr mode remain part of
the relationship input because they define the pattern itself rather than only its playback origin
or subdivision.

Prop direction must be compared in the props' local hand/phase frames, not by directly comparing
their world-space rotation axes. A quarter-phase transform can mirror one local frame, making two
props that spin in the same direction expose antiparallel world-space axes. The classifier first
compares the ending rotation axes and then corrects that sign with the orientation parity of the
starting hand phase, starting prop phase, ending hand phase, and ending prop phase.

Cell `6-3` is the worked reference for this distinction. Its VTG relationship is `SO/TS`; Quarter
Spacing changes the timing to produce `QO/QS`. In the default 1:3 base QTR pattern, the ending prop
rotation axes are approximately `+Z` and `-Z`, which yields a raw Opposite sign (`-1`). The four
local phase orientations are `-1`, `-1`, `-1`, and `+1`, whose product is another `-1`. Applying
that local-frame correction gives `(-1) * (-1) = +1`, or Same. This matches the rendered motion:
the props are quarter-spaced and spin in the same direction, so the prop portion is `QS`, not `QO`.
The established `6-3` classification remains the same across the supported speed ratios, Qtr modes,
Swap states, and 180° states.

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
bounds demonstrated by left rule 2 for left/right and top rule 2 for top/bottom. Swap and 180°
participate in this calculation. Tilted does not: header positions always derive from the
corresponding non-Tilted pattern.

The top-header prop diagrams are not displayed in QTR mode.

The 1:2 and 1:4 VTG ratios also hide the top-header labels, prop diagrams, dividers, and tooltips
while retaining the numbers and selection behavior. At 1:1 and 1:5, the visible top-header rules
are remapped by physical column as `3, 4, 1, 2, 5, 6`. The 1:3 top headers retain their standard
`1, 2, 3, 4, 5, 6` mapping.

The 180° control mirrors each left header from left to right. Its title block, divider, and regular
prop placements move together, including which end of a prop is rendered as the head. Rotated
left-header titles are right-aligned against the right edge. Header numbers remain in their normal
bottom-right position. Top headers keep their normal layout when 180° is enabled. Quarter
Spacing header props are not mirrored a second time because their positions already come from
compiled frames that include the 180-degree transform; the surrounding title layout still mirrors
normally.

## Regression coverage

Changes in this area should cover the applicable behavior:

- BPM, Scale, Thick, Spacing, and derived Distance boundaries.
- One undo step per continuous slider gesture.
- Player-only Paths, Hands, and Arms settings remaining separate from thumbnails.
- Pattern building, matching, Swap, 180°, Diamond/Box, fixed-shape cells, starting-beat shifts,
  Internal transition subdivision, reciprocal QTR/VTG transitions, speed ratios, and both Qtr modes.
- Relationship classifications derived from compiled geometry, including the `6-3` `QO/QS`
  reference.
- Header labels, tooltip availability, dividers, colors, and prop placement.
- Full generated patterns through query encode/decode when serialized fields change.
