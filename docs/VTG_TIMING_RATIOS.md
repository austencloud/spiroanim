# VTG Timing Ratios

This document defines the working mathematics and naming rules for VTG timing ratios. It records
the ratio vocabulary independently of the current catalog and matching implementation so that
future ratio generation and detection can be derived from motion data.

VTG cell references are always written row first, then column. For example, `3-5` means row 3,
column 5. Catalog keys, UI selections, previews, matching results, and tests all use this order.

In this document, **petal** means one relative prop rotation expressed by the completed pattern.

## Angle terms

For one movement segment:

- `Arc` is the hand or path displacement.
- `Turns` is the prop's rotation relative to that hand displacement.
- The prop's absolute angular displacement is `Arc + Turns`.

For a complete pattern, accumulated values are the sums of the segment values. A segment `Arc` may
remain within the current 360-degree limit even when a preview or animation contains repeated
segments.

Timing detection uses the relative motion rate of each prop. It does not infer a larger timing from
the accumulated arc of repeated segments.

## Individual timing definition

A valid individual VTG timing is written as `1:n`:

- the complete timing contains one full hand or path circle;
- Anti-Spin produces `n + 1` petals;
- In-Spin produces `n - 1` petals.

Therefore:

```text
Complete Arc       = 360
Anti total Turns   = -360 * (n + 1)
In total Turns     =  360 * (n - 1)
```

For a segment whose hand displacement is `Arc`:

```text
Anti Turns = -Arc * (n + 1)
In Turns   =  Arc * (n - 1)
```

The corresponding absolute prop displacement remains:

```text
Absolute prop displacement = Arc + Turns
```

With 45-degree segments:

| Ratio | Anti petals | Anti Turns | In petals | In Turns |
| ----- | ----------: | ---------: | --------: | -------: |
| `1:1` |           2 |       -90° |         0 |       0° |
| `1:2` |           3 |      -135° |         1 |      45° |
| `1:3` |           4 |      -180° |         2 |      90° |
| `1:4` |           5 |      -225° |         3 |     135° |
| `1:5` |           6 |      -270° |         4 |     180° |

The `1:1` In-Spin case is not a mathematical exception. Its `Turns` value is zero because the
absolute prop displacement equals the hand displacement. The prop is not static. Its completed
path has zero petals and may appear as a circle or a degenerate circle depending on the geometry
and phase.

## Worked `1:3` example

For one complete 360-degree hand circle:

| Motion    |  Arc |  Turns | Absolute prop displacement | Petals |
| --------- | ---: | -----: | -------------------------: | -----: |
| Anti-Spin | 360° | -1440° |                     -1080° |      4 |
| In-Spin   | 360° |   720° |                      1080° |      2 |

The equivalent 45-degree segments are:

| Motion    | Arc | Turns | Absolute prop displacement |
| --------- | --: | ----: | -------------------------: |
| Anti-Spin | 45° | -180° |                      -135° |
| In-Spin   | 45° |   90° |                       135° |

Eight such segments accumulate the same values as the 360-degree form.

## Relative-rate detection

For a timing-bearing segment, define the relative rate as:

```text
r = abs(Turns / Arc)
```

For an individual `1:n` timing:

```text
Anti rate = n + 1
In rate   = n - 1
```

The timing number is therefore recovered independently for each prop:

```text
Anti: n = r - 1
In:   n = r + 1
```

The result must be a positive whole number within an appropriate floating-point tolerance.

Initial placement values do not replace continuation values used for timing detection. For
example, an initial `Arc = 180`, `Turns = 0` may establish placement while later 45-degree
continuations carry the timing.

## Compound timings

When both props have the same individual timing, the pattern uses that timing name directly:

```text
1:2 + 1:2 = 1:2
```

When the props use different individual timings, join their timing numbers with `v`. The left value
belongs to `prop[0]` and the right value belongs to `prop[1]`:

```text
prop[0] 1:2 + prop[1] 1:3 = 1:2v3
prop[0] 1:1 + prop[1] 1:3 = 1:1v3
prop[0] 1:3 + prop[1] 1:5 = 1:3v5
```

The compound name encodes a prop-index assignment. Each prop still uses its own continuation's
Anti-Spin or In-Spin formula when deriving Turns.

`1:2v3` and `1:3v2` are therefore distinct timing configurations:

```text
1:2v3 = prop[0] 1:2, prop[1] 1:3
1:3v2 = prop[0] 1:3, prop[1] 1:2
```

Swap is applied after generation as an exchange of the completed animation tracks. It does not
change the selected compound timing because each completed track carries its generated timing with
it.

## Worked `1:2v3` example

The pattern previously described as `2:5` is now named `1:2v3`. `2:5` is not a valid timing under
the current naming model.

Its timing-bearing 45-degree motion is:

| Prop | Spin | Arc | Turns | Relative rate | Individual timing |
| ---- | ---- | --: | ----: | ------------: | ----------------: |
| 0    | Anti | 45° | -135° |             3 |             `1:2` |
| 1    | In   | 45° |   90° |             2 |             `1:3` |

The two individual timings differ, so the `prop[0]` timing is written first and the `prop[1]`
timing second:

```text
prop[0] 1:2 + prop[1] 1:3 = 1:2v3
```

[Open the two-frame `1:2v3` reference pattern](http://localhost:8080/play-edit?r=Ew08Yk11Y&p0=Q__..5L_sR&m0=_1_mxqv__&p1=N__..5L_wm&c=_i_bhq&v=6)

Repeating the movement as eight 45-degree slices is useful for a 360-degree preview but does not
change the detected timing.

## Detection procedure

1. Identify a representative timing-bearing continuation for each prop.
2. Calculate each prop's relative rate `abs(Turns / Arc)`.
3. Use the prop's spin direction to calculate its individual `1:n` timing.
4. If both individual timings agree, assign that timing to the pattern.
5. If they differ, write the `prop[0]` timing first and the `prop[1]` timing second, joined with `v`.

The compound timing preserves prop order.
