import { Vector3 } from 'three'
import { describe, expect, it } from 'vitest'

import { createDefaultQtrAnimation } from '@/features/qtr/createQtrAnimation'
import { applyQtrStartingPosition } from '@/features/qtr/math/applyQtrStartingPosition'
import { qtrBeats } from '@/features/qtr/types'
import type { QtrPatternSelection } from '@/features/qtr/types'
import { createDefaultVtgAnimation } from '@/features/vtg/createVtgAnimation'
import type { VtgCellReference } from '@/features/vtg/types'
import { rootCompile } from '@/math/animation/AnimFunc'
import type { RootDataFinal } from '@/types/AnimTypes'

const enabledReferences = [
  '2-1',
  '4-1',
  '6-1',
  '1-2',
  '3-2',
  '5-2',
  '2-3',
  '4-3',
  '6-3',
  '1-4',
  '3-4',
  '5-4',
  '2-5',
  '4-5',
  '6-5',
  '1-6',
  '3-6',
  '5-6',
] as const satisfies readonly VtgCellReference[]

const createQtr = (selection: QtrPatternSelection): RootDataFinal => {
  const animation = createDefaultQtrAnimation(selection)
  if (!animation) throw new Error(`Expected QTR animation for ${selection.reference}`)
  return animation
}

const createVtg = (selection: QtrPatternSelection): RootDataFinal => {
  const { beat: _beat, quarters: _quarters, ...vtgSelection } = selection
  const animation = createDefaultVtgAnimation(vtgSelection)
  if (!animation) throw new Error(`Expected VTG animation for ${selection.reference}`)
  return animation
}

describe('createQtrAnimation', () => {
  it('sources QTR Diamond from VTG Diamond and QTR Box from VTG Box', () => {
    const baseSelection = {
      reference: '5-1',
      speedRatio: '1:3',
      quarters: 1,
      beat: 1,
    } as const satisfies QtrPatternSelection
    const qtrDiamond = createQtr(baseSelection)
    const qtrBox = createQtr({ ...baseSelection, shape: 'box' })
    const vtgBox = createDefaultVtgAnimation({ ...baseSelection, shape: 'box' })
    const vtgDiamond = createDefaultVtgAnimation({ ...baseSelection, shape: 'diamond' })
    if (!vtgBox || !vtgDiamond) throw new Error('Expected both VTG shape sources')

    expect(qtrDiamond.props.map((prop) => prop.anim.slice(1))).toEqual(
      vtgDiamond.props.map((prop) => prop.anim.slice(1)),
    )
    expect(qtrBox.props.map((prop) => prop.anim.slice(1))).toEqual(
      vtgBox.props.map((prop) => prop.anim.slice(1)),
    )
    expect(qtrDiamond.props.map((prop) => prop.anim[0]?.arc)).not.toEqual(
      qtrBox.props.map((prop) => prop.anim[0]?.arc),
    )
  })

  it('sources fixed-shape cells from their own intrinsic VTG definitions', () => {
    for (const [diamondReference, boxReference] of [
      ['1-1', '3-3'],
      ['1-2', '3-4'],
      ['2-1', '4-3'],
      ['2-2', '4-4'],
    ] as const) {
      const qtrDiamondCell = createQtr({
        reference: diamondReference,
        speedRatio: '1:3',
        quarters: 1,
        beat: 1,
      })
      const qtrBoxCell = createQtr({
        reference: boxReference,
        speedRatio: '1:3',
        quarters: 1,
        beat: 1,
      })
      const vtgBox = createDefaultVtgAnimation({
        reference: boxReference,
        speedRatio: '1:3',
      })
      const vtgDiamond = createDefaultVtgAnimation({
        reference: diamondReference,
        speedRatio: '1:3',
      })
      if (!vtgBox || !vtgDiamond) throw new Error('Expected both fixed-shape VTG sources')

      expect(qtrDiamondCell).toEqual(applyQtrStartingPosition(vtgDiamond, 1))
      expect(qtrDiamondCell).not.toEqual(applyQtrStartingPosition(vtgBox, 1))
      expect(qtrBoxCell).toEqual(applyQtrStartingPosition(vtgBox, 1))
      expect(qtrBoxCell).not.toEqual(applyQtrStartingPosition(vtgDiamond, 1))
    }
  })

  it.each([
    ['1-2', '3-4'],
    ['2-1', '4-3'],
  ] as const)(
    'keeps fixed counterpart cells %s and %s distinct',
    (firstReference, secondReference) => {
      const first = createQtr({
        reference: firstReference,
        speedRatio: '1:3',
        quarters: 1,
        beat: 1,
      })
      const second = createQtr({
        reference: secondReference,
        speedRatio: '1:3',
        quarters: 1,
        beat: 1,
      })

      expect(first).not.toEqual(second)
    },
  )

  it.each(qtrBeats)('anchors QTR on VTG anim[%s - 1] and quarters one prop', (beat) => {
    for (const swapProps of [false, true]) {
      const selection = {
        reference: '2-3',
        speedRatio: '1:3',
        quarters: 1,
        beat,
        swapProps,
      } as const satisfies QtrPatternSelection
      const source = createVtg(selection)
      const qtr = createQtr(selection)
      const vtg = rootCompile(source)
      const quarter = rootCompile(qtr)
      const quarterPropIndex = swapProps ? 1 : 0

      for (const [propIndex, prop] of quarter.props.entries()) {
        const selectedBeat = vtg.props[propIndex]!.anim[beat - 1]!
        const selectedTarget = new Vector3().fromArray(selectedBeat.pos)
        const qtrTarget = new Vector3().fromArray(prop.anim[0]!.pos)
        const relationshipDistance =
          propIndex === quarterPropIndex
            ? qtrTarget.dot(selectedTarget)
            : qtrTarget.distanceTo(selectedTarget)

        expect(relationshipDistance).toBeCloseTo(0, 8)
      }

      expect(qtr.props.map((prop) => prop.anim.slice(1))).toEqual(
        source.props.map((prop) => prop.anim.slice(1)),
      )
    }
  })

  it('changes only first-frame arc and plane when entering the QTR relationship', () => {
    const selection = {
      reference: '2-1',
      speedRatio: '1:3',
      quarters: 1,
      beat: 1,
    } as const satisfies QtrPatternSelection
    const vtg = createVtg(selection)
    const quarter = createQtr(selection)

    expect(quarter.props.map((prop) => prop.anim.slice(1))).toEqual(
      vtg.props.map((prop) => prop.anim.slice(1)),
    )
    expect(quarter.props.map((prop) => prop.anim[0]!.turns)).toEqual(
      vtg.props.map((prop) => prop.anim[0]!.turns),
    )
  })

  it('keeps the enabled cells in a Quarter relationship across shared transforms', () => {
    for (const reference of enabledReferences) {
      for (const beat of qtrBeats) {
        for (const reversePlane of [false, true]) {
          for (const swapProps of [false, true]) {
            for (const shape of ['diamond', 'box'] as const) {
              const animation = rootCompile(
                createQtr({
                  reference,
                  speedRatio: '1:3',
                  quarters: 1,
                  beat,
                  reversePlane,
                  swapProps,
                  shape,
                }),
              )
              const first = new Vector3().fromArray(animation.props[0]!.anim[0]!.pos)
              const second = new Vector3().fromArray(animation.props[1]!.anim[0]!.pos)

              expect(
                first.dot(second),
                `${reference}, beat ${beat}, Flip ${reversePlane}, Swap ${swapProps}, ${shape}`,
              ).toBeCloseTo(0, 8)
            }
          }
        }
      }
    }
  })
})
