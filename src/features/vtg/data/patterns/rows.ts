import { vtgBaseFrameSettings, vtgPlayerSettings } from '@/features/vtg/data/vtgPlayerSettings'
import { vtgSpeedRatios } from '@/features/vtg/types'
import type {
  VtgCellReference,
  VtgPatternBuilder,
  VtgPatternDefinition,
  VtgReadableAnimation,
  VtgRuleNumber,
  VtgSpeedRatio,
} from '@/features/vtg/types'
import type { AnimReadable } from '@/types/AnimTypes'

type VtgPropPair = readonly [AnimReadable, AnimReadable]

interface VtgSpinAntiPair {
  spin: VtgPropPair
  anti: VtgPropPair
}

type VtgCellPattern = VtgPropPair | VtgSpinAntiPair
type VtgColumnPatterns = Readonly<Record<VtgRuleNumber, VtgCellPattern>>

interface VtgRowPattern {
  starts: VtgPropPair
  columns: VtgColumnPatterns
  swapProps?: boolean
}

const createFirstFrame = (start: AnimReadable): AnimReadable => {
  const frame = { ...vtgBaseFrameSettings, ...start }
  if (frame.plane === 0) delete frame.plane
  if (frame.turns === 0) delete frame.turns
  return frame
}

const transformTurns = (turns: number, speedRatio: VtgSpeedRatio): number =>
  ((turns + 45) * Number(speedRatio.slice(2))) / 3 - 45

const createContinuationFrame = (
  start: AnimReadable,
  continuation: AnimReadable,
  speedRatio: VtgSpeedRatio,
): AnimReadable => {
  const frame = {
    ...continuation,
    ...(continuation.turns === undefined
      ? undefined
      : { turns: transformTurns(continuation.turns, speedRatio) }),
  }
  if (frame.plane === 0) delete frame.plane
  if (frame.turns === (start.turns ?? 0)) delete frame.turns
  return frame
}

const createPattern = (
  row: VtgRowPattern,
  cellPattern: VtgCellPattern,
  isAnti: boolean,
  speedRatio: VtgSpeedRatio,
): VtgReadableAnimation => {
  const continuations =
    'spin' in cellPattern ? (isAnti ? cellPattern.anti : cellPattern.spin) : cellPattern
  const createProp = (index: 0 | 1) => ({
    anim: [
      createFirstFrame(row.starts[index]),
      createContinuationFrame(row.starts[index], continuations[index], speedRatio),
      {},
      {},
      {},
      {},
      {},
      {},
      {},
    ],
  })

  return {
    ...vtgPlayerSettings,
    bpm: vtgPlayerSettings.bpm * 2,
    props: row.swapProps ? [createProp(1), createProp(0)] : [createProp(0), createProp(1)],
  }
}

const createPatternBuilders = (
  row: VtgRowPattern,
  column: VtgRuleNumber,
): VtgPatternDefinition['patternsBySpeedRatio'] => {
  const builders: Partial<Record<VtgSpeedRatio, VtgPatternBuilder>> = {}
  for (const speedRatio of vtgSpeedRatios) {
    builders[speedRatio] = (isAnti) => createPattern(row, row.columns[column], isAnti, speedRatio)
  }
  return builders
}

/**
 * VTG cells are numbered row first in the interface. Every cell in a row shares
 * the same first animation frame for each prop. Continuations are the
 * canonical doubled 1:3 data; the builder derives only their turns for other ratios.
 * Only the four special cells define explicit Spin/Anti variants.
 */
