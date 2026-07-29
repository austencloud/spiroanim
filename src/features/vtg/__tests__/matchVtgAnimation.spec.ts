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

  it('returns an observable Swap, Reverse, ratio, Anti, BPM, and Scale combination', () => {
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
    animation.distance = 999
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
        frame.axis = 45
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
      reference: '1-6',
      speedRatio: '1:1',
      scale: 0.8,
    })
    animation.distance = Math.trunc(animation.distance)
    animation.props[0]!.anim[0]!.plane = -180
    animation.props[1]!.anim[0]!.plane = -180

    expect(findVtgPatternMatch(animation)).toMatchObject({
      reference: '1-6',
      speedRatio: '1:1',
      bpm: 120,
      scale: 0.8,
    })
  })

  it('recovers VTG controls after a complete shared-URL round trip', async () => {
    const selection = {
      reference: '5-6',
      speedRatio: '1:5',
      isAnti: true,
      swapProps: true,
      reversePlane: true,
      bpm: 101,
      scale: 1.2,
    } as const satisfies VtgPatternSelection
    const codec = await useSpiroAnimQS(VDEF, useBaseQS(VDEF), 1)
    const query = codec.encodeQS(createAnimation(selection), false)
    const decoded = await codec.decodeVer(query)

    expect(findVtgPatternMatch(decoded)).toEqual(selection)
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
})
