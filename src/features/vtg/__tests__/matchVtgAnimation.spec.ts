import { describe, expect, it } from 'vitest'

import { useSpiroAnimQS } from '@/composables/useSpiroAnimQS'
import { createDefaultVtgAnimation } from '@/features/vtg/createVtgAnimation'
import { findVtgPatternMatch, findVtgPatternMatches } from '@/features/vtg/matchVtgAnimation'
import type { VtgCellReference, VtgPatternSelection, VtgRuleNumber } from '@/features/vtg/types'
import { vtgSpeedRatios } from '@/features/vtg/types'
import { useBaseQS } from '@/services/query/createBaseQS'
import { VDEF } from '@/services/query/versions/SpiroAnimQSv1'

const ruleNumbers = [1, 2, 3, 4, 5, 6] as const satisfies readonly VtgRuleNumber[]
const booleanOptions = [false, true] as const
const spinToggleCells: ReadonlySet<VtgCellReference> = new Set(['5-6', '6-6', '5-5', '6-5'])

const createCellReference = (column: VtgRuleNumber, row: VtgRuleNumber): VtgCellReference =>
  `${column}-${row}`

const createAnimation = (selection: VtgPatternSelection) => {
  const animation = createDefaultVtgAnimation(selection)
  if (!animation) throw new Error(`Expected a VTG animation for ${selection.reference}`)
  return animation
}

