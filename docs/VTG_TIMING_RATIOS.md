# VTG Timing Ratios

This document defines the working mathematics for VTG timing ratios. It records the ratio
vocabulary independently of the current catalog and matching implementation so that future ratio
generation and detection can be derived from motion data.

In this document, **petal** means one relative prop rotation expressed by the completed pattern.

## Angle terms

For one movement segment:

- `Arc` is the hand or path displacement.
- `Turns` is the prop's rotation relative to that hand displacement.
- The prop's absolute angular displacement is `Arc + Turns`.

For a complete pattern, accumulated values are the sums of the segment values. A segment `Arc` may
remain within the current 360-degree limit even when the complete pattern accumulates more than one
circle.

For example, a complete accumulated arc of 720 degrees may be represented as either:

- sixteen segments with `Arc = 45`, or
- two segments with `Arc = 360`.

When the complete cycle is available, its accumulated arc must remain unwrapped. Normalizing 720
degrees to 0 or 360 degrees would discard the number of completed hand circles. A shorter
observation window can still identify a shared timing from complementary Anti-Spin and In-Spin
rates as described below.

## Ratio definition

For a VTG timing ratio `a:b`:

- the complete pattern contains `a` full hand or path circles;
- Anti-Spin produces `b + 1` petals over the complete pattern;
- In-Spin produces `b - 1` petals over the complete pattern.

Therefore, the complete pattern has:

```text
Complete Arc       = 360 * a
Anti total Turns   = -360 * (b + 1)
In total Turns     =  360 * (b - 1)
```

For a segment whose hand displacement is `Arc`, distribute those relative rotations evenly across
the `a` hand circles:

```text
Anti Turns = -Arc * (b + 1) / a
In Turns   =  Arc * (b - 1) / a
```

The corresponding absolute prop displacement remains:

```text
Absolute prop displacement = Arc + Turns
```

## Ratios with one hand circle

For `1:n`, the formulas reduce to the familiar VTG rule:

```text
Anti petals = n + 1
In petals   = n - 1

Anti Turns = -Arc * (n + 1)
In Turns   =  Arc * (n - 1)
```

With 45-degree segments:

| Ratio | Anti petals | Anti Turns | In petals | In Turns |
| ----- | -----------: | ---------: | --------: | -------: |
| `1:1` |            2 |       -90° |         0 |       0° |
| `1:2` |            3 |      -135° |         1 |      45° |
| `1:3` |            4 |      -180° |         2 |      90° |
| `1:4` |            5 |      -225° |         3 |     135° |
| `1:5` |            6 |      -270° |         4 |     180° |

The `1:1` In-Spin case is not a mathematical exception. Its `Turns` value is zero because the
absolute prop displacement equals the hand displacement. The prop is not static. Its completed
path has zero petals and may appear as a circle or a degenerate circle depending on the geometry
and phase.

## Worked `1:3` example

For one complete 360-degree hand circle:

| Motion    | Arc  | Turns  | Absolute prop displacement | Petals |
| --------- | ---: | -----: | -------------------------: | -----: |
| Anti-Spin | 360° | -1440° |                     -1080° |      4 |
| In-Spin   | 360° |   720° |                      1080° |      2 |

The equivalent 45-degree segments are:

| Motion    | Arc | Turns | Absolute prop displacement |
| --------- | --: | ----: | -------------------------: |
| Anti-Spin | 45° | -180° |                      -135° |
| In-Spin   | 45° |   90° |                       135° |

Eight such segments accumulate the same values as the 360-degree form.

## Worked `2:5` example

A `2:5` pattern contains two complete hand circles, so its accumulated arc is 720 degrees. It has:

- six Anti-Spin petals;
- four In-Spin petals;
- sixteen 45-degree segments.

For each 45-degree segment:

```text
Anti Turns = -45 * (5 + 1) / 2 = -135 degrees
In Turns   =  45 * (5 - 1) / 2 =   90 degrees
```

| Motion    | Arc | Turns | Absolute prop displacement |
| --------- | --: | ----: | -------------------------: |
| Anti-Spin | 45° | -135° |                       -90° |
| In-Spin   | 45° |   90° |                       135° |

Across all sixteen segments:

| Motion    | Accumulated Arc | Total Turns | Absolute prop displacement | Petals |
| --------- | --------------: | ----------: | -------------------------: | -----: |
| Anti-Spin |            720° |      -2160° |                     -1440° |      6 |
| In-Spin   |            720° |       1440° |                      2160° |      4 |

The same pattern may instead use two 360-degree segments. Each segment then uses `Turns = -1080`
for Anti-Spin or `Turns = 720` for In-Spin.

