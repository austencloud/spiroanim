import { describe, expect, it } from 'vitest'

import { createDefaultQstAnimation } from '@/features/quarter-space-tech/createQstAnimation'
import { qstPatternDefinitions } from '@/features/quarter-space-tech/data/qstPatternCatalog'
import {
  findQstPatternMatch,
  findQstPatternMatches,
  matchesQstSelection,
} from '@/features/quarter-space-tech/matchQstAnimation'

describe('matchQstAnimation', () => {
  it('recognizes every catalog pattern and transform from compiled geometry', () => {
    for (const definition of qstPatternDefinitions) {
      for (const swapProps of [false, true]) {
        for (const reversePlane of [false, true]) {
          const selection = {
            concept: 'qst',
            reference: definition.reference,
            swapProps,
            reversePlane,
            bpm: 91,
            scale: 1.1,
          } as const
          const animation = createDefaultQstAnimation(selection)
          if (!animation) throw new Error(`Missing ${definition.reference}`)

          expect(findQstPatternMatches(animation)).toContainEqual({
            reference: definition.reference,
            swapProps,
            reversePlane,
            bpm: 91,
            scale: 1.1,
          })
          expect(matchesQstSelection(animation, selection)).toBe(true)
        }
      }
    }
  })

  it('uses the current transform controls to resolve equivalent geometry', () => {
    const animation = createDefaultQstAnimation({
      concept: 'qst',
      reference: 'advanced-1',
      swapProps: true,
      reversePlane: true,
    })
    if (!animation) throw new Error('Missing advanced-1')

    expect(findQstPatternMatch(animation, { swapProps: true, reversePlane: true })).toMatchObject({
      swapProps: true,
      reversePlane: true,
    })
  })

  it('ignores player-only rendering settings when matching geometry', () => {
    const animation = createDefaultQstAnimation({
      concept: 'qst',
      reference: 'beyond-100',
      thick: 13,
      paths: false,
      hands: true,
      arms: false,
    })

    expect(animation).toBeDefined()
    expect(animation && findQstPatternMatches(animation)).toContainEqual(
      expect.objectContaining({ reference: 'beyond-100' }),
    )
  })

  it('rejects non-QST frame geometry', () => {
    const animation = createDefaultQstAnimation({ concept: 'qst', reference: 'breaks-1' })
    if (!animation) throw new Error('Missing breaks-1')

    animation.props[0]!.anim[2]!.arc = 45
    expect(findQstPatternMatches(animation)).toEqual([])
  })
})
