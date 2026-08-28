import { describe, expect, it } from 'vitest'

import {
  applyPatternFinalTransforms,
  applyPatternInitialArcRotation,
} from '@/features/concepts/applyPatternFinalTransforms'
import { rootFinal } from '@/math/animation/PlayerFunc'
import type { RootData } from '@/types/AnimTypes'

const createAnimation = () =>
  rootFinal({
    bpm: 60,
    prop: 0,
    color: 0,
    smooth: true,
    guides: false,
    paths: true,
    arms: false,
    nodes: false,
    anchors: false,
    aspectx: 16,
    aspecty: 9,
    thick: 8,
    props: [
      {
        color: 6,
        visible: false,
        anim: [{ arc: 90 }, { turns: 180 }],
        motion: [{ distance: 2, plane: 0 }],
      },
      {
        color: 1,
        anim: [{ arc: 45, plane: 180, axis: -90 }, { turns: -180 }],
        motion: [{ distance: 3, plane: 180 }],
      },
    ],
  } satisfies RootData)

describe('applyPatternFinalTransforms', () => {
  it('applies 180 degrees to completed tracks before exchanging them', () => {
    const source = createAnimation()
    const transformed = applyPatternFinalTransforms(source, {
      reversePlane: true,
      swapProps: true,
    })

    expect(transformed.props.map(({ anim }) => anim)).toEqual([
      [{ arc: 45, plane: 0, axis: 90 }, { turns: -180 }],
      [{ arc: 90, plane: 180 }, { turns: 180 }],
    ])
    expect(transformed.props.map(({ color }) => color)).toEqual([6, 1])
    expect(transformed.props.map(({ visible }) => visible)).toEqual([false, undefined])
    expect(transformed.props.map(({ motion }) => motion)).toEqual([
      [{ distance: 2, plane: 0 }],
      [{ distance: 3, plane: 180 }],
    ])
    expect(source.props.map(({ anim }) => anim)).toEqual([
      [{ arc: 90 }, { turns: 180 }],
      [{ arc: 45, plane: 180, axis: -90 }, { turns: -180 }],
    ])
  })

  it('shifts the stored arcs for pattern rotation without changing other frame values', () => {
    const source = createAnimation()
    const transformed = applyPatternInitialArcRotation(source, 90)
    const negative = applyPatternInitialArcRotation(source, -90)

    expect(transformed.props.map(({ anim }) => anim)).toEqual([
      [{ arc: 180 }, { turns: 180 }],
      [{ arc: 315, plane: 180, axis: -90 }, { turns: -180 }],
    ])
    expect(negative.props.map(({ anim }) => anim)).toEqual([
      [{ arc: 0 }, { turns: 180 }],
      [{ arc: 135, plane: 180, axis: -90 }, { turns: -180 }],
    ])
    expect(source.props[0]?.anim[0]?.arc).toBe(90)
  })

  it('wraps initial arcs without changing continuation arcs', () => {
    const source = createAnimation()
    source.props[0]!.anim[1]!.arc = 270
    source.props[1]!.anim[1]!.arc = 45
    source.props[1]!.anim[1]!.plane = 180

    const transformed = applyPatternInitialArcRotation(source, 90)

    expect(transformed.props[0]?.anim.map(({ arc }) => arc)).toEqual([180, 270])
    expect(transformed.props[1]?.anim.map(({ arc }) => arc)).toEqual([315, 45])
  })

  it('keeps arc orientation independent from the 180-degree plane transform', () => {
    const source = createAnimation()
    const oriented = applyPatternInitialArcRotation(source, 90)
    const transforms = { swapProps: false, reversePlane: true }
    const transformed = applyPatternFinalTransforms(oriented, transforms)

    expect(transformed.props.map(({ anim }) => anim)).toEqual([
      [{ arc: 180, plane: 180 }, { turns: 180 }],
      [{ arc: 315, plane: 0, axis: 90 }, { turns: -180 }],
    ])
  })
})
