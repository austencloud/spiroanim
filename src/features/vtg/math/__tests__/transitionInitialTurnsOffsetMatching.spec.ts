import { describe, expect, it } from 'vitest'

import { useSpiroAnimQS } from '@/composables/useSpiroAnimQS'
import { createDefaultVtgAnimation } from '@/features/vtg/createVtgAnimation'
import { findVtgPatternMatch, findVtgPatternMatches } from '@/features/vtg/matchVtgAnimation'
import { createVtgAnimationSignature } from '@/features/vtg/math/createVtgAnimationSignature'
import {
  createVtgTransitionQuickSlotAnimationCandidates,
  resolveVtgTransitionQuickSlotAnimations,
} from '@/features/vtg/math/createVtgTransitionQuickSlotAnimations'
import { createDefaultQtrAnimation } from '@/features/vtg/qtr/createQtrAnimation'
import { findQtrPatternMatch, findQtrPatternMatches } from '@/features/vtg/qtr/matchQtrAnimation'
import type {
  QtrPatternSelection,
  VtgCellReference,
  VtgPatternSelection,
  VtgRuleNumber,
} from '@/features/vtg/types'
import { getVtgPatternOrientations } from '@/features/vtg/types'
import { rootCompile } from '@/math/animation/AnimFunc'
import {
  doubleAnimationPlayback,
  doublePlaybackMultiplier,
} from '@/math/animation/subdivideAnimationPlayback'
import { shiftVtgStartingFrames } from '@/features/vtg/math/shiftVtgStartingBeat'
import { useBaseQS } from '@/services/query/createBaseQS'
import { loadSpiroAnimQSVersion } from '@/services/query/versions'
import type { RootDataFinal } from '@/types/AnimTypes'

const sourceQuery =
  'r=Ew08Yk11Y&p0=Q__.mBE_____q.5JEsR......._ZEvF................_ZEsR........&m0=_1_mxqv__&p1=N__.mBE_____q.5JEsR..............._ZEvF................_ZEsR&c=_f_bhq&v=6'
const q2ExactQuery =
  'r=Ew08Yk11Y&p0=Q__.mBE_____q.5JEsR.......&m0=_1_mxqv__&p1=N__.mBE_____q.5JEsR.......&c=_f_bhq&v=6'
const q3Query =
  'r=Ew08Yk11Y&p0=Q__.5L_vF___q._U0.......&m0=_1_mxqv__&p1=N__.gU0ufHj_q.5E0sRHj.......&c=_f_bhq&v=6'
const q5Query =
  'r=Ew08Yk11Y&p0=Q__.gU0ufHj_q.5E0sRHj.......&m0=_1_mxqv__&p1=N__.5L_vF___q._U0.......&c=_f_bhq&v=6'
const rules = [1, 2, 3, 4, 5, 6] as const satisfies readonly VtgRuleNumber[]
const oddRatios = ['1:1', '1:3', '1:5'] as const
const preferences = { swapProps: false, reversePlane: false } as const

const queryFrom = (query: string) => Object.fromEntries(new URLSearchParams(query))

const expectCompiledGeometryToMatch = (actual: RootDataFinal, expected: RootDataFinal) => {
  const actualProps = rootCompile(actual).props
  const expectedProps = rootCompile(expected).props
  expect(actualProps).toHaveLength(expectedProps.length)

  for (const [propIndex, actualProp] of actualProps.entries()) {
    const expectedProp = expectedProps[propIndex]
    expect(expectedProp).toBeDefined()
    if (!expectedProp) throw new Error(`Expected compiled prop ${propIndex}`)
    expect(actualProp.anim).toHaveLength(expectedProp.anim.length)
    for (const [frameIndex, actualFrame] of actualProp.anim.entries()) {
      const expectedFrame = expectedProp.anim[frameIndex]
      expect(expectedFrame).toBeDefined()
      if (!expectedFrame) throw new Error(`Expected compiled frame ${propIndex}:${frameIndex}`)
      for (const key of ['pos', 'rot', 'adju'] as const) {
        actualFrame[key].forEach((coordinate, coordinateIndex) => {
          expect(coordinate).toBeCloseTo(expectedFrame[key][coordinateIndex] ?? Infinity, 12)
        })
      }
    }
  }
}

const expectExactDoubledVtgMatch = (animation: RootDataFinal, label: string) => {
  const match = findVtgPatternMatch(animation, preferences)
  expect(match?.initialTurnsOffset).toBeUndefined()
  if (!match) throw new Error(`Expected ${label} to match`)
  const regenerated = createDefaultVtgAnimation(match)
  const doubledRegenerated = regenerated ? doubleAnimationPlayback(regenerated) : undefined
  expect(createVtgAnimationSignature(doubledRegenerated!)).toBe(
    createVtgAnimationSignature(animation),
  )
}

const expectExactDoubledQtrMatch = (animation: RootDataFinal, label: string) => {
  const match = findQtrPatternMatch(animation, { ...preferences, quarters: 1 })
  expect(match?.initialTurnsOffset).toBeUndefined()
  if (!match) throw new Error(`Expected ${label} to match`)
  const regenerated = createDefaultQtrAnimation(match)
  const doubledRegenerated = regenerated ? doubleAnimationPlayback(regenerated) : undefined
  expect(createVtgAnimationSignature(doubledRegenerated!)).toBe(
    createVtgAnimationSignature(animation),
  )
}

