# Quarter Space Tech

Quarter Space Tech (QST) is a Concepts catalog at `/quarter-space-tech`. Its initial chooser opens
the Breaks, Advanced, or Beyond libraries. The catalog preserves the active legacy library's 228
captions and order. Breaks uses the legacy `pbreak` boundaries directly, while Advanced and Beyond
combine consecutive boundary groups in pairs for web pagination. The old print, editing,
persistence, import/export, and development-library behavior is intentionally not included.

QST predates SpiroAnim and explored plane breaks while ignoring the back point and avoiding stalls
that return to the same point. Its pattern data is retained in SpiroAnim for historical purposes
and for interested users.

## Pattern data

Patterns are stored under `src/features/quarter-space-tech/data/patterns` as native readable
SpiroAnim prop frames. They do not retain the legacy compact position code. Each movement currently
uses `turns: -360`. A pattern may specify `lineBeats` to divide its presentation into multiple
diagram rows and worker-rendered thumbnails without changing the animation timeline.

Before playback and URL serialization, QST frames remove repeated inherited values and default
zero values using the same sparse-frame rules as the other Concepts. Antipodal Arc values are
canonicalized to `180` so they remain within the query format's `0-360` range.

When an existing animation matches QST geometry, the shared pattern matcher restores its Swap,
180°, BPM, Scale, rendering, and prop-visibility controls. The pane opens the matching Breaks,
Advanced, or Beyond page and highlights the detected pattern without replacing the loaded
animation. Equivalent transformed geometry is resolved in favor of the current Swap and 180°
controls.

Patterns that are exact prop-swapped counterparts share one catalog slot. With Swap off the slot
shows the first pattern in catalog order; with Swap on it shows the second. Patterns without a
swapped counterpart remain visible in both states. The visible patterns are repaginated eight per
page, with shorter pages at intentional section boundaries when needed. In Beyond, Part 3 starts on
page 3, leaving six Part 2 patterns on page 2, and Part 4 starts on page 4. Part 11 also starts on its
own page. In Breaks, Parts 6 and 7 each begin on their own page.

Within an open library, the Swap, 180°, and Reset controls appear directly below the library header
and above the top pagination.

The QST analyzer compiles each animation and identifies its endpoints as one of six positions:
Top, Left, Front, Right, Bottom, or Back. This derived position sequence drives the diagrams and
line thumbnails. Front and Back intentionally share the center diagram cell; Back receives the
hollow-center treatment.

## Rendering

Detailed position tiles are semantic DOM and CSS. Shared-position fill orientation is determined
from the following beat, matching the legacy QST tile rules. Transition abbreviations are also
derived from compiled animation data. Pattern-card titles remain on one line and shrink only when
their available width is too narrow for the full caption. Cards use equal-width responsive columns,
so an incomplete wrapped row retains the same card width as the rows above it.

Thumbnails are generated at runtime by the shared animation worker. No QST image assets are stored
or served. Diagram prop colors are read from the active animation colors, with the standard concept
prop colors as the fallback.

Loaded QST patterns use the historical QST camera orientation: Orbit Arc `110`, Orbit Plane `-115`,
Center Distance `1`, Center Arc `135`, and Center Plane `180`. Orbit Distance remains controlled by
the Scale-to-Distance mapping. Thumbnails intentionally use the standard VTG/Eight Step camera
instead of this historical perspective.

The pane's `MORE...` section links to the three original QST documents under `public/docs/qst`.
They are retained and shared for legacy purposes.
