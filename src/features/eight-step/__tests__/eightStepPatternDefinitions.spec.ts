import { Vector3 } from 'three'
import { describe, expect, it } from 'vitest'

import { PNTIND, PPOS } from '@/domain/animation/AnimStruct'
import { createDefaultEightStepAnimation } from '@/features/eight-step/createEightStepAnimation'
import {
  eightStepHandpathsByPage,
  eightStepPatternDefinitions,
} from '@/features/eight-step/data/eightStepPatternDefinitions'
import { eightStepColumns, eightStepPages, eightStepRows } from '@/features/eight-step/types'
import type { EightStepToken } from '@/features/eight-step/types'
import { rootCompile } from '@/math/animation/AnimFunc'

const tokenPoints: Readonly<Record<EightStepToken, Vector3>> = {
  T: PPOS[PNTIND.MTC]!,
  R: PPOS[PNTIND.MR]!,
  B: PPOS[PNTIND.MBC]!,
  L: PPOS[PNTIND.ML]!,
}

const evenHandpaths = {
  2: {
    green: ['T', 'L', 'B', 'L', 'B', 'R', 'B', 'R', 'T', 'R', 'T', 'L'],
    orange: ['B', 'L', 'T', 'R', 'B', 'L', 'T', 'R', 'B', 'L', 'T', 'R'],
  },
  4: {
    green: ['T', 'L', 'B', 'L', 'B', 'R', 'B', 'R', 'T', 'R', 'T', 'L'],
    orange: ['B', 'R', 'T', 'L', 'B', 'R', 'T', 'L', 'B', 'R', 'T', 'L'],
  },
  6: {
    green: ['B', 'L', 'T', 'L', 'T', 'R', 'T', 'R', 'B', 'R', 'B', 'L'],
    orange: ['B', 'L', 'T', 'R', 'B', 'L', 'T', 'R', 'B', 'L', 'T', 'R'],
  },
  8: {
    green: ['B', 'L', 'T', 'L', 'T', 'R', 'T', 'R', 'B', 'R', 'B', 'L'],
    orange: ['B', 'R', 'T', 'L', 'B', 'R', 'T', 'L', 'B', 'R', 'T', 'L'],
  },
  10: {
    green: ['R', 'B', 'L', 'B', 'L', 'T', 'L', 'T', 'R', 'T', 'R', 'B'],
    orange: ['B', 'L', 'T', 'R', 'B', 'L', 'T', 'R', 'B', 'L', 'T', 'R'],
  },
  12: {
    green: ['R', 'T', 'L', 'T', 'L', 'B', 'L', 'B', 'R', 'B', 'R', 'T'],
    orange: ['B', 'L', 'T', 'R', 'B', 'L', 'T', 'R', 'B', 'L', 'T', 'R'],
  },
  14: {
    green: ['R', 'B', 'L', 'B', 'L', 'T', 'L', 'T', 'R', 'T', 'R', 'B'],
    orange: ['B', 'R', 'T', 'L', 'B', 'R', 'T', 'L', 'B', 'R', 'T', 'L'],
  },
  16: {
    green: ['R', 'T', 'L', 'T', 'L', 'B', 'L', 'B', 'R', 'B', 'R', 'T'],
    orange: ['B', 'R', 'T', 'L', 'B', 'R', 'T', 'L', 'B', 'R', 'T', 'L'],
  },
} as const satisfies Readonly<
  Record<number, { green: readonly EightStepToken[]; orange: readonly EightStepToken[] }>
>

const expectVector = (actual: readonly number[], expected: Vector3, context = 'vector') => {
  expect(actual[0], `${context} x`).toBeCloseTo(expected.x, 7)
  expect(actual[1], `${context} y`).toBeCloseTo(expected.y, 7)
  expect(actual[2], `${context} z`).toBeCloseTo(expected.z, 7)
}

