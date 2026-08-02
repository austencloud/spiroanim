# Query String and Property Control Model

This document describes how editor property controls, VTG controls, animation state, URL query
strings, clamping, precision, defaults, inheritance, and undo history interact. It is intended to
be the reference used before changing a slider, adding a property, changing a numeric range, or
modifying the query-string format.

The animation-frame inheritance and compilation rules are documented separately in
[`ANIMATION_FRAME_MODEL.md`](./ANIMATION_FRAME_MODEL.md).

The authoritative implementations are:

- `src/features/editor/components/properties/` for property panels and form controls.
- `src/features/editor/composables/useProperties.ts` for property reads, writes, display values,
  and editor-side range constraints.
- `src/features/editor/stores/usePropertiesStore.ts` for the active prop/frame selection.
- `src/services/query/versions/SpiroAnimQSv1.ts` for version 1 ranges, bit widths, field order, and
  segment layout.
- `src/services/query/createBaseQueryCodec.ts` for integer normalization and bit packing.
- `src/composables/useSpiroAnimQS.ts` for root/prop/frame encoding, decoding, and query history.
- `src/composables/useMainRoute.ts` for synchronization between `ROOT` and the browser URL.
- `src/math/animation/PlayerFunc.ts` for post-decode root defaults.
- `src/math/animation/AnimFunc.ts` for frame defaults, inheritance, and compilation.
- `src/features/vtg/data/vtgPlayerSettings.ts` and
  `src/features/vtg/data/vtgPatternCatalog.ts` for VTG-specific controls and transforms.
- `src/features/qtr/` for Quarter Spacing transforms, matching, labels, and frame-derived headers.

## The complete data path

An editor property change normally follows this path:

```text
Property panel metadata
        |
        v
Form control (slider, text, select, checkbox)
        |
        v
rootSet / propSet / animSet
        |
        +-- constraints() clamps to the version 1 VDEF range
        |
        v
ROOT (sparse editable RootDataFinal)
        |
        +-- player-store watcher --> rootCompile() --> worker-ready data
        |
        +-- route watcher --> encodeQS() --> ?r=...&p0=...&v=1
```

Loading a shared URL follows the reverse path:

```text
route.query
    |
    v
decodeVer() selects a version
    |
    v
decodeQS() / decodeVar() unpack sparse integer fields
    |
    v
rootFinal() supplies a small set of root runtime defaults
    |
    v
ROOT replacement
    |
    +-- rootCompile() supplies frame defaults and inheritance
    |
    +-- encodeQS() canonicalizes the URL again after ROOT changes
```

There is no single universal clamp or normalization step. A value can pass through several
independent layers, each with a different responsibility.

## The four numeric-control layers

| Layer             | Main location                      | Responsibility                                             | What it does not guarantee                       |
| ----------------- | ---------------------------------- | ---------------------------------------------------------- | ------------------------------------------------ |
| Control metadata  | Property panel or VTG component    | Slider range, step, multiplier, displayed precision        | Query compatibility or final state range         |
| Property setter   | `useProperties.ts`                 | Clamp editor writes to `VDEF` minimum and maximum          | Integer values, rounding, or semantic transforms |
| Feature transform | For example `vtgPlayerSettings.ts` | Convert a feature-level value into stored animation values | General editor behavior                          |
| Query codec       | Query service                      | Fit serialized values into the versioned integer schema    | Preservation of unsupported fractions            |

When a value is wrong, identify the layer that produced it before changing a similarly named
control elsewhere. For example, the editor's `Distance` property control is separate from the VTG
`Scale` control that derives a root `distance` value.

## Property panel metadata

Panels pass an array of `DynamicVal` metadata to `PropertyPanel.vue`. The panel chooses a form by
appending `Form` to `component`, such as `Decimal` -> `DecimalForm.vue`.

The commonly used metadata fields are:

| Field        | Meaning                                                                                        |
| ------------ | ---------------------------------------------------------------------------------------------- |
| `name`       | State key passed to the getter and setter.                                                     |
| `text`       | Property label displayed by the panel.                                                         |
| `component`  | Form component prefix.                                                                         |
| `undef`      | Shows a clear button and, for selects, an `Undefined` option.                                  |
| `items`      | Values displayed by an integer-backed select.                                                  |
| `label`      | Accessible/manual-input label.                                                                 |
| `min`, `max` | Slider delta range, not necessarily the final property range. Defaults to `-10` and `10`.      |
| `step`       | Slider delta increment. Defaults to `1`.                                                       |
| `mult`       | Converts one slider step into stored units. Defaults to `1`.                                   |
| `float`      | Precision factor used by decimal controls. It truncates with `floor(value * factor) / factor`. |
| `def`        | Fallback starting value when a slider cannot obtain a numeric value.                           |
| `neg`        | Allows negative manual input.                                                                  |
| `posi`       | Forces manual values below `1` up to `1`.                                                      |