describe('VTG animation matching', () => {
  it('recognizes every generated transform among its supported matches', () => {
    for (const column of ruleNumbers) {
      for (const row of ruleNumbers) {
        const reference = createCellReference(column, row)
        const antiOptions = spinToggleCells.has(reference) ? booleanOptions : ([false] as const)

        for (const speedRatio of vtgSpeedRatios) {
          for (const isAnti of antiOptions) {
            for (const swapProps of booleanOptions) {
              for (const reversePlane of booleanOptions) {
                const selection = {
                  reference,
                  speedRatio,
                  isAnti,
                  swapProps,
                  reversePlane,
                  bpm: 93,
                  scale: 1.2,
                } satisfies VtgPatternSelection
                const matches = findVtgPatternMatches(createAnimation(selection))

                expect(matches).toContainEqual(selection)
              }
            }
          }
        }
      }
    }
  })

  it('returns an observable Swap, Flip, ratio, Anti, BPM, and Scale combination', () => {
    const selection = {
      reference: '5-6',
      speedRatio: '1:3',
      isAnti: true,
      swapProps: true,
      reversePlane: true,
      bpm: 87,
      scale: 0.6,
    } as const satisfies VtgPatternSelection

    expect(findVtgPatternMatch(createAnimation(selection))).toEqual(selection)
  })

  it('recovers Box mode for a shape-transformable cell', () => {
    const selection = {
      reference: '5-1',
      speedRatio: '1:5',
      swapProps: true,
      reversePlane: true,
      shape: 'box',
      bpm: 87,
      scale: 1.1,
    } as const satisfies VtgPatternSelection

    expect(findVtgPatternMatches(createAnimation(selection))).toContainEqual({
      ...selection,
      isAnti: false,
    })
  })

  it('recovers the starting beat and Double while reporting the displayed BPM', () => {
    const selection = {
      reference: '5-1',
      speedRatio: '1:3',
      beat: 3,
      double: true,
      bpm: 83,
    } as const satisfies VtgPatternSelection

    expect(findVtgPatternMatches(createAnimation(selection))).toContainEqual({
      ...selection,
      isAnti: false,
      swapProps: false,
      reversePlane: false,
      scale: 0.8,
    })
  })

  it('recovers every authored starting beat for every VTG cell', () => {
    const mismatches: string[] = []

    for (const column of ruleNumbers) {
      for (const row of ruleNumbers) {
        for (const beat of [1, 2, 3, 4] as const) {
          const reference = createCellReference(column, row)
          const match = findVtgPatternMatch(createAnimation({ reference, speedRatio: '1:3', beat }))

          if (match?.reference !== reference || (match.beat ?? 1) !== beat) {
            mismatches.push(`${reference}/${beat} -> ${match?.reference}/${match?.beat ?? 1}`)
          }
        }
      }
    }

    expect(mismatches).toEqual([])
  })

  it('recovers every VTG cell and starting beat after query serialization', async () => {
    const codec = await useSpiroAnimQS(VDEF, useBaseQS(VDEF), 1)
    const mismatches: string[] = []

    for (const column of ruleNumbers) {
      for (const row of ruleNumbers) {
        for (const beat of [1, 2, 3, 4] as const) {
          const reference = createCellReference(column, row)
          const query = codec.encodeQS(
            createAnimation({ reference, speedRatio: '1:3', beat }),
            false,
          )
          const match = findVtgPatternMatch(await codec.decodeVer(query))

          if (match?.reference !== reference || (match.beat ?? 1) !== beat) {
            mismatches.push(`${reference}/${beat} -> ${match?.reference}/${match?.beat ?? 1}`)
          }
        }
      }
    }

    expect(mismatches).toEqual([])
  })

  it('recognizes a pattern regardless of non-pattern animation settings', () => {
    const animation = createAnimation({
      reference: '3-4',
      speedRatio: '1:5',
    })

    animation.bpm = 240
    animation.speed = 2
    animation.type = 1
    animation.turns = 45
    animation.depth = 3
    animation.prop = 1
    animation.color = 0
    animation.smooth = false
    animation.guides = true
    animation.paths = false
    animation.hands = true
    animation.visible = false
    animation.nodes = true
    animation.anchors = true
    animation.aspectx = 16
    animation.aspecty = 9
    animation.camera = [{ center: { distance: 3 }, orbit: { distance: 40 } }]
    animation.thick = 12

    for (const prop of animation.props) {
      prop.prop = 1
      prop.color = 0
      prop.guides = true
      prop.paths = false
      prop.hands = true
      prop.visible = false
      prop.nodes = true
      prop.anchors = true
      prop.thick = 12

      for (const frame of prop.anim) {
        frame.beats = 2
        frame.depth = 3
        frame.type = 1
        frame.adjust = 15
        frame.move = [1, 2, 3]
      }
    }

    animation.props[0]!.anim[0]!.scale = 25
    animation.props[1]!.anim[0]!.scale = 7

    expect(findVtgPatternMatch(animation)).toMatchObject({
      reference: '3-4',
      speedRatio: '1:5',
      bpm: 240,
      scale: 2.5,
    })
  })

  it('recognizes query-normalized data and equivalent -180 degree planes', () => {
    const animation = createAnimation({
      reference: '6-1',
      speedRatio: '1:1',
      scale: 0.8,
    })
    animation.camera[0]!.orbit!.distance = Math.trunc(animation.camera[0]!.orbit!.distance ?? 0)
    animation.props[0]!.anim[0]!.plane = -180
    animation.props[1]!.anim[0]!.plane = -180

    expect(findVtgPatternMatch(animation)).toMatchObject({
      reference: '6-1',
      speedRatio: '1:1',
      bpm: 60,
      scale: 0.8,
    })
  })

  it('prefers unchecked controls when a transform has no observable effect', () => {
    const animation = createAnimation({
      reference: '1-1',
      speedRatio: '1:1',
      swapProps: true,
    })

    expect(findVtgPatternMatch(animation)).toMatchObject({
      reference: '1-1',
      speedRatio: '1:1',
      swapProps: false,
      reversePlane: false,
    })
  })

  it('rejects an edited animation that is no longer a supported VTG pattern', () => {
    const animation = createAnimation({
      reference: '3-4',
      speedRatio: '1:5',
    })
    animation.props[0]!.anim[1]!.arc = 45

    expect(findVtgPatternMatch(animation)).toBeUndefined()
  })

  it('rejects an authored rotation-axis edit', () => {
    const animation = createAnimation({ reference: '3-2', speedRatio: '1:3', beat: 3 })
    animation.props[0]!.anim[0]!.axis = 45

    expect(findVtgPatternMatch(animation)).toBeUndefined()
  })
})
