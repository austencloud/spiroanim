import { MathUtils, Vector3 } from 'three'

import { PNTIND, PPOS } from '@/domain/animation/AnimStruct'
import { eightStepColumns, eightStepPages, eightStepRows } from '@/features/eight-step/types'
import type {
  EightStepCellReference,
  EightStepColumn,
  EightStepCurveFamily,
  EightStepPage,
  EightStepPatternDefinition,
  EightStepRow,
  EightStepToken,
} from '@/features/eight-step/types'
import { vtgBaseFrameSettings } from '@/features/vtg/data/vtgPlayerSettings'
import { compactReadableAnimationFrames } from '@/math/animation/compressFrames'
import { InitialOrtho, InitialPoint, orthoAngle, orthoNext } from '@/math/animation/OrthogonalFunc'
import type { AnimReadable, PropReadable } from '@/types/AnimTypes'

type EightStepHandpath = readonly EightStepToken[]

interface EightStepHandpathPair {
  green: EightStepHandpath
  orange: EightStepHandpath
}

type EightStepPatternLetter = 'A' | 'E' | 'I'

export const eightStepHandpathsByPage: Readonly<Record<EightStepPage, EightStepHandpathPair>> = {
  1: {
    green: ['T', 'R', 'B', 'R', 'B', 'L', 'B', 'L', 'T', 'L', 'T', 'R'],
    orange: ['B', 'R', 'T', 'L', 'B', 'R', 'T', 'L', 'B', 'R', 'T', 'L'],
  },
  2: {
    green: ['T', 'L', 'B', 'L', 'B', 'R', 'B', 'R', 'T', 'R', 'T', 'L'],
    orange: ['B', 'L', 'T', 'R', 'B', 'L', 'T', 'R', 'B', 'L', 'T', 'R'],
  },
  3: {
    green: ['B', 'R', 'T', 'R', 'T', 'L', 'T', 'L', 'B', 'L', 'B', 'R'],
    orange: ['B', 'L', 'T', 'R', 'B', 'L', 'T', 'R', 'B', 'L', 'T', 'R'],
  },
  4: {
    green: ['B', 'L', 'T', 'L', 'T', 'R', 'T', 'R', 'B', 'R', 'B', 'L'],
    orange: ['B', 'R', 'T', 'L', 'B', 'R', 'T', 'L', 'B', 'R', 'T', 'L'],
  },
  5: {
    green: ['B', 'R', 'T', 'R', 'T', 'L', 'T', 'L', 'B', 'L', 'B', 'R'],
    orange: ['B', 'R', 'T', 'L', 'B', 'R', 'T', 'L', 'B', 'R', 'T', 'L'],
  },
  6: {
    green: ['B', 'L', 'T', 'L', 'T', 'R', 'T', 'R', 'B', 'R', 'B', 'L'],
    orange: ['B', 'L', 'T', 'R', 'B', 'L', 'T', 'R', 'B', 'L', 'T', 'R'],
  },
  7: {
    green: ['T', 'R', 'B', 'R', 'B', 'L', 'B', 'L', 'T', 'L', 'T', 'R'],
    orange: ['B', 'L', 'T', 'R', 'B', 'L', 'T', 'R', 'B', 'L', 'T', 'R'],
  },
  8: {
    green: ['T', 'L', 'B', 'L', 'B', 'R', 'B', 'R', 'T', 'R', 'T', 'L'],
    orange: ['B', 'R', 'T', 'L', 'B', 'R', 'T', 'L', 'B', 'R', 'T', 'L'],
  },
  9: {
    green: ['L', 'T', 'R', 'T', 'R', 'B', 'R', 'B', 'L', 'B', 'L', 'T'],
    orange: ['B', 'L', 'T', 'R', 'B', 'L', 'T', 'R', 'B', 'L', 'T', 'R'],
  },
  10: {
    green: ['R', 'T', 'L', 'T', 'L', 'B', 'L', 'B', 'R', 'B', 'R', 'T'],
    orange: ['B', 'R', 'T', 'L', 'B', 'R', 'T', 'L', 'B', 'R', 'T', 'L'],
  },
  11: {
    green: ['R', 'B', 'L', 'B', 'L', 'T', 'L', 'T', 'R', 'T', 'R', 'B'],
    orange: ['B', 'L', 'T', 'R', 'B', 'L', 'T', 'R', 'B', 'L', 'T', 'R'],
  },
  12: {
    green: ['L', 'B', 'R', 'B', 'R', 'T', 'R', 'T', 'L', 'T', 'L', 'B'],
    orange: ['B', 'R', 'T', 'L', 'B', 'R', 'T', 'L', 'B', 'R', 'T', 'L'],
  },
  13: {
    green: ['L', 'B', 'R', 'B', 'R', 'T', 'R', 'T', 'L', 'T', 'L', 'B'],
    orange: ['B', 'L', 'T', 'R', 'B', 'L', 'T', 'R', 'B', 'L', 'T', 'R'],
  },
  14: {
    green: ['R', 'B', 'L', 'B', 'L', 'T', 'L', 'T', 'R', 'T', 'R', 'B'],
    orange: ['B', 'R', 'T', 'L', 'B', 'R', 'T', 'L', 'B', 'R', 'T', 'L'],
  },
  15: {
    green: ['R', 'T', 'L', 'T', 'L', 'B', 'L', 'B', 'R', 'B', 'R', 'T'],
    orange: ['B', 'L', 'T', 'R', 'B', 'L', 'T', 'R', 'B', 'L', 'T', 'R'],
  },
  16: {
    green: ['L', 'T', 'R', 'T', 'R', 'B', 'R', 'B', 'L', 'B', 'L', 'T'],
    orange: ['B', 'R', 'T', 'L', 'B', 'R', 'T', 'L', 'B', 'R', 'T', 'L'],
  },
}