`float` is a precision factor, despite its name:

| Metadata     | Effective precision                                                           |
| ------------ | ----------------------------------------------------------------------------- |
| omitted      | Integer-only manual input, but the slider does not itself quantize its result |
| `float: 1`   | Whole numbers, truncated toward negative infinity                             |
| `float: 10`  | One decimal place                                                             |
| `float: 100` | Two decimal places                                                            |

Because the implementation uses `Math.floor`, `float` is not nearest-value rounding. For example,
with `float: 1`, `2.9` becomes `2` and `-2.1` becomes `-3`.

### Decimal sliders are relative controls

`DecimalForm.vue` does not use the range input as the property's absolute value. The range starts
at zero and represents an adjustment from the value captured when interaction begins:

```text
result = captured property value + slider delta * multiplier
```

The range's `min` and `max` therefore limit the adjustment made in one interaction. They do not
define the final stored range. The setter applies the separate `VDEF` range afterward.

For example, `Turns` dynamically uses the current arc denominator as `mult`. If the denominator is
90 degrees, moving the slider by two steps adds 180 stored degrees.

At pointer-down or key-down, the form:

1. Starts a query-history group.
2. Freezes `min`, `max`, and `mult` for the interaction.
3. Captures the current effective value from the property getter.

Each input event writes a new property value. Pointer-up, pointer-cancel, key-up, or blur closes the
history group and resets the range to zero.

If the getter returned an inherited or compiled value, moving the slider writes that effective
value back as an explicit raw property. This is intentional but changes the sparsity of the frame.

### Manual decimal input

`DecimalTextForm.vue` writes on every accepted input change. It starts one history group on focus
and ends it on blur.

Important current behavior:

- Without `float`, the accepted syntax is integer-only.
- With `float`, a decimal point is accepted and the same floor-based precision factor is applied.
- `neg` permits a leading minus sign.
- Without `neg`, a negative numeric result is changed to its positive equivalent.
- An invalid or nonnumeric completed value becomes `0`.
- The setter still applies the `VDEF` range after parsing.

### Other property forms

- `BooleanForm.vue` writes a boolean immediately.
- `SelectIntForm.vue` writes an integer index, or `undefined` when the optional undefined entry is
  selected.
- `BeatsForm.vue` stages slider changes locally and writes only when `APPLY` is selected.
- `OffsetForm.vue` presents three decimal controls and writes a cloned three-coordinate `move`
  tuple. Its horizontal multiplier is reversed.
- `YawForm.vue` adds a reverse-angle action around a decimal control.
- `ArcForm.vue` adds named arc presets but otherwise delegates to the decimal control.
- Point/path/direction controls calculate underlying `arc`, `plane`, `axis`, or `turns` values from
  compiled geometry rather than storing `point`, `path`, or `direct` fields.

## Property getters, selection, and inheritance display

`usePropertiesStore.ts` derives the currently active raw frames, compiled frames, and props from
the timeline position or selected range. The property getters return a four-item `ValRetType`:

```text
[value, all selected values equal, display string, value is inherited/fallback]
```

The UI styles this state as:

- `val-def`: an explicit value is present and selected values agree.
- `val-fall`: the displayed value comes from compiled data, a prop, or the root.
- `val-undef`: no explicit or fallback value was found.
- `val-mism`: selected items do not agree.

Frame reads look in this order:

1. Raw selected frames.
2. Compiled selected frames when the raw value is undefined.
3. Selected prop values.
4. Root values.

Prop reads look at selected props and then the root. Root reads use the root directly.

The compiler, not the query decoder or property UI, owns the detailed frame inheritance rules.
See `ANIMATION_FRAME_MODEL.md` before deciding whether an undefined raw field is equivalent to an
explicit value.

## Editor-side constraints

All three normal property setters call `constraints(key, value)` before writing:

- `rootSet` writes or deletes a root field.
- `propSet` writes or deletes the field on every selected prop.
- `animSet` writes or deletes the field on every selected frame, except for calculated geometry
  controls.

