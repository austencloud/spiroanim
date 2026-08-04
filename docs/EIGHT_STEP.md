# Eight Step

This document describes the Eight Step source data, animation derivation, controls, transforms,
matching, and compiled-geometry validation. The supplied handpath tables are authoritative for
cardinal positions; the supplied primitive families define the rotation relationship used for each
visible step.

The authoritative implementations are:

- `src/features/eight-step/data/eightStepPatternDefinitions.ts` for handpaths, curve-family rules,
  and the 72 independent cell definitions.
- `src/features/eight-step/data/eightStepPatternCatalog.ts` for player-setting, Swap, Flip, and Scale
  transforms.
- `src/features/eight-step/createEightStepAnimation.ts` for player animation creation.
- `src/features/eight-step/matchEightStepAnimation.ts` for compiled-geometry matching.
- The adjacent unit and component tests for source-page, compiled-path, transform, hydration, and
  control coverage.

## Matrix and source pages

The nine rows are `AA`, `AE`, `AI`, `EA`, `EE`, `EI`, `IA`, `IE`, and `II`. The first letter owns
the Green capping track and the second letter owns the Orange continual track.

The eight columns store only odd-numbered source pages:

| Column | Source page | Header group    |
| -----: | ----------: | --------------- |
|      1 |           1 | Opposite        |
|      2 |           3 | Opposite        |
|      3 |           5 | Same            |
|      4 |           7 | Same            |
|      5 |           9 | Quarter Aligned |
|      6 |          11 | Quarter Aligned |
|      7 |          13 | Quarter Opposed |
|      8 |          15 | Quarter Opposed |

Every cell owns two distinct prop objects, two distinct animation arrays, and 13 distinct frames
per track. Nothing is inherited from another row or column. Frame 0 establishes that cell's private
starting hand and prop state; frames 1 through 12 are the displayed steps, including the step-12
wrap back to step 1.

Those independently owned frames use the application's sparse animation representation. Repeated
inherited values such as `arc`, `turns`, and `scale` are omitted; zero `plane` values are omitted;
and `axis` is omitted when it equals the same frame's `plane`. `rootCompile()` reconstructs the
complete effective values. This keeps generated Eight Step query strings compact without storing a
separate static animation catalog or changing playback geometry.

## Cardinal handpaths and frame solving

`T`, `R`, `B`, and `L` map to the application's middle top, right, bottom, and left points. Every
source transition is one of the eight ordered adjacent edgepairs and therefore has a 90-degree
spherical arc.

Raw `plane` values cannot be assigned from a permanent CW/CCW lookup. A frame's plane is relative
to the orthogonal reference transported from every preceding frame. This becomes observable when a
capping hand reverses direction. The generator therefore walks each cell's complete position state
and solves every incoming plane against the next authoritative cardinal target.

Prop `axis` values are solved independently from the accumulated rotation state. This preserves the
requested turn amount and the expected endpoint phase instead of assuming that position plane and
prop axis remain interchangeable across a 12-step sequence.

## Curve families

The frame model adds `arc` to `turns` for spherical prop rotation. With a 90-degree hand arc, the
four primitive families map as follows:

| Family    | `turns` | Effective prop rotation | Endpoint phase |
| --------- | ------: | ----------------------: | -------------- |
| Extension |       0 |                     90° | Out            |
| Antispin  |    -360 |                   -270° | Out            |
| Inspin    |     180 |                    270° | In             |
| Outspin   |     180 |                    270° | Out            |

Inspin and outspin use the same turn amount but begin from opposite prop phases. Their consecutive
frames toggle Out to In and then In to Out, reproducing the two distinct primitive paths.

The Green capping track repeats a three-step group:

- `A`: antispin, antispin, extension.
- `E`: extension, extension, antispin.
- `I`: inspin, outspin, antispin.

The Orange continual track uses:

- `A`: antispin on all 12 steps.
- `E`: extension on all 12 steps.
- `I`: inspin, outspin, extension, repeated four times.

## Swap and Flip

Swap exchanges the two complete animation tracks before Green and Orange player defaults are
applied. It does not exchange the source-page meaning of Green and Orange.

Flip builds the authoritative even-page partner while retaining the odd page as the only stored
source definition. The page-table relationships are:

- Pages 1/2, 3/4, 5/6, and 7/8 mirror both tracks left-to-right.
- Pages 9/10, 11/12, 13/14, and 15/16 rotate the Green cardinal path by 180 degrees while Orange
  remains the anchor path.

This is not equivalent to Swap. For example, page 2 Green is not page 1 Orange, and page 2 Orange is
not page 1 Green.

## Controls and matching

Eight Step uses the same Concepts store and player controls as VTG and Quarter Spacing: Swap, Flip,
Reset, BPM, Scale, Thick, Paths, Hands, and Arms. A selected cell is rebuilt when any shared control
changes. Pattern creation preserves unrelated current root settings, replaces the two pattern
props, and assigns the standard Green and Orange prop defaults.

Matching compiles both the active animation and all 72 cell candidates across Swap and Flip. Its
geometry signature includes every frame's turns, arc, and normalized plane. BPM and Scale are
recovered separately; player-only drawing choices do not alter the geometry match.

## Matrix thumbnails

The matrix renders one still preview for each row using the first-column references `1-AA` through
`1-II`. Each rendered image URL is reused by all eight cells in its row, so the 72-cell matrix
requires only nine animation compilations and worker image requests per refresh.

Eight Step uses the same shared preview worker, camera setup, sequential request queue, stale-render
cancellation, blob URL cleanup, and resize observation as VTG and Quarter Spacing. Swap, Flip,
Scale, and source-cell size changes refresh the nine previews. BPM changes timing only, while Thick,
Paths, Hands, and Arms are player presentation settings, so those controls intentionally do not
invalidate the still images.

## Regression validation

The regression suite compiles every one of the 144 source tracks and verifies:

- all 13 compiled cardinal positions;
- all 12 incoming position axes, not only segment endpoints;
- closed first/final prop orientation;
- the Green and Orange family turn sequences;
- each FLIP result against the supplied even-page handpath table;
- Swap, player controls, matching, component hydration, and full player application.
- nine-source thumbnail rendering, row-wide image reuse, resize refresh, and control invalidation.
- sparse query encoding and complete compiled-playback equivalence after a URL round trip.

The axis checks are required because equal endpoints alone can conceal a wrong spherical path.