const allowedEdgepairs: ReadonlySet<string> = new Set([
  'TR',
  'RB',
  'BL',
  'LT',
  'TL',
  'LB',
  'BR',
  'RT',
])

const tokenPoints: Readonly<Record<EightStepToken, Vector3>> = {
  T: PPOS[PNTIND.MTC]!,
  R: PPOS[PNTIND.MR]!,
  B: PPOS[PNTIND.MBC]!,
  L: PPOS[PNTIND.ML]!,
}

const familyTurns: Readonly<Record<EightStepCurveFamily, number>> = {
  antispin: -360,
  extension: 0,
  inspin: 180,
  outspin: 180,
}

const getStartingFrame = (token: EightStepToken): AnimReadable => {
  const placement: Readonly<Record<EightStepToken, Pick<AnimReadable, 'arc' | 'plane'>>> = {
    B: { arc: 0, plane: 0 },
    L: { arc: 90, plane: 0 },
    T: { arc: 180, plane: 0 },
    R: { arc: 90, plane: 180 },
  }

  return {
    ...vtgBaseFrameSettings,
    ...placement[token],
    turns: 0,
  }
}

const getCurveFamily = (
  letter: EightStepPatternLetter,
  stepIndex: number,
  capping: boolean,
): EightStepCurveFamily => {
  const positionInChunk = stepIndex % 3

  if (letter === 'I') {
    if (positionInChunk === 0) return 'inspin'
    if (positionInChunk === 1) return 'outspin'
    return capping ? 'antispin' : 'extension'
  }

  if (!capping) return letter === 'A' ? 'antispin' : 'extension'

  const isPositiveTwoStep = positionInChunk !== 2
  if (letter === 'A') return isPositiveTwoStep ? 'antispin' : 'extension'
  return isPositiveTwoStep ? 'extension' : 'antispin'
}

const getPatternLetter = (row: EightStepRow, index: 0 | 1): EightStepPatternLetter => {
  const letter = row[index]
  if (letter === 'A' || letter === 'E' || letter === 'I') return letter
  throw new Error(`Invalid Eight Step pattern letter in ${row}`)
}

const normalizeAngle = (angle: number) => {
  const angleEpsilon = 1e-5
  let normalized = ((((angle + 180) % 360) + 360) % 360) - 180
  if (Math.abs(normalized) < angleEpsilon) normalized = 0
  if (Math.abs(normalized - Math.round(normalized)) < angleEpsilon)
    normalized = Math.round(normalized)
  return normalized
}

