# VTG and Quarter Spacing

This document describes the Concepts controls and the shared VTG/Quarter Spacing pattern pipeline,
including player settings, transforms, matching, relationship classification, and matrix headers.
These controls are separate from the editor property-panel pipeline documented in
[`PROPERTY_CONTROLS.md`](./PROPERTY_CONTROLS.md).

The authoritative implementations are:

- `src/features/vtg/data/vtgPlayerSettings.ts` for numeric controls and rendering settings.
- `src/features/vtg/data/vtgPatternCatalog.ts` for the VTG pattern catalog and builder inputs.
- `src/features/vtg/math/` for VTG building, matching, and relationship classification.
- `src/features/qtr/` for Quarter Spacing transforms, matching, labels, and frame-derived headers.
- The shared Concepts store for Speed Ratio, Swap, and Flip state.

## Control and player behavior

The Concepts pane does not use `PropertyPanel`, `DynamicVal`, or `useProperties.constraints()`.
Its VTG and Quarter Spacing panels use the same native matrix controls. VTG sends a
`VtgPatternSelection` to the VTG builder, while Quarter Spacing sends a `QtrPatternSelection` to
the Qtr builder. Speed Ratio, Swap, and Flip are held in the shared Concepts store so their values
remain unchanged when switching between the two panels.

Each VTG and Quarter Spacing slider gesture is one undo step. Scale, Thick, and BPM begin a query
history group on pointer-down or key-down and end it on pointer-up, pointer-cancel, key-up, or blur,
matching the editor slider interaction boundary.

Paths, Hands, and Arms are native checkbox controls below the sliders. VTG and Quarter Spacing
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
| Thick                  | 1..15, step 1        | Passed directly from the UI selection                               |

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

VTG matching compiles geometry and identifies Scale from the first frame's internal scale. Root
Distance is not part of the VTG geometry signature, so a distance mismatch does not by itself stop
a pattern match.

## Quarter Spacing transforms

Quarter Spacing provides two mutually exclusive transforms and always has one selected. `Qtr #1`
adds 90 degrees to the original first animation track's first-frame arc. `Qtr #2` rotates the
complete Qtr #1 pattern another 90 degrees using first-frame arc adjustments. Plane 0 receives +90
degrees and plane 180 receives -90 degrees so both planes rotate in the same spatial direction
without changing their paths. Arc adjustments wrap within 0-359 degrees. Qtr #1 is the default;
selecting an active radio again cannot clear it, and Reset returns to Qtr #1. With Swap, the
adjustments move with their original tracks.

Quarter Spacing previews and matching apply the Qtr transform around the shared VTG pattern builder
and matcher so selected cells and shared options can be recovered when switching panels or loading
animation data.

## Relationship classification

Matrix labels and cell tooltips are derived from each compiled pattern rather than a cell-label
table. Hand timing compares the two compiled position vectors, prop timing compares the two
rotation vectors, and direction compares their travel axes. Parallel timing is Together (`T`),
antiparallel timing is Split (`S`), and orthogonal timing is Quarter (`Q`); direction remains Same
(`S`) or Opposite (`O`). The generated tooltip expands those letters as
`Hands: Timing / Direction` and `Props: Timing / Direction`.

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

## Quarter Spacing headers

Qtr header display labels remain configured separately in `qtrLabels.ts`. Quarter Spacing disables
all header tooltips because the normal VTG descriptions do not explain the transformed header
states. It also hides every header divider, including rule 5's offset divider, and hides the prop
diagrams in the bottom headers. The left-header prop diagrams remain visible.

The visible Quarter Spacing header props mirror the rendered POI material colors. Each prop's large
end is the head (`COLSET` slot 0), its small end is the handle (`COLSET` slot 1), and its connecting
line is the tether (`COLSET` slot 2). The first header prop uses VTG's Green color set and the second
uses VTG's Orange color set, matching the generated animation's prop colors.

In Quarter Spacing, each left-header prop diagram is recalculated from the first compiled frame of
the first cell in that row (`1-1` through `1-6`). The closest cardinal direction of `pos` selects
top, right, bottom, or left. The sign of `pos dot rot` selects out or in. Placements reuse the exact
bounds demonstrated by left rule 2 for left/right and bottom rule 2 for top/bottom. Swap and Flip
participate in this calculation; controls that do not change first-frame geometry do not.

The bottom-header prop diagrams are not displayed in Quarter Spacing.

Flip mirrors each left header from left to right. Its title block, divider, and regular prop
placements move together, including which end of a prop is rendered as the head. Flipped
left-header titles are right-aligned against the right edge. Header numbers remain in their normal
bottom-right position. Bottom headers keep their normal layout when Flip is enabled. Quarter
Spacing header props are not mirrored a second time because their positions already come from
compiled frames that include the Flip transform; the surrounding title layout still mirrors
normally.

## Regression coverage

Changes in this area should cover the applicable behavior:

- BPM, Scale, Thick, and derived Distance boundaries.
- One undo step per continuous slider gesture.
- Player-only Paths, Hands, and Arms settings remaining separate from thumbnails.
- Pattern building, matching, Swap, Flip, speed ratios, and both Qtr modes.
- Relationship classifications derived from compiled geometry, including the `6-3` `QO/QS`
  reference.
- Header labels, tooltip availability, dividers, colors, and prop placement.
- Full generated patterns through query encode/decode when serialized fields change.
