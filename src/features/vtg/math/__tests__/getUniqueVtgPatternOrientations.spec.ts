import { describe, expect, it } from 'vitest'

import { getUniqueVtgPatternOrientations } from '@/features/vtg/math/getUniqueVtgPatternOrientations'
import { getVtgPatternOrientations } from '@/features/vtg/types'

describe('getUniqueVtgPatternOrientations', () => {
  it('removes a rotation redundant across every Swap and 180 combination', () => {
    expect(getUniqueVtgPatternOrientations({ reference: '2-1', speedRatio: '1:3' })).toEqual([0])
  })

  it('collapses rotations that are alternate starting beats of the same pattern family', () => {
    for (const beat of [1, 2, 3, 4] as const) {
      expect(
        getUniqueVtgPatternOrientations({ reference: '1-1', speedRatio: '1:3', beat }),
      ).toEqual([0])
    }
  })

  it('returns only zero when every rotated animation has an unrotated representation', () => {
    expect(
      getUniqueVtgPatternOrientations({
        reference: '1-2',
        speedRatio: '1:1',
        beat: 2,
      }),
    ).toEqual([0])
  })

  it.each([
    ['1:1', [0, 90, 180]],
    ['1:3', [0, 90]],
    ['1:5', [0, 90, 180]],
  ] as const)(
    'uses positive 90 as the canonical odd-ratio quarter turn at %s',
    (speedRatio, expected) => {
      expect(getVtgPatternOrientations(speedRatio)).toEqual(expected)
    },
  )

  it('retains the canonical positive quarter turn when it is unique', () => {
    expect(
      getUniqueVtgPatternOrientations({
        reference: '5-2',
        speedRatio: '1:3',
        shape: 'box',
      }),
    ).toEqual([0, 90])
  })

  it('retains rotations whose complete beat families remain distinct', () => {
    expect(getUniqueVtgPatternOrientations({ reference: '5-1', speedRatio: '1:2' })).toEqual([
      0, 90,
    ])
  })

  it('does not change availability with Beat, Swap, or 180', () => {
    const selection = {
      reference: '3-2',
      speedRatio: '1:3',
      shape: 'box',
    } as const
    const expected = getUniqueVtgPatternOrientations(selection)

    expect(getUniqueVtgPatternOrientations({ ...selection, swapProps: true })).toEqual(expected)
    expect(getUniqueVtgPatternOrientations({ ...selection, reversePlane: true })).toEqual(expected)
    expect(
      getUniqueVtgPatternOrientations({
        ...selection,
        beat: 4,
        swapProps: true,
        reversePlane: true,
      }),
    ).toEqual(expected)
  })
})