## Detection consequence

A single prop segment does not necessarily identify the complete ratio. Define its relative rate
as:

```text
r = abs(Turns / Arc)
```

For a timing `a:b`, the rate is:

```text
Anti rate = (b + 1) / a
In rate   = (b - 1) / a
```

Local 45-degree motion in the `2:5` example is deliberately ambiguous when either prop is analyzed
alone:

- its Anti-Spin `Turns = -135` is locally the same as `1:2` Anti-Spin;
- its In-Spin `Turns = 90` is locally the same as `1:3` In-Spin.

For an Anti-Spin prop with rate `r`, every positive whole-number `a` that produces a positive
whole-number `b = a * r - 1` is a candidate. For an In-Spin prop, the corresponding candidate is
`b = a * r + 1`. A lone Anti-Spin prop with rate 3 could therefore describe `1:2`, `2:5`, `3:8`,
and so on.

### Deriving a shared timing from complementary props

When one prop is Anti-Spin, the other is In-Spin, and both are known to share one timing, their two
rates identify that timing without the complete cycle arc. Let `rA` be the Anti rate and `rI` the In
rate:

```text
rA = (b + 1) / a
rI = (b - 1) / a
```

Subtracting and adding these relationships gives:

```text
a = 2 / (rA - rI)
b = a * (rA + rI) / 2
```

Both results must be positive whole numbers within an appropriate floating-point tolerance. The
same `b` can also be checked independently from each prop:

```text
b = a * rA - 1
b = a * rI + 1
```

The two-frame reference pattern contains only an initial state and one 45-degree movement for each
prop:

[Open the two-frame `2:5` reference pattern](http://localhost:8080/play-edit?r=Ew08Yk11Y&p0=Q__..5L_sR&m0=_1_mxqv__&p1=N__..5L_wm&c=_i_bhq&v=6)

Its values are:

| Prop | Spin | Arc | Turns | Relative rate |
| ---- | ---- | --: | ----: | ------------: |
| 0    | Anti | 45° | -135° |             3 |
| 1    | In   | 45° |   90° |             2 |

The shared timing is therefore:

```text
a = 2 / (3 - 2) = 2
b = 2 * (3 + 2) / 2 = 5
```

The result is `2:5` even though the observation renders only one 45-degree movement and does not
render the complete 720-degree cycle. Repeating that movement as eight 45-degree slices is useful
for a 360-degree preview but is unnecessary for this derivation.

### Smallest valid timing rule

Complementary-pair inference is unavailable when both props have the same spin. In that case, use
the smallest valid timing from each prop's candidate family. Complementary shared-timing detection
must run before this rule; minimizing the Anti and In props in the preceding example separately
would incorrectly label them `1:2` and `1:3` instead of recognizing their shared `2:5` timing.

If a prop's relative rate is reduced to the fraction `p/q`, its smallest timing is generally:

```text
Anti: q:(p - 1)
In:   q:(p + 1)
```

Both timing values must be positive whole numbers. If `p - 1` is not positive for Anti-Spin, test
successive whole-number multiples of `p/q` until both values are positive.

The both-Anti reference pattern uses an initial placement followed by eight repeated 45-degree
continuations:

[Open the both-Anti reference pattern](http://localhost:8080/play-vtg?r=Ew08Yk11Y&p0=Q__.mBE_____q.5JEsR.......&m0=_1_mxqv__&p1=N__.mBE_____q.5L_sR.......&c=_f_bhq&v=6)

Its timing-bearing continuation values are:

| Prop | Spin | Arc | Turns | Relative rate |
| ---- | ---- | --: | ----: | ------------: |
| 0    | Anti | 45° | -135° |             3 |
| 1    | Anti | 45° | -135° |             3 |

For either prop, the Anti candidate relationship is `b = 3a - 1`. Its candidates begin `1:2`,
`2:5`, `3:8`, and so on. The smallest-valid-timing rule selects `1:2`. Because both props
independently select `1:2`, the overall pattern timing is also `1:2`.

The initial `Arc = 180`, `Turns = 0` values establish placement and do not replace the continuation
values used for timing detection.

The resulting detection precedence is:

1. Calculate a representative relative rate for each prop.
2. If one prop is Anti and the other is In, first test whether they produce a valid shared timing.
3. Otherwise, select each prop's smallest valid timing independently.
4. If both independent results agree, assign that timing to the overall pattern.
5. If the independent results differ, retain separate per-prop timings.

This document does not yet prescribe a matching or storage implementation for independently timed
props.
