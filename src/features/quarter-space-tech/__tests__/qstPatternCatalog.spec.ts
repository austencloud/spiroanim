import { describe, expect, it } from 'vitest'

import { createDefaultQstAnimation } from '@/features/quarter-space-tech/createQstAnimation'
import {
  getQstCollectionPatternCount,
  qstCollections,
  qstPatternDefinitions,
} from '@/features/quarter-space-tech/data/qstPatternCatalog'
import {
  analyzeQstPositionPairs,
  analyzeQstSequence,
} from '@/features/quarter-space-tech/math/analyzeQstAnimation'

describe('QST pattern catalog', () => {
  it('preserves the active library order, page boundaries, and all 228 patterns', () => {
    expect(qstCollections.map(({ key }) => key)).toEqual(['breaks', 'advanced', 'beyond'])
    expect(qstCollections.map(getQstCollectionPatternCount)).toEqual([56, 64, 108])
    expect(qstCollections.map(({ pages }) => pages.length)).toEqual([7, 8, 14])
    expect(qstCollections[0]?.pages.map(({ patterns }) => patterns.length)).toEqual(
      Array.from({ length: 7 }, () => 8),
    )
    expect(qstCollections[1]?.pages.every(({ patterns }) => patterns.length === 8)).toBe(true)
    expect(
      qstCollections[2]?.pages.slice(0, -1).every(({ patterns }) => patterns.length === 8),
    ).toBe(true)
    expect(qstCollections[2]?.pages.at(-1)?.patterns).toHaveLength(4)
    expect(qstPatternDefinitions).toHaveLength(228)
    expect(new Set(qstPatternDefinitions.map(({ reference }) => reference)).size).toBe(228)
  })

  it('compiles every stored animation into closed QST positions and configured lines', () => {
    for (const pattern of qstPatternDefinitions) {
      const animation = createDefaultQstAnimation({
        concept: 'qst',
        reference: pattern.reference,
      })
      expect({ reference: pattern.reference, defined: animation !== undefined }).toEqual({
        reference: pattern.reference,
        defined: true,
      })
      if (!animation) continue

      const pairs = analyzeQstPositionPairs(animation)
      expect({ reference: pattern.reference, last: pairs.at(-1) }).toEqual({
        reference: pattern.reference,
        last: pairs[0],
      })
      expect(
        analyzeQstSequence(animation, pattern.lineBeats).flatMap(({ tiles }) => tiles),
      ).toHaveLength(pairs.length - 1)
      expect({
        reference: pattern.reference,
        allTurnsAreAntiSpin: pattern.props.every(({ anim }) =>
          anim.slice(1).every(({ turns }) => turns === -360),
        ),
      }).toEqual({ reference: pattern.reference, allTurnsAreAntiSpin: true })
    }
  })

  it('splits Advanced and Beyond patterns into two four-beat lines', () => {
    for (const collection of qstCollections.slice(1)) {
      for (const page of collection.pages) {
        for (const pattern of page.patterns) {
          const animation = createDefaultQstAnimation({
            concept: 'qst',
            reference: pattern.reference,
          })
          if (!animation) throw new Error(`Missing ${pattern.reference}`)
          const lineBeats = 'lineBeats' in pattern ? pattern.lineBeats : undefined
          expect(lineBeats).toBe(4)
          expect(analyzeQstSequence(animation, lineBeats).map(({ tiles }) => tiles.length)).toEqual(
            [4, 4],
          )
        }
      }
    }
  })

  it('keeps every pattern closed after Flip and Swap transforms', () => {
    for (const pattern of qstPatternDefinitions) {
      for (const swapProps of [false, true]) {
        for (const reversePlane of [false, true]) {
          const animation = createDefaultQstAnimation({
            concept: 'qst',
            reference: pattern.reference,
            swapProps,
            reversePlane,
          })
          if (!animation) throw new Error(`Missing ${pattern.reference}`)

          const pairs = analyzeQstPositionPairs(animation)
          expect({
            reference: pattern.reference,
            swapProps,
            reversePlane,
            closed: pairs.at(-1),
          }).toEqual({
            reference: pattern.reference,
            swapProps,
            reversePlane,
            closed: pairs[0],
          })
        }
      }
    }
  })
})