const solveIncomingAngle = (
  source: Vector3,
  target: Vector3,
  reference: Vector3,
  rotationAmount: number,
) => {
  let angle = orthoAngle(source, target, reference)
  if (Math.sin(rotationAmount) < 0) angle += Math.PI
  return MathUtils.degToRad(normalizeAngle(MathUtils.radToDeg(angle)))
}

const createPropDefinition = (
  handpath: EightStepHandpath,
  letter: EightStepPatternLetter,
  capping: boolean,
): PropReadable => {
  const firstToken = handpath[0]
  if (handpath.length !== 12 || !firstToken) {
    throw new Error('Eight Step handpaths must contain exactly 12 tokens')
  }

  const startingFrame = getStartingFrame(firstToken)
  const position = InitialPoint.clone()
  const positionReference = InitialOrtho.clone()
  const rotation = InitialPoint.clone()
  const rotationReference = InitialOrtho.clone()
  const startingPlane = MathUtils.degToRad(startingFrame.plane ?? 0)
  const startingArc = MathUtils.degToRad(startingFrame.arc ?? 0)

  orthoNext(startingPlane, startingArc, position, positionReference)
  orthoNext(startingPlane, startingArc, rotation, rotationReference)

  let propPhase: 1 | -1 = 1
  const continuationFrames = handpath.map((start, stepIndex): AnimReadable => {
    const end = handpath[(stepIndex + 1) % handpath.length]
    if (!end) throw new Error(`Missing Eight Step endpoint for step ${stepIndex + 1}`)

    const edgepair = `${start}${end}`
    if (!allowedEdgepairs.has(edgepair))
      throw new Error(`Unsupported Eight Step edgepair ${edgepair}`)

    const family = getCurveFamily(letter, stepIndex, capping)
    const turns = familyTurns[family]
    const arc = MathUtils.degToRad(90)
    const plane = solveIncomingAngle(position, tokenPoints[end], positionReference, arc)

    if (family === 'inspin' || family === 'outspin') propPhase = propPhase === 1 ? -1 : 1
    const targetRotation = tokenPoints[end].clone().multiplyScalar(propPhase)
    const rotationAmount = MathUtils.degToRad(turns + 90)
    const axis = solveIncomingAngle(rotation, targetRotation, rotationReference, rotationAmount)

    orthoNext(plane, arc, position, positionReference)
    orthoNext(axis, rotationAmount, rotation, rotationReference)

    return {
      arc: 90,
      plane: normalizeAngle(MathUtils.radToDeg(plane)),
      axis: normalizeAngle(MathUtils.radToDeg(axis)),
      turns,
    }
  })

  return { anim: compactReadableAnimationFrames([startingFrame, ...continuationFrames]) }
}

const createCellReference = (column: EightStepColumn, row: EightStepRow): EightStepCellReference =>
  `${column}-${row}`

const createPatternDefinition = (
  column: EightStepColumn,
  row: EightStepRow,
): EightStepPatternDefinition => {
  const page = eightStepPages[column - 1]
  if (!page) throw new Error(`Missing Eight Step page for column ${column}`)
  const handpaths = eightStepHandpathsByPage[page]

  return {
    column,
    page,
    row,
    reference: createCellReference(column, row),
    props: [
      createPropDefinition(handpaths.green, getPatternLetter(row, 0), true),
      createPropDefinition(handpaths.orange, getPatternLetter(row, 1), false),
    ],
  }
}

/**
 * Every matrix cell owns its complete pair of 13-frame animation definitions.
 * The first frame establishes that cell's private starting state and the next
 * 12 frames are its visible steps. No frame or prop objects are shared between
 * cells, rows, or columns.
 */
export const eightStepPatternDefinitions: readonly EightStepPatternDefinition[] =
  eightStepRows.flatMap((row) =>
    eightStepColumns.map((column) => createPatternDefinition(column, row)),
  )

export const getEightStepPatternDefinition = (
  reference: EightStepCellReference,
): EightStepPatternDefinition | undefined =>
  eightStepPatternDefinitions.find((definition) => definition.reference === reference)
