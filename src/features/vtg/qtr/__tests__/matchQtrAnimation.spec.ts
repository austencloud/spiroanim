import { describe, expect, it } from 'vitest'

import { useSpiroAnimQS } from '@/composables/useSpiroAnimQS'
import { createDefaultQtrAnimation } from '@/features/vtg/qtr/createQtrAnimation'
import { findQtrPatternMatch, findQtrPatternMatches } from '@/features/vtg/qtr/matchQtrAnimation'
import type { QtrPatternSelection } from '@/features/vtg/types'
import { vtgFixedShapeCells } from '@/features/vtg/data/vtgPatternCatalog'
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

  it('recovers Box mode after the Qtr arc transform', () => {
    const selection = {
      reference: '5-1',
      speedRatio: '1:3',
      quarters: 2,
      shape: 'box',
    } as const satisfies QtrPatternSelection

    expect(findQtrPatternMatches(createQtrAnimation(selection))).toContainEqual({
      ...selection,
      isAnti: false,
      swapProps: false,
      reversePlane: false,
      bpm: 60,
      scale: 0.8,
    })
  })

  it('recovers Shift and Double after the Qtr transform', () => {
    const selection = {
      reference: '5-1',
      speedRatio: '1:3',
      quarters: 2,
      beat: 4,
      double: true,
      bpm: 79,
    } as const satisfies QtrPatternSelection

    expect(findQtrPatternMatches(createQtrAnimation(selection))).toContainEqual({
      ...selection,
      isAnti: false,
      swapProps: false,
      reversePlane: false,
      scale: 0.8,
    })
  })

  it('recovers the VTG transition by matching only its doubled base cycle', () => {
    const selection = {
      reference: '1-1',
      speedRatio: '1:3',
      quarters: 1,
      beat: 2,
      transition: true,
      bpm: 79,
    } as const satisfies QtrPatternSelection

    expect(findQtrPatternMatches(createQtrAnimation(selection))).toContainEqual({
      ...selection,
      double: true,
      isAnti: false,
      swapProps: false,
      reversePlane: false,
      bpm: 79,
      scale: 0.8,
    })
  })

  it('prioritizes lower Trans beats before the current transforms', () => {
    for (const selection of [
      {
        reference: '2-2',
        speedRatio: '1:3',
        quarters: 1,
        beat: 3,
        swapProps: false,
        reversePlane: false,
        transition: true,
      },
      {
        reference: '2-2',
        speedRatio: '1:3',
        quarters: 1,
        beat: 4,
        swapProps: true,
        reversePlane: false,
        transition: true,
      },
    ] as const satisfies readonly QtrPatternSelection[]) {
      const preferences = {
        quarters: selection.quarters,
        swapProps: selection.swapProps,
        reversePlane: selection.reversePlane,
      }
      const matches = findQtrPatternMatches(createQtrAnimation(selection))
      const lowestBeat = Math.min(...matches.map((match) => match.beat ?? 1))
      const lowestBeatMatches = matches.filter((match) => (match.beat ?? 1) === lowestBeat)
      const preferenceDifference = (match: (typeof matches)[number]) =>
        Number(match.quarters !== preferences.quarters) +
        Number(match.swapProps !== preferences.swapProps) +
        Number(match.reversePlane !== preferences.reversePlane)
      const lowestPreferenceDifference = Math.min(...lowestBeatMatches.map(preferenceDifference))
      const match = findQtrPatternMatch(createQtrAnimation(selection), preferences)

      expect(match?.beat ?? 1).toBe(lowestBeat)
      expect(match ? preferenceDifference(match) : undefined).toBe(lowestPreferenceDifference)
    }
  })

  it('keeps the fixed-shape cells unchanged when Qtr uses Box mode', () => {
    for (const reference of vtgFixedShapeCells) {
      const selection = {
        reference,
        speedRatio: '1:3',
        quarters: 2,
      } as const satisfies QtrPatternSelection

      expect(createQtrAnimation({ ...selection, shape: 'box' })).toEqual(
        createQtrAnimation(selection),
      )
    }
  })
})