// prettier-ignore
const rowPatterns: Readonly<Record<VtgRuleNumber, VtgRowPattern>> = {
  // Row 1 starts both props on the 180-degree plane and owns every continuation.
  1: {
    starts: [{ plane: 180, arc: 90, turns: 0 }, { plane: 180, arc: 90, turns: 0 }],
    columns: {
      1: [{ plane: 180, arc: 45, turns: -180 }, { plane: 180, arc: 45, turns: -180 }],
      2: [{ plane: 180, arc: 45, turns: -180 }, { plane: 0, arc: 45, turns: -180 }],
      3: [{ plane: 180, arc: 45, turns: 90 }, { plane: 180, arc: 45, turns: 90 }],
      4: [{ plane: 180, arc: 45, turns: 90 }, { plane: 0, arc: 45, turns: 90 }],
      5: [{ plane: 180, arc: 45, turns: 90 }, { plane: 180, arc: 45, turns: -180 }],
      6: [{ plane: 180, arc: 45, turns: 90 }, { plane: 0, arc: 45, turns: -180 }],
    },
  },
  // Row 2 starts the second prop on plane 0 and owns a separate copy of every continuation.
  2: {
    starts: [{ plane: 180, arc: 90, turns: 0 }, { plane: 0, arc: 90, turns: 0 }],
    columns: {
      1: [{ plane: 180, arc: 45, turns: -180 }, { plane: 180, arc: 45, turns: -180 }],
      2: [{ plane: 180, arc: 45, turns: -180 }, { plane: 0, arc: 45, turns: -180 }],
      3: [{ plane: 180, arc: 45, turns: 90 }, { plane: 180, arc: 45, turns: 90 }],
      4: [{ plane: 180, arc: 45, turns: 90 }, { plane: 0, arc: 45, turns: 90 }],
      5: [{ plane: 180, arc: 45, turns: 90 }, { plane: 180, arc: 45, turns: -180 }],
      6: [{ plane: 180, arc: 45, turns: 90 }, { plane: 0, arc: 45, turns: -180 }],
    },
  },
  // Row 3 starts the props in opposite directions and keeps row 4's second prop on plane 0.
  3: {
    starts: [{ plane: 180, arc: 90, turns: -180 }, { plane: 180, arc: 90, turns: 180 }],
    columns: {
      1: [{ plane: 180, arc: 45, turns: 90 }, { plane: 180, arc: 45, turns: 90 }],
      2: [{ plane: 180, arc: 45, turns: 90 }, { plane: 0, arc: 45, turns: 90 }],
      3: [{ plane: 180, arc: 45, turns: -180 }, { plane: 180, arc: 45, turns: -180 }],
      4: [{ plane: 180, arc: 45, turns: -180 }, { plane: 0, arc: 45, turns: -180 }],
      5: [{ plane: 180, arc: 45, turns: 90 }, { plane: 180, arc: 45, turns: -180 }],
      6: [{ plane: 180, arc: 45, turns: 90 }, { plane: 0, arc: 45, turns: -180 }],
    },
  },
  // Row 4 pairs a backward plane path with a forward arc path and owns every continuation.
  4: {
    starts: [{ plane: 180, arc: 90, turns: -180 }, { plane: 0, arc: 90, turns: 180 }],
    columns: {
      1: [{ plane: 180, arc: 45, turns: 90 }, { plane: 180, arc: 45, turns: 90 }],
      2: [{ plane: 180, arc: 45, turns: 90 }, { plane: 0, arc: 45, turns: 90 }],
      3: [{ plane: 180, arc: 45, turns: -180 }, { plane: 180, arc: 45, turns: -180 }],
      4: [{ plane: 180, arc: 45, turns: -180 }, { plane: 0, arc: 45, turns: -180 }],
      5: [{ plane: 180, arc: 45, turns: 90 }, { plane: 180, arc: 45, turns: -180 }],
      6: [{ plane: 180, arc: 45, turns: 90 }, { plane: 0, arc: 45, turns: -180 }],
    },
  },
  // Row 5 starts with two arc paths and defines Spin/Anti alternatives for rows 5 and 6.
  5: {
    starts: [{ plane: 0, arc: 90, turns: 0 }, { plane: 0, arc: 90, turns: 180 }],
    columns: {
      1: [{ plane: 0, arc: 45, turns: -180 }, { plane: 0, arc: 45, turns: 90 }],
      2: [{ plane: 0, arc: 45, turns: -180 }, { plane: 180, arc: 45, turns: 90 }],
      3: [{ plane: 0, arc: 45, turns: 90 }, { plane: 0, arc: 45, turns: -180 }],
      4: [{ plane: 0, arc: 45, turns: 90 }, { plane: 180, arc: 45, turns: -180 }],
      5: { spin: [{ plane: 0, arc: 45, turns: 90 }, { plane: 0, arc: 45, turns: 90 }], anti: [{ plane: 180, arc: 45, turns: -180 }, { plane: 180, arc: 45, turns: -180 }] },
      6: { spin: [{ plane: 0, arc: 45, turns: 90 }, { plane: 180, arc: 45, turns: 90 }], anti: [{ plane: 0, arc: 45, turns: -180 }, { plane: 180, arc: 45, turns: -180 }] },
    },
  },
  // Row 6 mirrors column 5's roles.
  6: {
    starts: [{ plane: 180, arc: 90, turns: 180 }, { plane: 0, arc: 90, turns: 0 }],
    swapProps: true,
    columns: {
      1: [{ plane: 0, arc: 45, turns: 90 }, { plane: 0, arc: 45, turns: -180 }],
      2: [{ plane: 180, arc: 45, turns: 90 }, { plane: 0, arc: 45, turns: -180 }],
      3: [{ plane: 0, arc: 45, turns: -180 }, { plane: 0, arc: 45, turns: 90 }],
      4: [{ plane: 180, arc: 45, turns: -180 }, { plane: 0, arc: 45, turns: 90 }],
      5: { spin: [{ plane: 0, arc: 45, turns: 90 }, { plane: 0, arc: 45, turns: 90 }], anti: [{ plane: 0, arc: 45, turns: -180 }, { plane: 0, arc: 45, turns: -180 }] },
      6: { spin: [{ plane: 180, arc: 45, turns: 90 }, { plane: 0, arc: 45, turns: 90 }], anti: [{ plane: 180, arc: 45, turns: -180 }, { plane: 0, arc: 45, turns: -180 }] },
    },
  },
}

const ruleNumbers = [1, 2, 3, 4, 5, 6] as const
const catalog: Partial<Record<VtgCellReference, Readonly<VtgPatternDefinition>>> = {}

for (const row of ruleNumbers) {
  for (const column of ruleNumbers) {
    const reference: VtgCellReference = `${column}-${row}`
    catalog[reference] = { patternsBySpeedRatio: createPatternBuilders(rowPatterns[row], column) }
  }
}

export const vtgRowPatterns: Readonly<
  Partial<Record<VtgCellReference, Readonly<VtgPatternDefinition>>>
> = catalog