`constraints()` reads the current version 1 `VDEF` entry and clamps numeric values to its declared
minimum and maximum. For `move`, it clamps each coordinate and mutates the passed array. Booleans
are not numerically clamped. Keys absent from `VDEF` pass through unchanged.

The constraint function does **not**:

- Round or truncate fractional numbers.
- Apply slider `min`, `max`, `step`, `mult`, or `float` metadata.
- Supply defaults or inheritance.
- Validate enum indices beyond their numeric `VDEF` range.
- Run for direct programmatic assignments to `ROOT`.

After a setter mutates the shallow root object, it calls `triggerRef(ROOT)`. This is required to
run compilation and URL watchers after nested mutations.

## Version 1 query schema

`SpiroAnimQSv1.ts` is both a serialization schema and the range source currently used by editor
setters. Every definition is:

```text
[minimum, maximum, bit width, optional decode transform]
```

Version 1 stores integer values. One all-ones bit pattern is reserved for `undefined`, so a field
with `N` bits has at most `2^N - 1` defined codes.

| Field      |       V1 range |   Bits | Stored scope and notes                                |
| ---------- | -------------: | -----: | ----------------------------------------------------- |
| `bpm`      |        20..520 |      9 | Root                                                  |
| `beats`    |          1..63 |      6 | Frame                                                 |
| `prop`     | 0..1 currently |      4 | Root and prop; range follows `PTEXT` length           |
| `color`    | 0..6 currently |      4 | Root and prop; range follows `COLORS` length          |
| `guides`   |           0..1 |      2 | Root and prop; decoded with `Boolean`                 |
| `paths`    |           0..1 |      2 | Root and prop; decoded with `Boolean`                 |
| `hands`    |           0..1 |      2 | Root and prop; decoded with `Boolean`                 |
| `visible`  |           0..1 |      2 | Root and prop; decoded with `Boolean`                 |
| `nodes`    |           0..1 |      2 | Root and prop; decoded with `Boolean`                 |
| `anchors`  |           0..1 |      2 | Root and prop; decoded with `Boolean`                 |
| `smooth`   |           0..1 |      2 | Defined, but not currently included in a V1 segment   |
| `type`     | 0..1 currently |      2 | Frame; range follows `TTEXT` length                   |
| `scale`    |        -20..40 |      6 | Frame, in internal tenths                             |
| `depth`    |        -30..30 |      6 | Frame, in internal tenths                             |
| `turns`    |    -1980..1980 |     12 | Frame degrees                                         |
| `adjust`   |      -180..180 |      9 | Frame degrees                                         |
| `arc`      |         0..360 |      9 | Frame degrees                                         |
| `plane`    |      -180..180 |      9 | Frame degrees                                         |
| `axis`     |      -180..180 |      9 | Frame degrees                                         |
| `move`     |        -30..30 | 6 each | Frame; three separately encoded coordinates           |
| `aspectx`  |          0..32 |      6 | Root                                                  |
| `aspecty`  |          0..32 |      6 | Root                                                  |
| `distance` |          4..66 |      6 | Root                                                  |
| `thick`    |          1..15 |      4 | Root only in V1; prop-level `thick` is not serialized |

The declared range must fit while retaining the undefined code. Development builds call
`validateQueryDefinitions()`, which logs an error for an oversized definition but does not throw.

### Fields that exist in memory but are not serialized

The query configuration, rather than `VDEF` alone, determines whether a field is stored.

Notable omissions from V1 include:

- Root `speed`, `type`, `turns`, and `depth`. `rootFinal()` supplies their runtime defaults after
  decode.
- Root `smooth`, despite having a `VDEF` entry.
- Prop-level `thick`, despite `PropData` allowing it and `VDEF` defining `thick`.
- Runtime/editor fields such as prop `active` and `click`.
- Calculated UI concepts `point`, `path`, and `direct`.

Changing one of these omissions is a query-format change, not merely a TypeScript or panel change.

## Version 1 segment layout

The URL uses these keys:

```text
?r=<root>&p0=<first prop>&p1=<second prop>&...&v=1
```

Prop keys must be contiguous. Decoding begins with `p0` and stops at the first missing key, so a
URL containing `p0` and `p2` but no `p1` ignores `p2` and everything after it.

The root value contains two fixed groups:

