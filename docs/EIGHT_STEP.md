# Eight Step

Eight Step is an 8-column by 9-row concept matrix. Each cell selects a complete two-prop,
12-step animation. The feature follows the established VTG and Quarter Spacing interaction model,
but its animation data is generated from authoritative handpaths and curve-family rules instead of
being maintained as a static catalog of encoded animations.

The source handpath tables are authoritative for hand positions. The primitive curve families are
authoritative for the prop-rotation relationship on each visible step.

The primary implementations are:

- `src/features/eight-step/data/eightStepPatternDefinitions.ts`: odd-page handpaths, curve-family
  rules, frame solving, sparse-frame compaction, and generation of all 72 cell definitions.
- `src/features/eight-step/data/eightStepPatternCatalog.ts`: Flip, Swap, Scale, BPM, and Diamond/Box
  transformations.
- `src/features/eight-step/createEightStepAnimation.ts`: prop defaults, current-animation merging,
  final animation creation, and preview animation creation.
- `src/features/eight-step/matchEightStepAnimation.ts`: recovery of the selected cell and controls
  from compiled geometry.
- `src/features/eight-step/components/EightStepPane.vue`: matrix interaction, colors, highlighting,
  tooltips, previews, controls, hydration, and responsive layout.
- The adjacent unit and component tests: ownership, geometry, transforms, matching, hydration,
  controls, rendering, and URL regression coverage.

## Matrix vocabulary

The nine row codes are:

| Code | Meaning      |
| ---- | ------------ |
| AA   | Anti vs Anti |
| AE   | Anti vs Ext  |
| AI   | Anti vs In   |
| EA   | Ext vs Anti  |
| EE   | Ext vs Ext   |
| EI   | Ext vs In    |
| IA   | In vs Anti   |
| IE   | In vs Ext    |
| II   | In vs In     |

The first letter describes the first, normally Green, capping prop. The second describes the
second, normally Orange, continual prop. `A`, `E`, and `I` mean Antispin, Extension, and Inspin.
These relationships are also exposed as tooltips on the row headers.

The eight columns select the eight odd source pages. Pairs of columns share a visible category
header:

| Column | Odd source page | Header group    |
| -----: | --------------: | --------------- |
|      1 |               1 | Opposite        |
|      2 |               3 | Opposite        |
|      3 |               5 | Same            |
|      4 |               7 | Same            |
|      5 |               9 | Quarter Aligned |
|      6 |              11 | Quarter Aligned |
|      7 |              13 | Quarter Opposed |
|      8 |              15 | Quarter Opposed |

A cell reference places the column first and row second, such as `1-AA` or `6-IE`. Cell tooltips
combine the column relationship and row relationship on separate lines, for example `Opposite`
and `Anti vs Anti`.

## Pattern ownership and generation

The application stores the eight odd-page Green/Orange handpath pairs and generates all 72 matrix
cells from them. Every generated cell owns:

- two distinct prop objects;
- two distinct animation arrays; and
- 13 distinct frame objects per prop.

No prop, animation array, or frame object is shared between cells, rows, or columns. This satisfies
the requirement that every cell have its own complete animation definition even though the rules
that produce those definitions are shared.

Frame 0 establishes that cell and prop's private starting hand and prop state. Frames 1 through 12
are the visible steps. Frame 12 closes the handpath by returning to the first cardinal position.

The generated definitions use the application's sparse readable-animation representation. Values
that would simply inherit from the preceding frame are omitted, including repeated `arc`, `turns`,
`beats`, `scale`, `depth`, and `adjust`. Zero `plane` values are omitted, `axis` is omitted when it
matches the frame's plane, and a zero movement vector is omitted. `rootCompile()` reconstructs all
effective values before playback. This preserves the independent definitions and exact geometry
without placing a large repeated frame payload in shared URLs.

## Cardinal handpaths and frame solving

`T`, `R`, `B`, and `L` represent the application's middle top, right, bottom, and left points. Every
handpath transition is one of the eight ordered adjacent edge pairs (`TR`, `RB`, `BL`, `LT`, `TL`,
`LB`, `BR`, or `RT`), so every visible hand movement follows a 90-degree spherical arc.

A frame's `plane` is relative to the orthogonal reference transported through every preceding
frame. It cannot be selected from a permanent clockwise/counterclockwise lookup. This distinction
matters when the capping hand reverses direction. The generator walks the complete position state
for each prop and solves each incoming plane against the next authoritative cardinal target.

