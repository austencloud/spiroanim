import { describe, expect, it } from 'vitest'

import { useSpiroAnimQS } from '@/composables/useSpiroAnimQS'
import { createDefaultQtrAnimation } from '@/features/qtr/createQtrAnimation'
import { findQtrPatternMatch, findQtrPatternMatches } from '@/features/qtr/matchQtrAnimation'
import type { QtrPatternSelection } from '@/features/qtr/types'
import { useBaseQS } from '@/services/query/createBaseQS'
import { VDEF } from '@/services/query/versions/SpiroAnimQSv1'

const booleanOptions = [false, true] as const

const createQtrAnimation = (selection: QtrPatternSelection) => {
  const animation = createDefaultQtrAnimation(selection)
  if (!animation) throw new Error(`Expected a QTR animation for ${selection.reference}`)
  return animation
}

describe('Qtr animation matching', () => {
  it('recognizes the Qtr transform', () => {
    const selection = {
      reference: '3-4',
      speedRatio: '1:5',
      quarters: 1,
    } as const satisfies QtrPatternSelection

    expect(findQtrPatternMatch(createQtrAnimation(selection))).toEqual({
      ...selection,
      isAnti: false,
      swapProps: false,
      reversePlane: false,
      bpm: 60,
      scale: 0.8,
    })
  })

  it('recognizes both Qtr modes with and without Swap', () => {
    for (const quarters of [1, 2] as const) {
      for (const swapProps of booleanOptions) {
        const selection = {
          reference: '2-1',
          speedRatio: '1:3',
          swapProps,
          quarters,
        } as const satisfies QtrPatternSelection

        expect(findQtrPatternMatches(createQtrAnimation(selection))).toContainEqual({
          ...selection,
          isAnti: false,
          reversePlane: false,
          bpm: 60,
          scale: 0.8,
        })
      }
    }
  })

  it('recovers Qtr controls after a complete shared-URL round trip', async () => {
    const selection = {
      reference: '5-6',
      speedRatio: '1:5',
      isAnti: true,
      swapProps: true,
      reversePlane: true,
      quarters: 2,
      bpm: 101,
      scale: 1.2,
    } as const satisfies QtrPatternSelection
    const codec = await useSpiroAnimQS(VDEF, useBaseQS(VDEF), 1)
    const query = codec.encodeQS(createQtrAnimation(selection), false)
    const decoded = await codec.decodeVer(query)

    expect(findQtrPatternMatch(decoded)).toEqual(selection)
  })
})