1. Five characters: `bpm`, `color`, `prop`, and the six root booleans.
2. Four characters: `aspectx`, `aspecty`, `distance`, and `thick`.

Each prop begins with:

1. Three characters for inherited display booleans and `color`.
2. One character for `prop`.
3. A dot-separated animation-frame section.

Each frame may contain, in order:

1. Three characters: `plane`, `arc`.
2. Two characters: `turns`.
3. Two characters: `type`, `axis`.
4. One character: `beats`.
5. One character: `scale`.
6. One character: `depth`.
7. Two characters: `adjust`.
8. Three characters: `move.x`, `move.y`, `move.z`.

Field order, group order, group length, bit width, and the query alphabet are persisted-data
contracts. Reordering a list without changing its types still changes every encoded URL.

## Low-level packing

The codec uses this custom URL-safe radix-64 alphabet:

```text
0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-
```

This is not standard Base64. The final character, `-`, is also the maximum radix digit used for
all-ones padding.

For a defined numeric value, normalization is:

```text
normalized = clamp(value - minimum, 0, maximum - minimum)
```

For `undefined`, normalization produces the field's all-ones bit pattern. Fields are packed
least-significant field first into a signed 32-bit JavaScript bit field. Versioned packed groups
must therefore remain within the documented practical maximum of 30 bits.

Unused bits up to the fixed character length are filled with ones. Entire trailing groups made
only of maximum digits are removed. On decode, the all-ones field value becomes `undefined` and a
definition transform such as `Boolean` is applied.

### Integer requirement and fractional values

Version 1 has no fractional encoding. The property setter's range clamp does not enforce this.

Packed scalar fields pass through JavaScript bitwise operators, which coerce nonnegative
normalized fractions to integers by discarding the fractional part. This is an implementation
side effect, not a supported rounding policy. A value such as root `distance: 17.5` can therefore
decode as `17` after a query-string round trip.

The three `move` coordinates use direct radix encoding rather than the packed-field path. Passing
a fraction there can produce malformed or shortened output because fractional values are not
valid alphabet indices. Every V1 value must be converted to an integer before encoding.

Consequently, a feature that calculates a V1-backed value should make its rounding policy
explicit at the feature boundary:

```text
derived floating-point value
        |
        v
explicit Math.round / floor / ceil chosen by domain behavior
        |
        v
integer RootData/PropData/AnimData value
        |
        v
query encoder
```

Do not rely on the serializer's bitwise coercion as a clamp.

## Sparse encoding

Query encoding preserves sparse raw data rather than compiled values.

- An undefined field uses its reserved all-ones code.
- Trailing all-undefined groups are removed from a root, prop, or frame.
- Frame strings are joined with `.`.
- An entirely empty frame contributes no field characters but retains its dot position.
- Undefined fields in the middle of a group remain encoded because later fields need their fixed
  bit positions.

This is why raw-frame compaction matters. Explicit inherited values make URLs longer even when
compiled playback is identical. Refer to `ANIMATION_FRAME_MODEL.md` for safe compaction rules.

## Decoding, defaults, and malformed input

`decodeVer()` reads `v`, defaulting to the current version. A supported historical version loads
its matching module. If loading the requested version fails, the code warns and attempts to decode
the data with the current version.

Current decoder tolerance includes:

- Characters outside the custom alphabet contribute a zero radix digit.
- Short fixed groups decode only the substrings that are present.
- Numeric outputs are clamped again to their definition ranges.
- Missing packed fields remain undefined.

This tolerance is compatibility behavior, not comprehensive validation of untrusted data.

After query decoding, `rootFinal()` currently supplies only:

- `speed: 1`
- root `type: Spherical`
- root `turns: 0`
- root `depth: 0`

Frame defaults and inheritance are applied later by `rootCompile()`. Query decoding deliberately
does not expand sparse frame objects.

## URL synchronization

`useMainRoute.ts` owns the main runtime synchronization:

- On startup, if `route.query.r` exists, it decodes the query and replaces `ROOT`.
- A watcher on `ROOT` encodes the complete current animation and calls `router.replace()`.
- `router.replace()` updates the current browser history entry rather than adding an entry for
  every edit.
- `qsPause` can suppress ROOT-to-URL writes, although normal property controls do not toggle it.
- Route query changes after initial startup are tracked for subsequent path replacements, but the
  composable does not continuously decode every later query change back into `ROOT`.