Prop `axis` is solved separately from hand position using the accumulated prop-rotation state. This
preserves both the requested turn amount and the intended endpoint phase. Position plane and prop
axis are therefore not assumed to remain interchangeable over a 12-step sequence.

## Curve families and row relationships

The frame model combines `arc` and `turns` for spherical prop rotation. Given a 90-degree hand arc,
the primitive families used by Eight Step are:

| Family    | `turns` | Effective prop rotation | Endpoint phase |
| --------- | ------: | ----------------------: | -------------- |
| Extension |       0 |              90 degrees | Out            |
| Antispin  |    -360 |            -270 degrees | Out            |
| Inspin    |     180 |             270 degrees | In             |
| Outspin   |     180 |             270 degrees | Out            |

Inspin and outspin use the same turn amount but start from opposite prop phases. Consecutive
inspin/outspin frames alternate the endpoint phase, producing the two different primitive paths.

The first row letter selects a repeating three-step family for the Green capping track:

- `A`: antispin, antispin, extension;
- `E`: extension, extension, antispin;
- `I`: inspin, outspin, antispin.

The second row letter selects the Orange continual track:

- `A`: antispin for all 12 steps;
- `E`: extension for all 12 steps;
- `I`: inspin, outspin, extension, repeated four times.

Rows therefore change the prop-rotation family applied to a page's handpaths; columns change the
underlying Green/Orange handpaths. All 72 combinations are generated separately.

## Flip and Swap

The controls are displayed in the order Flip, Swap, Reset.

Flip selects the authoritative even-page partner while the implementation stores only the odd
source page:

- Pages 1/2, 3/4, 5/6, and 7/8 mirror both handpaths left-to-right.
- Pages 9/10, 11/12, 13/14, and 15/16 rotate the Green handpath by 180 degrees while Orange remains
  the anchor handpath.

The even-page props are regenerated from the transformed handpaths, including fresh frame solving;
they are not created by blindly changing planes on the odd-page animation.

Swap exchanges the two complete source animation tracks before the standard player prop defaults
are applied. The animation, initial state, and any Box adjustment travel together. Green and Orange
remain player prop slots, so Swap also changes which source track receives each slot's defaults.
Flip and Swap are independent operations. In particular, an even-page Green track is not obtained
by substituting the odd-page Orange track.

## Diamond and Box

Eight Step has one unlabeled pair of radio controls immediately to the right of Paths, Hands, and
Arms: Diamond and Box. Diamond is the default and reproduces the original generated definitions.
Because it is the default, Diamond is omitted from a compact selection.

Box adds 45 degrees to frame 0's initial `arc` for both source props. Only the initial state is
rotated. The original first continuation arc is made explicit when Box is built so sparse-frame
inheritance cannot accidentally carry the 45-degree adjustment into later frames.

The Box transformation occurs after the odd/even handpath has been chosen by Flip and before the
tracks are exchanged by Swap. It applies to all row families and both props. Selecting Box refreshes
the row previews and can be recovered by compiled-geometry matching. While Box is selected, a note
below the controls explains that the mode is experimental, its patterns have not been validated,
and Difficult / Impossible Wall-Plane highlighting is disabled.

## Board interaction and visual rules

The random button occupies the top-left matrix position. It selects uniformly from all 72 cells.
The top header is split into four two-column groups rather than eight individual numbered headers.
The left header is half a normal cell's width, and the top header uses an automatic row with a
responsive minimum height. Balanced wrapping lets all four top headers grow together when labels
such as `Quarter Aligned` or `Quarter Opposed` need two lines.

Selecting a cell follows the VTG/Quarter Spacing interaction model:

- the exact selected cell receives the selected border;
- all cells in its exact row and exact column receive the shared highlighted background;
- the exact row header is highlighted;
- the complete paired top header is highlighted when either of its two columns is selected; and
- hover, dashed header borders, focus rings, and selected-state precedence use the same component
  behavior as the other concept matrices.

Row-header letter colors come from the active prop colors rather than fixed Green/Orange values.
Normally the first letter uses prop 1's head color and the second uses prop 2's head color. A
highlighted row uses the corresponding tether colors. Swap reverses those color roles immediately.
If no animation colors are available, the standard Green and Orange prop defaults are used.

In Diamond mode, these cells carry the additional dark-yellow marked border:

| Columns    | Marked rows    |
| ---------- | -------------- |
| 1, 4, 7, 8 | AE, AI         |
| 2, 3, 5, 6 | EE, EI, IE, II |

When a marked cell is selected, its dark-yellow border becomes red instead of white. Box mode
suppresses both the yellow and red marked-cell treatment; its selected cells use the ordinary white
selection border.

## Shared controls and lifecycle

Eight Step reuses the shared Concepts controls and store used by VTG and Quarter Spacing:

- Flip and Swap;
- BPM, Scale, and Thick;
- Paths, Hands, and Arms; and
- Reset.

Changing concepts does not reset these shared settings. A setting remains available even when the
currently displayed animation does not correspond to an active cell in the newly opened concept.
Swap and Flip are persisted with the selected concept; the remaining player settings are shared for
the current application session. Diamond/Box is owned by Eight Step because it has no VTG/Quarter
Spacing equivalent.

Once a cell is active, changing any applicable control rebuilds that selection. Reset restores the
shared pattern and player defaults and restores Diamond, while retaining the selected cell. On the
first empty animation, Eight Step resets its controls and chooses a random initial cell.

Pattern creation replaces the two pattern props, assigns the standard Green and Orange prop
defaults, and preserves unrelated current root settings. Scale is written to both props' initial
frames and the corresponding player distance is updated. BPM is clamped to the shared VTG range.

When an existing animation is supplied, the pane attempts to recover its cell, Flip, Swap, Shape,
BPM, and Scale from geometry. Thick, Paths, Hands, and Arms are read directly from the animation. If
the geometry is not an Eight Step candidate, no cell is shown as active and the shared controls are
not forcibly reset.

## Matrix thumbnails

Cells contain no text; their content is a still thumbnail. For rendering efficiency, Eight Step
renders only the first-column reference for each row (`1-AA` through `1-II`) and reuses that row's
image in all eight columns. The thumbnails therefore communicate the row family; they are not an
independent render of each column's exact handpath. The 72 visible cells require nine animation
compilations and nine worker image requests per refresh.

Eight Step reuses the VTG/Quarter Spacing preview infrastructure: the shared preview worker, camera
setup, sequential request queue, stale-render cancellation, blob URL cleanup, and resize-based
refresh. A resize observer watches the nine first-column cells and requests appropriately sized
previews when their rendered dimensions change.

Swap, Flip, Scale, Diamond/Box, and source-cell size affect thumbnail geometry and refresh all nine
previews. BPM affects timing only. Thick, Paths, Hands, and Arms are player presentation controls,
so they intentionally do not invalidate these still images.

## Compact URLs and geometry matching

Eight Step does not serialize a separate cell identifier into the player animation. The selected
cell is built into the normal readable animation data, and the existing versioned query codec
encodes its sparse frames. Default and inherited fields are omitted, which keeps URLs substantially
shorter than fully expanded 72-pattern data while decoding to the same compiled playback.

To recover the UI state, matching compiles the active animation and the generated candidates for
all 72 cells, both Flip states, both Swap states, and both shape modes. Its geometry signature uses
every frame's `turns`, `arc`, and normalized `plane` for both props. BPM and Scale are recovered
separately. Thick, Paths, Hands, and Arms do not participate in the geometry signature.

Matching may produce more than one geometrically equivalent candidate; the pane uses the first
candidate in deterministic generation order. An animation emitted by the current selection is
recognized directly to avoid a needless hydration loop.

## Regression validation

The regression suite validates:

- 72 independently owned cell definitions, 144 independently owned prop tracks, and 1,872 distinct
  frame objects;
- all 13 compiled cardinal positions and all 12 incoming position axes for every source track;
- closed first/final prop orientation;
- the capping and continual curve-family turn sequences;
- all eight generated Flip results against the supplied even-page handpath table;
- Box's 45-degree initial arcs without altering continuation arcs;
- Swap/Flip/Box composition, matching, hydration, and full player application;
- paired top-header, exact row-header, row/column cell highlighting, active-prop header colors,
  marked borders, and tooltips;
- shared controls, reset behavior, and selection emission;
- nine-source thumbnail rendering, row-wide image reuse, resize refresh, and control invalidation;
  and
- sparse query encoding and complete compiled-playback equivalence after a URL round trip.

The incoming-axis checks are essential because matching endpoints alone can conceal an incorrect
spherical path.
