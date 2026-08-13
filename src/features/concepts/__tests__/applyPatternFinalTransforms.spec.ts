import { describe, expect, it } from 'vitest'

import { applyPatternFinalTransforms } from '@/features/concepts/applyPatternFinalTransforms'
import {
  createFinalTransformedVtgAnimationSignature,
  createVtgAnimationSignature,
} from '@/features/vtg/math/createVtgAnimationSignature'
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

  it('can derive final-transform signatures without cloning the animation', () => {
    const source = createAnimation()

    for (const swapProps of [false, true]) {
      for (const reversePlane of [false, true]) {
        const transforms = { swapProps, reversePlane }

        expect(createFinalTransformedVtgAnimationSignature(source, transforms)).toBe(
          createVtgAnimationSignature(applyPatternFinalTransforms(source, transforms)),
        )
      }
    }
  })
})
