# Query String and Property Model

This overview explains how editor controls, feature controls, sparse animation data, URL query
strings, compilation, and undo history connect. Use the focused guides below for implementation
details:

- [`PROPERTY_CONTROLS.md`](./PROPERTY_CONTROLS.md) - editor property metadata, forms, selection,
  inheritance display, constraints, and slider changes.
- [`QUERY_STRING_FORMAT.md`](./QUERY_STRING_FORMAT.md) - versioned schemas, field layouts, packing,
  sparse encoding, compatibility, and format changes.
- [`QUERY_STATE_AND_HISTORY.md`](./QUERY_STATE_AND_HISTORY.md) - browser URL synchronization and
  query-backed undo/redo.
- [`VTG_AND_QUARTER_SPACING.md`](./VTG_AND_QUARTER_SPACING.md) - Concepts controls, builders,
  transforms, matching, relationship labels, and headers.
- [`ANIMATION_FRAME_MODEL.md`](./ANIMATION_FRAME_MODEL.md) - frame defaults, inheritance,
  compilation, and worker interpretation.

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
        +-- constraints() clamps to the current-version VDEF range
        |
        v
ROOT (sparse editable RootDataFinal)
        |
        +-- player-store watcher --> rootCompile() --> worker-ready data
        |
        +-- route watcher --> encodeQS() --> ?r=...&p0=...&c=...&v=6
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
control elsewhere. For example, Motion and Camera Orbit each expose a `Distance` path property,
while the VTG `Scale` control derives the viewing distance used to create the Concept's first
Camera frame.

## Authoritative implementations

- `src/features/editor/components/properties/` - property panels and form controls.
- `src/features/editor/composables/useProperties.ts` - property reads, writes, display values,
  and editor-side range constraints.
- `src/features/editor/stores/usePropertiesStore.ts` - active prop/frame selection.
- `src/services/query/versions/SpiroAnimQSv1.ts` through `SpiroAnimQSv6.ts` - versioned ranges, bit
  widths, field order, and segment layouts.
- `src/services/query/createBaseQueryCodec.ts` - integer normalization and bit packing.
- `src/composables/useSpiroAnimQS.ts` - root/prop/frame encoding, decoding, and query history.
- `src/composables/useMainRoute.ts` - synchronization between `ROOT` and the browser URL.
- `src/math/animation/PlayerFunc.ts` - post-decode root defaults.
- `src/math/animation/AnimFunc.ts` - frame defaults, inheritance, and compilation.
- `src/features/vtg/data/vtgPlayerSettings.ts` and
  `src/features/vtg/data/vtgPatternCatalog.ts` - VTG-specific controls and transforms.
- `src/features/qtr/` - Quarter Spacing transforms, matching, labels, and frame-derived headers.

## Cross-cutting cautions

- `VDEF` currently serves two responsibilities: editor range constraints and persisted query
  schema. Changing it for UI convenience can silently change shared-URL compatibility.
- Slider bounds describe relative adjustment, while query bounds describe stored values.
- Query V1 assumes integers, but editor setters only clamp ranges.
- Direct state assignments and feature builders must enforce their own domain normalization before
  serialization.
- Equivalent compiled animation data can have different sparse raw objects and different URL
  lengths.

These are observable constraints, even when they are not defects. Changes should be intentional
and covered by the regression guidance in the focused document that owns the behavior.