Because `ROOT` is a `shallowRef`, nested edits must call `triggerRef(ROOT)`. Replacing `ROOT.value`
directly, as VTG generation and undo do, triggers watchers naturally.

## Query-backed undo and redo

Undo history stores canonical encoded query strings rather than object snapshots. It is session
state and is not persisted.

- Identical consecutive encodings are deduplicated.
- A new edit clears redo history.
- History is capped at 500 entries.
- Undo moves the current entry to `qsFuture` and decodes the preceding entry.
- Redo moves an entry back and decodes it.
- `qsSkip` prevents the ROOT update caused by undo/redo from immediately adding a duplicate history
  entry.

Continuous decimal interactions use `beginHistoryGroup()` and `endHistoryGroup()`. The original
state and final encoded state remain, while intermediate slider/input events replace the same
history slot. Controls that make one discrete write generally do not need grouping.

Since undo snapshots are query strings, fields omitted by the V1 format are also omitted from undo
snapshots. Query format coverage therefore defines undo coverage.

## Concept controls are a separate property path

The Concepts pane does not use `PropertyPanel`, `DynamicVal`, or `useProperties.constraints()`.
Its VTG and Quarter Spacing panels use the same native matrix controls. VTG sends a
`VtgPatternSelection` to the VTG builder, while Quarter Spacing sends a `QtrPatternSelection` to
the Qtr builder. Speed Ratio, Swap, and Flip are held in the shared Concepts store so their
values remain unchanged when switching between the two panels.

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

VTG builds a new two-prop pattern, merges most current root settings, replaces pattern props, and
then assigns `ROOT.value`. The normal route watcher subsequently serializes it.

VTG matching compiles geometry and identifies Scale from the first frame's internal scale. Root
Distance is not part of the VTG geometry signature, so a distance mismatch does not by itself stop
a pattern match.

Quarter Spacing provides two mutually exclusive transforms and always has one selected. `Qtr #1`
adds 90 degrees to the original first animation track's first-frame arc. `Qtr #2` rotates the
complete Qtr #1 pattern another 90 degrees using first-frame arc adjustments. Plane 0 receives +90
degrees and plane 180 receives -90 degrees so both planes rotate in the same spatial direction
without changing their paths. Arc adjustments wrap within 0-359 degrees. Qtr #1 is the default;
selecting an active radio again cannot clear it, and Reset returns to Qtr #1. With Swap, the
adjustments move with their original tracks.

Quarter Spacing previews and matching apply the Qtr transform around the shared VTG pattern builder
and matcher so selected cells and shared options can be recovered when switching panels or loading
animation data. Matrix labels and cell tooltips are derived from each compiled pattern rather than a
cell-label table. Hand timing compares the two compiled position vectors, prop timing compares the
two rotation vectors, and direction compares their travel axes. Parallel timing is Together (`T`),
antiparallel timing is Split (`S`), and orthogonal timing is Quarter (`Q`); direction remains Same
(`S`) or Opposite (`O`). The generated tooltip expands those letters as `Hands: Timing / Direction`
and `Props: Timing / Direction`.

Qtr header display labels remain configured separately in `qtrLabels.ts`. Quarter Spacing disables
all header tooltips because the normal VTG descriptions do not explain the transformed header
states. It also hides every header divider, including rule 5's offset divider, and hides the prop
diagrams in the bottom headers. The left-header prop diagrams remain visible.

The visible Quarter Spacing header props mirror the rendered POI material colors. Each prop's large end is
the head (`COLSET` slot 0), its small end is the handle (`COLSET` slot 1), and its connecting line is
the tether (`COLSET` slot 2). The first header prop uses VTG's Green color set and the second uses
VTG's Orange color set, matching the generated animation's prop colors.

In Quarter Spacing, each left-header prop diagram is recalculated from the first compiled
frame of the first cell in that row (`1-1` through `1-6`). The closest cardinal direction of `pos`
selects top, right, bottom, or left. The sign of `pos dot rot` selects out or in. Placements reuse
the exact bounds demonstrated by left rule 2 for left/right and bottom rule 2 for top/bottom. Swap
and Flip participate in this calculation; controls that do not change first-frame geometry do
not.

The bottom-header prop diagrams are not displayed in Quarter Spacing.

Flip mirrors each left header from left to right. Its title block, divider, and regular prop
placements move together, including which end of a prop is rendered as the head. Flipped
left-header titles are right-aligned against the right edge. Header numbers remain in their normal
bottom-right position. Bottom headers keep their normal layout when Flip is enabled.
Quarter Spacing header props are not mirrored a second time because their positions already come
from compiled frames that include the Flip transform; the surrounding title layout still
mirrors normally.

