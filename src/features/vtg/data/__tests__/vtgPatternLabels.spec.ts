import { describe, expect, it } from 'vitest'
import { Vector3 } from 'three'

import { createDefaultVtgAnimation } from '@/features/vtg/createVtgAnimation'
import { vtgRowPatterns } from '@/features/vtg/data/patterns/rows'
import {
  describeVtgPatternLabel,
  vtgPatternLabelsByRow,
} from '@/features/vtg/data/vtgPatternLabels'
import type {
  VtgCellReference,
  VtgPatternLabel,
  VtgRelationshipCode,
  VtgRuleNumber,
  VtgSpeedRatio,
} from '@/features/vtg/types'
import { vtgSpeedRatios } from '@/features/vtg/types'
import { rootCompile } from '@/math/animation/AnimFunc'

const ruleNumbers = [1, 2, 3, 4, 5, 6] as const satisfies readonly VtgRuleNumber[]

const expectedLabelsByRow = {
  1: ['TS/TS', 'SO/SO', 'TS/TS', 'SO/SO', 'TS/SO', 'SO/TS'],
  2: ['TO/TO', 'SS/SS', 'TO/TO', 'SS/SS', 'TO/SS', 'SS/TO'],
  3: ['TS/TS', 'SO/SO', 'TS/TS', 'SO/SO', 'TS/SO', 'SO/TS'],
  4: ['TO/TO', 'SS/SS', 'TO/TO', 'SS/SS', 'TO/SS', 'SS/TO'],
  5: ['TS/TO', 'SO/SS', 'TS/TO', 'SO/SS', 'TS/SS', 'SO/TO'],
  6: ['TO/TS', 'SS/SO', 'TO/TS', 'SS/SO', 'TO/SO', 'SS/TS'],
} as const satisfies Readonly<Record<VtgRuleNumber, readonly VtgPatternLabel[]>>

const expectedDescriptions = {
  'SO/TS': 'Hands: Split / Opposite\nProps: Together / Same',
  'SS/TO': 'Hands: Split / Same\nProps: Together / Opposite',
  'SO/TO': 'Hands: Split / Opposite\nProps: Together / Opposite',
  'SS/TS': 'Hands: Split / Same\nProps: Together / Same',
  'TS/SO': 'Hands: Together / Same\nProps: Split / Opposite',
  'TO/SS': 'Hands: Together / Opposite\nProps: Split / Same',
  'TS/SS': 'Hands: Together / Same\nProps: Split / Same',
  'TO/SO': 'Hands: Together / Opposite\nProps: Split / Opposite',
  'SO/SO': 'Hands: Split / Opposite\nProps: Split / Opposite',
  'SS/SS': 'Hands: Split / Same\nProps: Split / Same',
  'SO/SS': 'Hands: Split / Opposite\nProps: Split / Same',
  'SS/SO': 'Hands: Split / Same\nProps: Split / Opposite',
  'TS/TS': 'Hands: Together / Same\nProps: Together / Same',
  'TO/TO': 'Hands: Together / Opposite\nProps: Together / Opposite',
  'TS/TO': 'Hands: Together / Same\nProps: Together / Opposite',
  'TO/TS': 'Hands: Together / Opposite\nProps: Together / Same',
} as const satisfies Readonly<Partial<Record<VtgPatternLabel, string>>>

const spinToggleCells: ReadonlySet<VtgCellReference> = new Set(['5-6', '6-6', '5-5', '6-5'])

const relationshipSign = (
  first: [number, number, number],
  second: [number, number, number],
): 1 | -1 => {
  const dot = new Vector3().fromArray(first).dot(new Vector3().fromArray(second))
  if (Math.abs(Math.abs(dot) - 1) > 0.000_001) {
    throw new Error(`Expected parallel or antiparallel VTG vectors, received dot product ${dot}`)
  }

  return dot > 0 ? 1 : -1
}

const timingCode = (sign: 1 | -1): 'T' | 'S' => (sign > 0 ? 'T' : 'S')
const directionCode = (sign: number): 'S' | 'O' => (sign > 0 ? 'S' : 'O')

const deriveLabelFromAnimation = (
  reference: VtgCellReference,
  speedRatio: VtgSpeedRatio,
  isAnti: boolean,
): VtgPatternLabel => {
  const animation = createDefaultVtgAnimation({ reference, speedRatio, isAnti })
  if (animation === undefined) throw new Error(`Missing VTG animation for ${reference}`)

  const compiled = rootCompile(animation)
  const firstStart = compiled.props[0]?.anim[0]
  const secondStart = compiled.props[1]?.anim[0]
  const firstEnd = compiled.props[0]?.anim[1]
  const secondEnd = compiled.props[1]?.anim[1]
  if (
    firstStart === undefined ||
    secondStart === undefined ||
    firstEnd === undefined ||
    secondEnd === undefined
  ) {
    throw new Error(`Missing compiled VTG relationship frame for ${reference}`)
  }

  const handStartTiming = relationshipSign(firstStart.pos, secondStart.pos)
  const propStartTiming = relationshipSign(firstStart.rot, secondStart.rot)
  const handTiming = relationshipSign(firstEnd.pos, secondEnd.pos)
  const propTiming = relationshipSign(firstEnd.rot, secondEnd.rot)
  const handDirection = relationshipSign(firstEnd.posx, secondEnd.posx)

  // Prop axes use the local hand/prop phase frames. Correct their relative
  // handedness when those frames change parity between the segment endpoints.
  const propDirection =
    relationshipSign(firstEnd.rotx, secondEnd.rotx) *
    handStartTiming *
    propStartTiming *
    handTiming *
    propTiming

  const hands: VtgRelationshipCode = `${timingCode(handTiming)}${directionCode(handDirection)}`
  const props: VtgRelationshipCode = `${timingCode(propTiming)}${directionCode(propDirection)}`

  return `${hands}/${props}`
}

describe('VTG pattern labels', () => {
  it('keeps every matrix cell aligned with the validated VTG label table', () => {
    expect(vtgPatternLabelsByRow).toEqual(expectedLabelsByRow)

    for (const row of ruleNumbers) {
      for (const column of ruleNumbers) {
        const reference: VtgCellReference = `${column}-${row}`
        const expectedLabel = expectedLabelsByRow[row][column - 1]

        expect(vtgRowPatterns[reference]?.label).toBe(expectedLabel)
      }
    }
  })

  it('expands each letter according to its position in the relationship code', () => {
    for (const row of ruleNumbers) {
      for (const label of expectedLabelsByRow[row]) {
        expect(describeVtgPatternLabel(label)).toBe(expectedDescriptions[label])
      }
    }
  })

  it('corresponds to the generated hand and prop timing and direction data', () => {
    const mismatches: string[] = []

    for (const row of ruleNumbers) {
      for (const column of ruleNumbers) {
        const reference: VtgCellReference = `${column}-${row}`
        const expectedLabel = expectedLabelsByRow[row][column - 1]
        const antiOptions = spinToggleCells.has(reference) ? [false, true] : [false]

        for (const speedRatio of vtgSpeedRatios) {
          for (const isAnti of antiOptions) {
            const derivedLabel = deriveLabelFromAnimation(reference, speedRatio, isAnti)
            if (derivedLabel !== expectedLabel) {
              mismatches.push(
                `${reference}, ${speedRatio}, ${isAnti ? 'Anti' : 'Spin'}: ${derivedLabel} != ${expectedLabel}`,
              )
            }
          }
        }
      }
    }

    expect(mismatches).toEqual([])
  })
})
