import { Vector3 } from 'three'
import { describe, expect, it } from 'vitest'

import { applyPatternFinalTransforms } from '@/features/concepts/applyPatternFinalTransforms'
import { createQtrAnimation as createQtrAnimationForSelection } from '@/features/vtg/qtr/createQtrAnimation'
import type { QtrPatternSelection } from '@/features/vtg/types'
import { createVtgAnimation as createVtgAnimationForSelection } from '@/features/vtg/createVtgAnimation'
import { shiftVtgStartingBeat } from '@/features/vtg/math/shiftVtgStartingBeat'
import type { VtgCellReference, VtgPatternSelection } from '@/features/vtg/types'
import { rootCompile } from '@/math/animation/AnimFunc'
import { rootFinal } from '@/math/animation/PlayerFunc'
import type { RootData, RootDataFinal } from '@/types/AnimTypes'

const transposeSelection = <Selection extends VtgPatternSelection>(
  selection: Selection,
): Selection => {
  const [column, row] = selection.reference.split('-')
  return { ...selection, reference: `${row}-${column}` as VtgCellReference }
}

const createVtgAnimation = (current: RootDataFinal, selection: VtgPatternSelection) =>
  createVtgAnimationForSelection(current, transposeSelection(selection))

const createQtrAnimation = (current: RootDataFinal, selection: QtrPatternSelection) =>
  createQtrAnimationForSelection(current, transposeSelection(selection))

const createCurrentAnimation = () =>
  rootFinal({
    bpm: 90,
    prop: 0,
    color: 0,
    smooth: true,
    guides: true,
    paths: false,
    hands: true,
    arms: false,
    visible: true,
    nodes: true,
    anchors: true,
    props: [{ anim: [{ arc: 45 }] }],
    aspectx: 16,
    aspecty: 9,
    distance: 30,
    thick: 8,
  } satisfies RootData)