## How to change a slider safely

Before changing a slider, answer these questions in order:

1. **What value is the user controlling?** Is it the stored property itself, a relative delta, or
   a feature-level input that derives several stored properties?
2. **Which UI owns it?** Editor property controls and concept controls use different pipelines.
3. **What are the stored units?** Scale and Depth are displayed as tenths but stored as integers;
   angles are stored in degrees.
4. **Should the control round, floor, or preserve fractions?** Make this explicit before the query
   boundary.
5. **Does V1 encode the field and scope?** A root field and a same-named prop field are not
   necessarily both serialized.
6. **Does the desired range fit the existing bit width while reserving undefined?** If not, create
   a new query version.
7. **Does undefined inherit, default, or mean zero?** Consult the frame model.
8. **Should a continuous gesture be one undo step?** Use query history grouping when needed.
9. **Can the change affect canonical URLs or old shared links?** Add round-trip and fixed-string
   regression tests.

### Common slider modifications

| Goal                                | Correct place                                                             |
| ----------------------------------- | ------------------------------------------------------------------------- |
| Change how far one drag can adjust  | Metadata `min` / `max`                                                    |
| Change slider granularity           | Metadata `step`                                                           |
| Change stored units per step        | Metadata `mult`                                                           |
| Quantize an editor decimal control  | Metadata `float`, while accounting for floor semantics                    |
| Change the legal persisted range    | New or intentionally revised query schema plus migration/version analysis |
| Round a derived VTG value           | VTG transform function before assigning animation data                    |
| Change inheritance/default behavior | Compiler/frame model, not query packing                                   |

## How to change the query format safely

Treat a query version as immutable once URLs have been shared. The following all require versioning
analysis and normally a new version:

- Reordering fields or groups.
- Changing a bit width.
- Changing a field minimum or its numeric meaning.
- Changing the custom alphabet.
- Adding a field into an existing fixed group.
- Starting to serialize a previously omitted field.
- Changing boolean or enum transforms.
- Changing frame separators or trailing-group stripping.

A new version should:

1. Add a new module under `src/services/query/versions/`.
2. Preserve the old module unchanged.
3. Add the version to `loadSpiroAnimQSVersion()`.
4. Advance `CURRENT_VERSION` only for newly generated URLs.
5. Define how older decoded data obtains new defaults.
6. Add fixed known-string tests for each supported version.
7. Add encode/decode tests at range boundaries, for undefined, and for every new field.
8. Test full application data through encode -> decode -> compile, not only the low-level codec.

## Required regression coverage

Changes in this area should select applicable tests from these categories:

- **Control behavior:** slider step, multiplier, precision, text parsing, and final setter calls.
- **Constraints:** below-minimum, maximum, above-maximum, array coordinates, and fractions.
- **Codec:** minimum, maximum, undefined, boolean transforms, invalid characters, and bit capacity.
- **Fixed URL compatibility:** known V1 root and prop strings remain unchanged.
- **Sparse frames:** empty frames, middle undefined fields, trailing undefined groups, and `move`.
- **Round trip:** editable data -> query -> editable data -> compiled data.
- **Route synchronization:** initial hydration and subsequent ROOT-to-URL replacement.
- **History:** gesture grouping, undo, redo, deduplication, and redo invalidation.
- **Feature transforms:** VTG control boundaries and derived Scale/Distance values.

## Current design cautions

The following are important existing behaviors to keep in mind during future work:

- `VDEF` currently serves two responsibilities: editor range constraints and persisted query schema.
  Changing it for UI convenience can silently change shared-URL compatibility.
- Slider bounds describe relative adjustment, while query bounds describe stored values.
- `float` truncates; it does not round.
- Query V1 assumes integers, but editor setters only clamp ranges.
- Prop-level `thick` and root `smooth` are currently outside V1 query and undo coverage.
- Unsupported query versions fall back to the current decoder after warning.
- Prop decoding stops at the first missing numbered prop key.
- Direct state assignments and feature builders must enforce their own domain normalization before
  serialization.
- Equivalent compiled animation data can have different sparse raw objects and different URL
  lengths.

These are not all necessarily defects, but they are observable constraints. Changes should be
intentional and covered by compatibility tests.
