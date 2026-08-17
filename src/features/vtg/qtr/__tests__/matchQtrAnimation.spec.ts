import { describe, expect, it } from 'vitest'

import { useSpiroAnimQS } from '@/composables/useSpiroAnimQS'
import { createDefaultQtrAnimation } from '@/features/vtg/qtr/createQtrAnimation'
import { findQtrPatternMatch, findQtrPatternMatches } from '@/features/vtg/qtr/matchQtrAnimation'
import type { QtrPatternMatch, QtrPatternSelection } from '@/features/vtg/types'
import { getVtgPatternOrientations, vtgTransitionBeats } from '@/features/vtg/types'
import { vtgFixedShapeCells } from '@/features/vtg/data/vtgPatternCatalog'
import { useBaseQS } from '@/services/query/createBaseQS'
import { VDEF } from '@/services/query/versions/SpiroAnimQSv1'
import { getUniqueVtgPatternOrientations } from '@/features/vtg/math/getUniqueVtgPatternOrientations'

const booleanOptions = [false, true] as const

const createQtrAnimation = (selection: QtrPatternSelection) => {
  const animation = createDefaultQtrAnimation(selection)
  if (!animation) throw new Error(`Expected a QTR animation for ${selection.reference}`)
  return animation
}

const canonicalRotationMatches = (matches: readonly QtrPatternMatch[]) => {
  const unrotated = matches.filter((match) => (match.orientation ?? 0) === 0)
  return unrotated.length > 0 ? unrotated : matches
}

describe('Qtr animation matching', () => {
  it.each(['1:2', '1:4'] as const)(
    'recognizes every nonzero initial arc rotation after a beat shift at %s',
    (speedRatio) => {
      for (const orientation of getUniqueVtgPatternOrientations({
        reference: '5-1',
        speedRatio,
        quarters: 1,
      }).filter(
        (option) => option !== 0,
      )) {
        const selection = {
          reference: '5-1',
          speedRatio,
          quarters: 1,
          orientation,
          beat: 3,
        } as const satisfies QtrPatternSelection

        expect(findQtrPatternMatches(createQtrAnimation(selection))).toContainEqual({
          ...selection,
          isAnti: false,
          swapProps: false,
          reversePlane: false,
          bpm: 40,
          scale: 0.8,
        })
      }
    },
  )

  it.each(['1:1', '1:3', '1:5'] as const)(
    'recognizes QTR animations using every added rotation at %s',
    (speedRatio) => {
      for (const orientation of getVtgPatternOrientations(speedRatio).filter(
        (option) => option !== 0,
      )) {
        const animation = createQtrAnimation({
          reference: '5-1',
          speedRatio,
          quarters: 1,
          orientation,
          beat: 3,
        })

        expect(findQtrPatternMatch(animation)).toMatchObject({ speedRatio, quarters: 1 })
      }
    },
  )

  it.each(vtgTransitionBeats)('detects the %s-beat reciprocal transition', (transitionBeats) => {
    const selection = {
      reference: '5-1',
      speedRatio: '1:3',
      quarters: 1,
      transition: true,
      transitionBeats,
    } as const satisfies QtrPatternSelection

    expect(findQtrPatternMatch(createQtrAnimation(selection))).toMatchObject({
      ...selection,
    })
  })

  it('detects when the reciprocal transition starts with the second prop after Swap', () => {
    const selection = {
      reference: '5-1',
      speedRatio: '1:3',
      quarters: 1,
      swapProps: true,
      transition: true,
      transitionQuad: true,
      transitionSecond: true,
    } as const satisfies QtrPatternSelection

    expect(findQtrPatternMatch(createQtrAnimation(selection))).toMatchObject({
      ...selection,
    })
  })

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
      bpm: 40,
      scale: 0.8,
    })
  })

  it.each(['1:2', '1:4'] as const)(
    'recovers Tilted for an otherwise fixed-shape Qtr cell at %s',
    (speedRatio) => {
      const selection = {
        reference: '1-1',
        speedRatio,
        quarters: 1,
        shape: 'box',
      } as const satisfies QtrPatternSelection

      expect(findQtrPatternMatches(createQtrAnimation(selection))).toContainEqual({
        ...selection,
        isAnti: false,
        swapProps: false,
        reversePlane: false,
        bpm: 40,
        scale: 0.8,
      })
    },
  )

  it('recognizes both Qtr orientations across the final Swap transform', () => {
    for (const swapProps of booleanOptions) {
      for (const reversePlane of booleanOptions) {
        const selection = {
          reference: '2-1',
          speedRatio: '1:3',
          swapProps,
          reversePlane,
          quarters: 1,
        } as const satisfies QtrPatternSelection

        expect(findQtrPatternMatches(createQtrAnimation(selection))).toContainEqual({
          ...selection,
          isAnti: false,
          bpm: 40,
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
      quarters: 1,
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
      quarters: 1,
      reversePlane: true,
      shape: 'box',
    } as const satisfies QtrPatternSelection

    expect(findQtrPatternMatches(createQtrAnimation(selection))).toContainEqual({
      ...selection,
      isAnti: false,
      swapProps: false,
      bpm: 40,
      scale: 0.8,
    })
  })

  it('recovers the VTG transition by matching its shared doubled base cycle', () => {
    const selection = {
      reference: '1-1',
      speedRatio: '1:3',
      quarters: 1,
      beat: 2,
      transition: true,
      bpm: 79,
    } as const satisfies QtrPatternSelection

    expect(
      findQtrPatternMatches(createQtrAnimation({ ...selection, transitionBeats: 5 })),
    ).toContainEqual({
      ...selection,
      transitionBeats: 5,
      isAnti: false,
      swapProps: false,
      reversePlane: false,
      bpm: 79,
      scale: 0.8,
    })
  })

  it('tries every Trans beat before changing the current transforms', () => {
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
      const animation = createQtrAnimation({ ...selection, transitionBeats: 5 })
      const matches = canonicalRotationMatches(findQtrPatternMatches(animation))
      const preferenceDifference = (match: (typeof matches)[number]) =>
        Number(match.swapProps !== preferences.swapProps) +
        Number(match.reversePlane !== preferences.reversePlane)
      const lowestPreferenceDifference = Math.min(...matches.map(preferenceDifference))
      const preferredMatches = matches.filter(
        (match) => preferenceDifference(match) === lowestPreferenceDifference,
      )
      const lowestPreferredBeat = Math.min(...preferredMatches.map((match) => match.beat ?? 1))
      const match = findQtrPatternMatch(animation, preferences)

      expect(match ? preferenceDifference(match) : undefined).toBe(lowestPreferenceDifference)
      expect(match?.beat ?? 1).toBe(lowestPreferredBeat)
    }
  })

  it('keeps the fixed-shape cells unchanged when Qtr uses Box mode', () => {
    for (const reference of vtgFixedShapeCells) {
      const selection = {
        reference,
        speedRatio: '1:3',
        quarters: 1,
        reversePlane: true,
      } as const satisfies QtrPatternSelection

      expect(createQtrAnimation({ ...selection, shape: 'box' })).toEqual(
        createQtrAnimation(selection),
      )
    }
  })
})
