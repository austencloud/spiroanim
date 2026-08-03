# Query String Format

This document defines SpiroAnim's versioned URL schema, segment layouts, packing, sparse encoding,
decoder behavior, and compatibility requirements. Treat every published query version as a
persisted-data contract.

The authoritative implementations are:

- `src/services/query/versions/SpiroAnimQSv1.ts` and `SpiroAnimQSv2.ts` for versioned ranges, bit
  widths, field order, and segment layouts.
- `src/services/query/createBaseQueryCodec.ts` for integer normalization and bit packing.
- `src/composables/useSpiroAnimQS.ts` for root, prop, and frame encoding and decoding.
- `src/math/animation/PlayerFunc.ts` for post-decode root defaults.

## Query schema definitions

`SpiroAnimQSv1.ts` defines the shared ranges used by both supported layouts and by editor setters.
Every definition is:

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
| `arms`     |           0..1 |      2 | Root and prop in V2; decoded with `Boolean`           |
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
- Root and prop `arms`; V1 decoding supplies the root default of `false` after decode.
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

## Version 2 segment layout

Version 2 keeps every V1 field in the same position and uses previously unused bits for `arms`:

- The root's second four-character group appends root `arms` after `thick`.
- The prop's one-character group appends inherited prop `arms` after `prop`.
- Frame groups are unchanged.

Newly generated URLs use `v=2`. Version 1 URLs remain supported and decode with root `arms` set to
`false`; an omitted prop value inherits that root default.

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
compiled playback is identical. See [`ANIMATION_FRAME_MODEL.md`](./ANIMATION_FRAME_MODEL.md) for
safe frame compaction rules.

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

After query decoding, `rootFinal()` currently supplies:

- `speed: 1`
- root `type: Spherical`
- root `turns: 0`
- root `depth: 0`
- root `arms: false` when the decoded version does not provide it

Frame defaults and inheritance are applied later by `rootCompile()`. Query decoding deliberately
does not expand sparse frame objects.

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

## Regression coverage

Query-format changes should cover the applicable behavior:

- Minimum, maximum, undefined, boolean transforms, invalid characters, and bit capacity.
- Known V1 root and prop strings remaining unchanged.
- Empty frames, middle undefined fields, trailing undefined groups, and `move`.
- Editable data -> query -> editable data -> compiled data round trips.
- Initial route hydration and subsequent ROOT-to-URL replacement.
- Full feature-generated patterns through encode/decode when they use changed fields.

## Current cautions

- `VDEF` currently serves both editor constraints and persisted query schema.
- Query V1 assumes integers, but editor setters only clamp ranges.
- Prop-level `thick` and root `smooth` are currently outside V1 query and undo coverage.
- Unsupported query versions fall back to the current decoder after warning.
- Prop decoding stops at the first missing numbered prop key.
- Equivalent compiled animation data can have different sparse raw objects and URL lengths.