describe('eightStepPatternDefinitions', () => {
  it('provides one independently owned 13-frame definition for every matrix cell', () => {
    expect(eightStepPatternDefinitions).toHaveLength(eightStepColumns.length * eightStepRows.length)
    expect(new Set(eightStepPatternDefinitions.map(({ reference }) => reference)).size).toBe(72)
    expect(new Set(eightStepPatternDefinitions.map(({ props }) => props)).size).toBe(72)
    expect(new Set(eightStepPatternDefinitions.flatMap(({ props }) => props)).size).toBe(144)

    const animations = eightStepPatternDefinitions.flatMap(({ props }) =>
      props.map(({ anim }) => anim),
    )
    expect(new Set(animations).size).toBe(144)
    expect(animations.every((anim) => anim.length === 13)).toBe(true)
    expect(new Set(animations.flat()).size).toBe(72 * 2 * 13)
  })

  it('maps columns to the eight odd source pages', () => {
    expect(
      eightStepPatternDefinitions.slice(0, 8).map(({ reference, page }) => [reference, page]),
    ).toEqual([
      ['1-AA', 1],
      ['2-AA', 3],
      ['3-AA', 5],
      ['4-AA', 7],
      ['5-AA', 9],
      ['6-AA', 11],
      ['7-AA', 13],
      ['8-AA', 15],
    ])
    expect(eightStepPatternDefinitions.at(-1)?.reference).toBe('8-II')
  })

  it('assigns the supplied capping and continual curve-family turn sequences', () => {
    const turns = (reference: string, propIndex: 0 | 1) =>
      eightStepPatternDefinitions
        .find((definition) => definition.reference === reference)
        ?.props[propIndex].anim.slice(1, 4)
        .map((frame) => frame.turns)

    expect(turns('1-AA', 0)).toEqual([-360, -360, 0])
    expect(turns('1-AA', 1)).toEqual([-360, -360, -360])
    expect(turns('1-AE', 1)).toEqual([0, 0, 0])
    expect(turns('1-AI', 1)).toEqual([180, 180, 0])
    expect(turns('1-EA', 0)).toEqual([0, 0, -360])
    expect(turns('1-IA', 0)).toEqual([180, 180, -360])
  })

  it('compiles every source track to its twelve cardinal positions and exact incoming axes', () => {
    for (const definition of eightStepPatternDefinitions) {
      const animation = createDefaultEightStepAnimation({
        concept: '8stp',
        reference: definition.reference,
      })
      expect(animation).toBeDefined()
      if (!animation) continue

      const compiled = rootCompile(animation)
      const source = eightStepHandpathsByPage[definition.page]

      for (const [propIndex, tokens] of [source.green, source.orange].entries()) {
        const frames = compiled.props[propIndex]!.anim
        expect(frames).toHaveLength(13)
        expectVector(frames[0]!.pos, tokenPoints[tokens[0]!]!)

        for (let stepIndex = 0; stepIndex < 12; stepIndex++) {
          const start = tokenPoints[tokens[stepIndex]!]!
          const end = tokenPoints[tokens[(stepIndex + 1) % 12]!]!
          const frame = frames[stepIndex + 1]!
          const context = `${definition.reference} prop ${propIndex + 1} step ${stepIndex + 1}`
          expectVector(frame.pos, end, `${context} position`)
          expectVector(
            frame.posx,
            new Vector3().crossVectors(start, end).normalize(),
            `${context} axis`,
          )
        }

        expectVector(frames[0]!.rot, tokenPoints[tokens[0]!]!)
        expectVector(frames[12]!.rot, tokenPoints[tokens[0]!]!)
      }
    }
  })

  it('compiles FLIP to the eight authoritative even-page handpaths', () => {
    for (const [columnIndex, oddPage] of eightStepPages.entries()) {
      const definition = eightStepPatternDefinitions.find(
        ({ column, row }) => column === columnIndex + 1 && row === 'AA',
      )
      expect(definition?.page).toBe(oddPage)
      if (!definition) continue

      const animation = createDefaultEightStepAnimation({
        concept: '8stp',
        reference: definition.reference,
        reversePlane: true,
      })
      expect(animation).toBeDefined()
      if (!animation) continue

      const compiled = rootCompile(animation)
      const evenPage = evenHandpaths[(oddPage + 1) as keyof typeof evenHandpaths]

      for (const [propIndex, tokens] of [evenPage.green, evenPage.orange].entries()) {
        const frames = compiled.props[propIndex]!.anim
        expectVector(frames[0]!.pos, tokenPoints[tokens[0]!]!)
        for (let stepIndex = 0; stepIndex < 12; stepIndex++) {
          const start = tokenPoints[tokens[stepIndex]!]!
          const end = tokenPoints[tokens[(stepIndex + 1) % 12]!]!
          const frame = frames[stepIndex + 1]!
          const context = `page ${oddPage + 1} prop ${propIndex + 1} step ${stepIndex + 1}`
          expectVector(frame.pos, end, `${context} position`)
          expectVector(
            frame.posx,
            new Vector3().crossVectors(start, end).normalize(),
            `${context} axis`,
          )
        }
      }
    }
  })
})