describe('createQtrAnimation', () => {
  it('adds 90 degrees to only the first prop first-frame arc for Qtr #1', () => {
    const selection = { reference: '1-6', speedRatio: '1:1' } as const
    const standard = createVtgAnimation(createCurrentAnimation(), selection)
    const quarter = createQtrAnimation(createCurrentAnimation(), { ...selection, quarters: 1 })

    expect(quarter?.props[0]?.anim[0]?.arc).toBe((standard?.props[0]?.anim[0]?.arc ?? 0) + 90)
    expect(quarter?.props[0]?.anim.slice(1)).toEqual(standard?.props[0]?.anim.slice(1))
    expect(quarter?.props[1]?.anim).toEqual(standard?.props[1]?.anim)
  })

  it('keeps the Qtr adjustment on its original track when Swap is enabled', () => {
    const selection = {
      reference: '2-1',
      speedRatio: '1:3',
      quarters: 1,
    } as const
    const quarter = createQtrAnimation(createCurrentAnimation(), selection)
    const swapped = createQtrAnimation(createCurrentAnimation(), { ...selection, swapProps: true })

    expect(swapped?.props[0]?.anim).toEqual(quarter?.props[1]?.anim)
    expect(swapped?.props[1]?.anim).toEqual(quarter?.props[0]?.anim)
  })

  it('uses 180 to select Qtr #2 and reverse its completed motion planes before Swap', () => {
    const selection = {
      reference: '5-1',
      speedRatio: '1:3',
      quarters: 1,
      beat: 3,
    } as const satisfies QtrPatternSelection
    const secondQuarter = createQtrAnimation(createCurrentAnimation(), {
      ...selection,
      quarters: 2,
    })
    const transformed = createQtrAnimation(createCurrentAnimation(), {
      ...selection,
      swapProps: true,
      reversePlane: true,
    })
    if (!secondQuarter) throw new Error('Expected a completed Qtr animation')

    expect(transformed).toEqual(
      applyPatternFinalTransforms(secondQuarter, { swapProps: true, reversePlane: true }),
    )
  })

  it('keeps QTR Box on its base orientation and only reverses the completed motion planes', () => {
    const selection = {
      reference: '5-1',
      speedRatio: '1:3',
      quarters: 1,
      shape: 'box',
    } as const satisfies QtrPatternSelection
    const base = createQtrAnimation(createCurrentAnimation(), selection)
    const reversed = createQtrAnimation(createCurrentAnimation(), {
      ...selection,
      reversePlane: true,
    })
    if (!base) throw new Error('Expected a completed Qtr animation')

    expect(reversed).toEqual(applyPatternFinalTransforms(base, { reversePlane: true }))
  })

  it.each(['1-1', '2-2', '5-5', '6-6'] as const)(
    'rotates every compiled Qtr #1 path by 90 degrees for Qtr #2 at %s',
    (reference) => {
      const selection = { reference, speedRatio: '1:3' } as const
      const firstQuarter = createQtrAnimation(createCurrentAnimation(), {
        ...selection,
        quarters: 1,
      })
      const secondQuarter = createQtrAnimation(createCurrentAnimation(), {
        ...selection,
        quarters: 2,
      })
      if (!firstQuarter || !secondQuarter) throw new Error('Expected both quarter modes')

      const firstCompiled = rootCompile(firstQuarter)
      const secondCompiled = rootCompile(secondQuarter)
      const frontAxis = new Vector3(0, 0, 1)

      for (const [propIndex, secondProp] of secondCompiled.props.entries()) {
        const firstProp = firstCompiled.props[propIndex]!
        for (const [frameIndex, secondFrame] of secondProp.anim.entries()) {
          const firstFrame = firstProp.anim[frameIndex]!
          for (const key of ['pos', 'rot', 'posx', 'rotx'] as const) {
            const expected = new Vector3()
              .fromArray(firstFrame[key])
              .applyAxisAngle(frontAxis, Math.PI / 2)
            secondFrame[key].forEach((coordinate, axis) =>
              expect(coordinate).toBeCloseTo(expected.getComponent(axis), 9),
            )
          }
        }
      }
    },
  )

  it('keeps paired Qtr #2 starting positions distinct', () => {
    const create = (reference: '1-1' | '2-2') =>
      createQtrAnimation(createCurrentAnimation(), {
        reference,
        speedRatio: '1:3',
        quarters: 2,
      })

    expect(create('1-1')?.props.map((prop) => prop.anim[0]?.arc)).toEqual([90, 0])
    expect(create('2-2')?.props.map((prop) => prop.anim[0]?.arc)).toEqual([90, 180])
  })

  it.each([1, 2, 3, 4] as const)('shifts the completed Qtr pattern to starting beat %s', (beat) => {
    const selection = {
      reference: '5-1',
      speedRatio: '1:3',
      quarters: 1,
      swapProps: true,
      reversePlane: true,
      shape: 'box',
    } as const satisfies QtrPatternSelection
    const completed = createQtrAnimation(createCurrentAnimation(), {
      ...selection,
      swapProps: false,
      reversePlane: false,
    })
    const shifted = createQtrAnimation(createCurrentAnimation(), { ...selection, beat })
    if (!completed) throw new Error('Expected a completed Qtr animation')

    const semanticShift = shiftVtgStartingBeat(completed, beat)
    expect(shifted).toEqual(
      semanticShift ? applyPatternFinalTransforms(semanticShift, selection) : undefined,
    )
  })

  it('ignores the reciprocal transition at 1:1 without subdividing playback', () => {
    const selection = {
      reference: '5-1',
      speedRatio: '1:1',
      quarters: 1,
    } as const satisfies QtrPatternSelection

    expect(
      createQtrAnimation(createCurrentAnimation(), { ...selection, transition: true }),
    ).toEqual(createQtrAnimation(createCurrentAnimation(), selection))
  })
})