describe('45 Trans initial-turn matching', () => {
  it.each([false, true] as const)(
    'transports a detected initial-turn state when changing VTG Beat (QTR %s)',
    (isQtr) => {
      const selection = {
        reference: '6-3',
        speedRatio: '1:2',
        shape: 'box',
        beat: 2,
        reversePlane: true,
        orientation: -90,
        initialTurnsOffset: -45,
        ...(isQtr ? { quarters: 1 as const } : undefined),
      } as const satisfies VtgPatternSelection | QtrPatternSelection
      const create = (candidate: VtgPatternSelection | QtrPatternSelection) =>
        'quarters' in candidate
          ? createDefaultQtrAnimation(candidate)
          : createDefaultVtgAnimation(candidate)
      const original = create(selection)
      if (!original) throw new Error('Expected a transition-derived pattern')

      for (const beat of [1, 2, 3, 4] as const) {
        const actual = create({ ...selection, beat, initialTurnsOffsetBeat: 2 })
        const relativeBeatShifts = (beat - 2 + 4) % 4
        const expected = shiftVtgStartingFrames(
          original,
          relativeBeatShifts * doublePlaybackMultiplier,
        )
        if (!actual || !expected) throw new Error(`Expected Beat ${beat} animations`)

        expect(createVtgAnimationSignature(actual)).toBe(createVtgAnimationSignature(expected))
        expect(actual.bpm).toBe(expected.bpm)
        expectCompiledGeometryToMatch(actual, expected)
      }
    },
  )

  it('resolves the supplied Q3 and Q5 and regenerates their exact doubled result', async () => {
    const version = await loadSpiroAnimQSVersion(6)
    const codec = await useSpiroAnimQS(
      version.VDEF,
      useBaseQS(version.VDEF, { charset: version.CHARSET }),
      6,
    )

    for (const [query, expectedOffset] of [
      [q3Query, -45],
      [q5Query, 45],
    ] as const) {
      const animation = codec.decodeQS(queryFrom(query))
      const match = findVtgPatternMatch(animation, preferences)
      expect(match).toMatchObject({
        speedRatio: '1:2',
        shape: 'box',
        initialTurnsOffset: expectedOffset,
      })
      if (!match) throw new Error('Expected a transition-derived VTG match')

      const regenerated = createDefaultVtgAnimation(match)
      expect(regenerated?.props[0]?.anim).toHaveLength(9)
      expect(createVtgAnimationSignature(regenerated!)).toBe(createVtgAnimationSignature(animation))
      expect(regenerated?.bpm).toBe(animation.bpm)
      expectCompiledGeometryToMatch(regenerated!, animation)
    }

    const source = codec.decodeQS(queryFrom(sourceQuery))
    const groups = createVtgTransitionQuickSlotAnimationCandidates(source)
    if (!groups) throw new Error('Expected Quick Slot candidates')
    const resolution = await resolveVtgTransitionQuickSlotAnimations(
      groups,
      (animation, filter) => {
        const matches = [
          ...findVtgPatternMatches(animation, filter),
          ...findQtrPatternMatches(animation, filter),
        ]
        if (matches.some((match) => match.initialTurnsOffset === undefined)) return 'exact'
        return matches.length > 0 ? 'transitionTurns' : false
      },
    )

    expect(resolution.status).toBe('matched')
    if (resolution.status !== 'matched') throw new Error('Expected every Quick Slot to resolve')
    expect(codec.encodeQS(resolution.animations[1]!, false)).toEqual(queryFrom(q2ExactQuery))
    expect(findVtgPatternMatch(resolution.animations[1]!)).toMatchObject({
      reference: '1-1',
      speedRatio: '1:2',
      orientation: -90,
    })
    expect(findVtgPatternMatch(resolution.animations[1]!)?.initialTurnsOffset).toBeUndefined()
    expect(codec.encodeQS(resolution.animations[2]!, false)).toEqual(queryFrom(q3Query))
    expect(codec.encodeQS(resolution.animations[4]!, false)).toEqual(queryFrom(q5Query))
  })

  it('keeps exact doubled odd-ratio VTG and QTR patterns ahead of turn-offset variants', () => {
    let checkedPatterns = 0
    for (const speedRatio of oddRatios) {
      for (const row of rules) {
        for (const column of rules) {
          const reference: VtgCellReference = `${column}-${row}`
          for (const shape of ['diamond', 'box'] as const) {
            for (const beat of [1, 2, 3, 4] as const) {
              for (const orientation of getVtgPatternOrientations(speedRatio)) {
                const baseSelection: VtgPatternSelection = {
                  reference,
                  speedRatio,
                  shape,
                  beat,
                  orientation,
                }
                const vtg = createDefaultVtgAnimation(baseSelection)
                const doubledVtg = vtg ? doubleAnimationPlayback(vtg) : undefined
                if (doubledVtg) {
                  expectExactDoubledVtgMatch(doubledVtg, `VTG ${speedRatio} ${reference}`)
                  checkedPatterns += 1
                }

                const qtrSelection: QtrPatternSelection = {
                  ...baseSelection,
                  quarters: 1,
                }
                const qtr = createDefaultQtrAnimation(qtrSelection)
                const doubledQtr = qtr ? doubleAnimationPlayback(qtr) : undefined
                if (!doubledQtr) continue
                expectExactDoubledQtrMatch(doubledQtr, `QTR ${speedRatio} ${reference}`)
                checkedPatterns += 1
              }
            }
          }
        }
      }
    }
    expect(checkedPatterns).toBeGreaterThan(0)
  }, 30_000)
})
