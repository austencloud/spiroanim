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
type VtgColumnPatterns = Readonly<Partial<Record<VtgRuleNumber, VtgCellPattern>>>
type VtgColumnsBySpeedRatio = Readonly<Partial<Record<VtgSpeedRatio, VtgColumnPatterns>>>

interface VtgRowPattern {
  starts: VtgPropPair
  columnsBySpeedRatio: VtgColumnsBySpeedRatio
  swapProps?: boolean
}

const createFirstFrame = (start: AnimReadable): AnimReadable => {
  const frame = { ...vtgBaseFrameSettings, ...start }
  if (frame.plane === 0) delete frame.plane
  if (frame.turns === 0) delete frame.turns
  return frame
}

const createContinuationFrame = (start: AnimReadable, continuation: AnimReadable): AnimReadable => {
  const frame = { ...continuation }
  if (frame.plane === 0) delete frame.plane
  if (frame.turns === (start.turns ?? 0)) delete frame.turns
  return frame
}

const createPattern = (
  row: VtgRowPattern,
  cellPattern: VtgCellPattern,
  isAnti: boolean,
): VtgReadableAnimation => {
  const continuations =
    'spin' in cellPattern ? (isAnti ? cellPattern.anti : cellPattern.spin) : cellPattern
  const createProp = (index: 0 | 1) => ({
    anim: [
      createFirstFrame(row.starts[index]),
      createContinuationFrame(row.starts[index], continuations[index]),
    ],
  })

  return {
    ...vtgPlayerSettings,
    props: row.swapProps ? [createProp(1), createProp(0)] : [createProp(0), createProp(1)],
  }
}

const createPatternBuilders = (
  row: VtgRowPattern,
  column: VtgRuleNumber,
): VtgPatternDefinition['patternsBySpeedRatio'] => {
  const builders: Partial<Record<VtgSpeedRatio, VtgPatternBuilder>> = {}

  for (const speedRatio of vtgSpeedRatios) {
    const cellPattern = row.columnsBySpeedRatio[speedRatio]?.[column]
    if (cellPattern === undefined) continue
    builders[speedRatio] = (isAnti) => createPattern(row, cellPattern, isAnti)
  }

  return builders
}

/**
 * A VTG reference stores the column first and row second. Every cell in a row
 * shares the same first animation frame for each prop. Each column entry
 * supplies the second frames for one speed ratio. Ratios are independent:
 * missing ratio data is unsupported rather than inherited from another ratio.
 * Only the four special cells define explicit Spin/Anti variants.
 */
// prettier-ignore
const rowPatterns: Readonly<Record<VtgRuleNumber, VtgRowPattern>> = {
  // Row 1 starts both props on the 180-degree plane and owns every continuation.
  1: {
    starts: [{ plane: 180, arc:  90, turns:    0 }, { plane: 180, arc:  90, turns:    0 }],
    columnsBySpeedRatio: {
      // At 1:1, the paired turn values are 0 and -180.
      '1:1': {
        1: [{ plane: 180, arc:  90, turns:    0 }, { plane: 180, arc:  90, turns:    0 }],
        2: [{ plane: 180, arc:  90, turns:    0 }, { plane:   0, arc:  90, turns:    0 }],
        3: [{ plane: 180, arc:  90, turns: -180 }, { plane: 180, arc:  90, turns: -180 }],
        4: [{ plane: 180, arc:  90, turns: -180 }, { plane:   0, arc:  90, turns: -180 }],
        5: [{ plane: 180, arc:  90, turns:    0 }, { plane: 180, arc:  90, turns: -180 }],
        6: [{ plane: 180, arc:  90, turns:    0 }, { plane:   0, arc:  90, turns: -180 }],
      },
      // At 1:3, the paired turn values advance to -360 and 180.
      '1:3': {
        1: [{ plane: 180, arc:  90, turns: -360 }, { plane: 180, arc:  90, turns: -360 }],
        2: [{ plane: 180, arc:  90, turns: -360 }, { plane:   0, arc:  90, turns: -360 }],
        3: [{ plane: 180, arc:  90, turns:  180 }, { plane: 180, arc:  90, turns:  180 }],
        4: [{ plane: 180, arc:  90, turns:  180 }, { plane:   0, arc:  90, turns:  180 }],
        5: [{ plane: 180, arc:  90, turns:  180 }, { plane: 180, arc:  90, turns: -360 }],
        6: [{ plane: 180, arc:  90, turns:  180 }, { plane:   0, arc:  90, turns: -360 }],
      },
      // At 1:5, the paired turn values advance to 360 and -540.
      '1:5': {
        1: [{ plane: 180, arc:  90, turns:  360 }, { plane: 180, arc:  90, turns:  360 }],
        2: [{ plane: 180, arc:  90, turns:  360 }, { plane:   0, arc:  90, turns:  360 }],
        3: [{ plane: 180, arc:  90, turns: -540 }, { plane: 180, arc:  90, turns: -540 }],
        4: [{ plane: 180, arc:  90, turns: -540 }, { plane:   0, arc:  90, turns: -540 }],
        5: [{ plane: 180, arc:  90, turns:  360 }, { plane: 180, arc:  90, turns: -540 }],
        6: [{ plane: 180, arc:  90, turns:  360 }, { plane:   0, arc:  90, turns: -540 }],
      },
    },
  },
  // Row 2 starts the second prop on plane 0 and owns a separate copy of every continuation.
  2: {
    starts: [{ plane: 180, arc:  90, turns:    0 }, { plane:   0, arc:  90, turns:    0 }],
    columnsBySpeedRatio: {
      // At 1:1, the paired turn values are 0 and -180.
      '1:1': {
        1: [{ plane: 180, arc:  90, turns:    0 }, { plane: 180, arc:  90, turns:    0 }],
        2: [{ plane: 180, arc:  90, turns:    0 }, { plane:   0, arc:  90, turns:    0 }],
        3: [{ plane: 180, arc:  90, turns: -180 }, { plane: 180, arc:  90, turns: -180 }],
        4: [{ plane: 180, arc:  90, turns: -180 }, { plane:   0, arc:  90, turns: -180 }],
        5: [{ plane: 180, arc:  90, turns:    0 }, { plane: 180, arc:  90, turns: -180 }],
        6: [{ plane: 180, arc:  90, turns:    0 }, { plane:   0, arc:  90, turns: -180 }],
      },
      // At 1:3, the paired turn values advance to -360 and 180.
      '1:3': {
        1: [{ plane: 180, arc:  90, turns: -360 }, { plane: 180, arc:  90, turns: -360 }],
        2: [{ plane: 180, arc:  90, turns: -360 }, { plane:   0, arc:  90, turns: -360 }],
        3: [{ plane: 180, arc:  90, turns:  180 }, { plane: 180, arc:  90, turns:  180 }],
        4: [{ plane: 180, arc:  90, turns:  180 }, { plane:   0, arc:  90, turns:  180 }],
        5: [{ plane: 180, arc:  90, turns:  180 }, { plane: 180, arc:  90, turns: -360 }],
        6: [{ plane: 180, arc:  90, turns:  180 }, { plane:   0, arc:  90, turns: -360 }],
      },
      // At 1:5, the paired turn values advance to 360 and -540.
      '1:5': {
        1: [{ plane: 180, arc:  90, turns:  360 }, { plane: 180, arc:  90, turns:  360 }],
        2: [{ plane: 180, arc:  90, turns:  360 }, { plane:   0, arc:  90, turns:  360 }],
        3: [{ plane: 180, arc:  90, turns: -540 }, { plane: 180, arc:  90, turns: -540 }],
        4: [{ plane: 180, arc:  90, turns: -540 }, { plane:   0, arc:  90, turns: -540 }],
        5: [{ plane: 180, arc:  90, turns:  360 }, { plane: 180, arc:  90, turns: -540 }],
        6: [{ plane: 180, arc:  90, turns:  360 }, { plane:   0, arc:  90, turns: -540 }],
      },
    },
  },
  // Row 3 starts the props in opposite directions and keeps row 4's second prop on plane 0.
  3: {
    starts: [{ plane: 180, arc:  90, turns: -180 }, { plane: 180, arc:  90, turns:  180 }],
    columnsBySpeedRatio: {
      // Use the inside 1:1 values, with row 4's second prop ending on plane 0.
      '1:1': {
        1: [{ plane: 180, arc:  90, turns: -180 }, { plane: 180, arc:  90, turns: -180 }],
        2: [{ plane: 180, arc:  90, turns: -180 }, { plane:   0, arc:  90, turns: -180 }],
        3: [{ plane: 180, arc:  90, turns:    0 }, { plane: 180, arc:  90, turns:    0 }],
        4: [{ plane: 180, arc:  90, turns:    0 }, { plane:   0, arc:  90, turns:    0 }],
        5: [{ plane: 180, arc:  90, turns:    0 }, { plane: 180, arc:  90, turns: -180 }],
        6: [{ plane: 180, arc:  90, turns:    0 }, { plane:   0, arc:  90, turns: -180 }],
      },
      // Use the inside 1:3 values, with row 4's second prop ending on plane 0.
      '1:3': {
        1: [{ plane: 180, arc:  90, turns:  180 }, { plane: 180, arc:  90, turns:  180 }],
        2: [{ plane: 180, arc:  90, turns:  180 }, { plane:   0, arc:  90, turns:  180 }],
        3: [{ plane: 180, arc:  90, turns: -360 }, { plane: 180, arc:  90, turns: -360 }],
        4: [{ plane: 180, arc:  90, turns: -360 }, { plane:   0, arc:  90, turns: -360 }],
        5: [{ plane: 180, arc:  90, turns:  180 }, { plane: 180, arc:  90, turns: -360 }],
        6: [{ plane: 180, arc:  90, turns:  180 }, { plane:   0, arc:  90, turns: -360 }],
      },
      // Use the inside 1:5 values, with row 4's second prop ending on plane 0.
      '1:5': {
        1: [{ plane: 180, arc:  90, turns: -540 }, { plane: 180, arc:  90, turns: -540 }],
        2: [{ plane: 180, arc:  90, turns: -540 }, { plane:   0, arc:  90, turns: -540 }],
        3: [{ plane: 180, arc:  90, turns:  360 }, { plane: 180, arc:  90, turns:  360 }],
        4: [{ plane: 180, arc:  90, turns:  360 }, { plane:   0, arc:  90, turns:  360 }],
        5: [{ plane: 180, arc:  90, turns:  360 }, { plane: 180, arc:  90, turns: -540 }],
        6: [{ plane: 180, arc:  90, turns:  360 }, { plane:   0, arc:  90, turns: -540 }],
      },
    },
  },
  // Row 4 pairs a backward plane path with a forward arc path and owns every continuation.
  4: {
    starts: [{ plane: 180, arc:  90, turns: -180 }, { plane:   0, arc:  90, turns:  180 }],
    columnsBySpeedRatio: {
      // At 1:1, the paired turn values are -180 and the explicit still value 0.
      '1:1': {
        1: [{ plane: 180, arc:  90, turns: -180 }, { plane: 180, arc:  90, turns: -180 }],
        2: [{ plane: 180, arc:  90, turns: -180 }, { plane:   0, arc:  90, turns: -180 }],
        3: [{ plane: 180, arc:  90, turns:    0 }, { plane: 180, arc:  90, turns:    0 }],
        4: [{ plane: 180, arc:  90, turns:    0 }, { plane:   0, arc:  90, turns:    0 }],
        5: [{ plane: 180, arc:  90, turns:    0 }, { plane: 180, arc:  90, turns: -180 }],
        6: [{ plane: 180, arc:  90, turns:    0 }, { plane:   0, arc:  90, turns: -180 }],
      },
      // At 1:3, the paired turn values advance to 180 and -360.
      '1:3': {
        1: [{ plane: 180, arc:  90, turns:  180 }, { plane: 180, arc:  90, turns:  180 }],
        2: [{ plane: 180, arc:  90, turns:  180 }, { plane:   0, arc:  90, turns:  180 }],
        3: [{ plane: 180, arc:  90, turns: -360 }, { plane: 180, arc:  90, turns: -360 }],
        4: [{ plane: 180, arc:  90, turns: -360 }, { plane:   0, arc:  90, turns: -360 }],
        5: [{ plane: 180, arc:  90, turns:  180 }, { plane: 180, arc:  90, turns: -360 }],
        6: [{ plane: 180, arc:  90, turns:  180 }, { plane:   0, arc:  90, turns: -360 }],
      },
      // At 1:5, the paired turn values advance to -540 and 360.
      '1:5': {
        1: [{ plane: 180, arc:  90, turns: -540 }, { plane: 180, arc:  90, turns: -540 }],
        2: [{ plane: 180, arc:  90, turns: -540 }, { plane:   0, arc:  90, turns: -540 }],
        3: [{ plane: 180, arc:  90, turns:  360 }, { plane: 180, arc:  90, turns:  360 }],
        4: [{ plane: 180, arc:  90, turns:  360 }, { plane:   0, arc:  90, turns:  360 }],
        5: [{ plane: 180, arc:  90, turns:  360 }, { plane: 180, arc:  90, turns: -540 }],
        6: [{ plane: 180, arc:  90, turns:  360 }, { plane:   0, arc:  90, turns: -540 }],
      },
    },
  },
  // Row 5 starts with two arc paths and defines Spin/Anti alternatives for rows 5 and 6.
  5: {
    starts: [{ plane:   0, arc:  90, turns:    0 }, { plane:   0, arc:  90, turns:  180 }],
    columnsBySpeedRatio: {
      // The 1:1 endpoints use 0 and -180.
      '1:1': {
        1: [{ plane:   0, arc:  90, turns:    0 }, { plane:   0, arc:  90, turns: -180 }],
        2: [{ plane:   0, arc:  90, turns:    0 }, { plane: 180, arc:  90, turns: -180 }],
        3: [{ plane:   0, arc:  90, turns: -180 }, { plane:   0, arc:  90, turns:    0 }],
        4: [{ plane:   0, arc:  90, turns: -180 }, { plane: 180, arc:  90, turns:    0 }],
        5: {
          spin: [{ plane:   0, arc:  90, turns:    0 }, { plane:   0, arc:  90, turns:    0 }],
          anti: [{ plane: 180, arc:  90, turns: -180 }, { plane: 180, arc:  90, turns: -180 }],
        },
        6: {
          spin: [{ plane:   0, arc:  90, turns:    0 }, { plane: 180, arc:  90, turns:    0 }],
          anti: [{ plane:   0, arc:  90, turns: -180 }, { plane: 180, arc:  90, turns: -180 }],
        },
      },
      // The 1:3 endpoints use -360 and 180 with matching Spin/Anti alternatives.
      '1:3': {
        1: [{ plane:   0, arc:  90, turns: -360 }, { plane:   0, arc:  90, turns:  180 }],
        2: [{ plane:   0, arc:  90, turns: -360 }, { plane: 180, arc:  90, turns:  180 }],
        3: [{ plane:   0, arc:  90, turns:  180 }, { plane:   0, arc:  90, turns: -360 }],
        4: [{ plane:   0, arc:  90, turns:  180 }, { plane: 180, arc:  90, turns: -360 }],
        5: {
          spin: [{ plane:   0, arc:  90, turns:  180 }, { plane:   0, arc:  90, turns:  180 }],
          anti: [{ plane: 180, arc:  90, turns: -360 }, { plane: 180, arc:  90, turns: -360 }],
        },
        6: {
          spin: [{ plane:   0, arc:  90, turns:  180 }, { plane: 180, arc:  90, turns:  180 }],
          anti: [{ plane:   0, arc:  90, turns: -360 }, { plane: 180, arc:  90, turns: -360 }],
        },
      },
      // The 1:5 endpoints use 360 and -540 with matching Spin/Anti alternatives.
      '1:5': {
        1: [{ plane:   0, arc:  90, turns:  360 }, { plane:   0, arc:  90, turns: -540 }],
        2: [{ plane:   0, arc:  90, turns:  360 }, { plane: 180, arc:  90, turns: -540 }],
        3: [{ plane:   0, arc:  90, turns: -540 }, { plane:   0, arc:  90, turns:  360 }],
        4: [{ plane:   0, arc:  90, turns: -540 }, { plane: 180, arc:  90, turns:  360 }],
        5: {
          spin: [{ plane:   0, arc:  90, turns:  360 }, { plane:   0, arc:  90, turns:  360 }],
          anti: [{ plane: 180, arc:  90, turns: -540 }, { plane: 180, arc:  90, turns: -540 }],
        },
        6: {
          spin: [{ plane:   0, arc:  90, turns:  360 }, { plane: 180, arc:  90, turns:  360 }],
          anti: [{ plane:   0, arc:  90, turns: -540 }, { plane: 180, arc:  90, turns: -540 }],
        },
      },
    },
  },
  // Row 6 mirrors column 5's roles.
  6: {
    starts: [{ plane: 180, arc:  90, turns:  180 }, { plane:   0, arc:  90, turns:    0 }],
    swapProps: true,
    columnsBySpeedRatio: {
      // The 1:1 endpoints use -180 and the still value 0.
      '1:1': {
        1: [{ plane:   0, arc:  90, turns: -180 }, { plane:   0, arc:  90, turns:    0 }],
        2: [{ plane: 180, arc:  90, turns: -180 }, { plane:   0, arc:  90, turns:    0 }],
        3: [{ plane:   0, arc:  90, turns:    0 }, { plane:   0, arc:  90, turns: -180 }],
        4: [{ plane: 180, arc:  90, turns:    0 }, { plane:   0, arc:  90, turns: -180 }],
        5: {
          spin: [{ plane:   0, arc:  90, turns:    0 }, { plane:   0, arc:  90, turns:    0 }],
          anti: [{ plane:   0, arc:  90, turns: -180 }, { plane:   0, arc:  90, turns: -180 }],
        },
        6: {
          spin: [{ plane: 180, arc:  90, turns:    0 }, { plane:   0, arc:  90, turns:    0 }],
          anti: [{ plane: 180, arc:  90, turns: -180 }, { plane:   0, arc:  90, turns: -180 }],
        },
      },
      // The 1:3 endpoints use 180 and -360.
      '1:3': {
        1: [{ plane:   0, arc:  90, turns:  180 }, { plane:   0, arc:  90, turns: -360 }],
        2: [{ plane: 180, arc:  90, turns:  180 }, { plane:   0, arc:  90, turns: -360 }],
        3: [{ plane:   0, arc:  90, turns: -360 }, { plane:   0, arc:  90, turns:  180 }],
        4: [{ plane: 180, arc:  90, turns: -360 }, { plane:   0, arc:  90, turns:  180 }],
        5: {
          spin: [{ plane:   0, arc:  90, turns:  180 }, { plane:   0, arc:  90, turns:  180 }],
          anti: [{ plane:   0, arc:  90, turns: -360 }, { plane:   0, arc:  90, turns: -360 }],
        },
        6: {
          spin: [{ plane: 180, arc:  90, turns:  180 }, { plane:   0, arc:  90, turns:  180 }],
          anti: [{ plane: 180, arc:  90, turns: -360 }, { plane:   0, arc:  90, turns: -360 }],
        },
      },
      // The 1:5 endpoints use -540 and 360.
      '1:5': {
        1: [{ plane:   0, arc:  90, turns: -540 }, { plane:   0, arc:  90, turns:  360 }],
        2: [{ plane: 180, arc:  90, turns: -540 }, { plane:   0, arc:  90, turns:  360 }],
        3: [{ plane:   0, arc:  90, turns:  360 }, { plane:   0, arc:  90, turns: -540 }],
        4: [{ plane: 180, arc:  90, turns:  360 }, { plane:   0, arc:  90, turns: -540 }],
        5: {
          spin: [{ plane:   0, arc:  90, turns:  360 }, { plane:   0, arc:  90, turns:  360 }],
          anti: [{ plane:   0, arc:  90, turns: -540 }, { plane:   0, arc:  90, turns: -540 }],
        },
        6: {
          spin: [{ plane: 180, arc:  90, turns:  360 }, { plane:   0, arc:  90, turns:  360 }],
          anti: [{ plane: 180, arc:  90, turns: -540 }, { plane:   0, arc:  90, turns: -540 }],
        },
      },
    },
  },
}

const ruleNumbers = [1, 2, 3, 4, 5, 6] as const
const catalog: Partial<Record<VtgCellReference, Readonly<VtgPatternDefinition>>> = {}

for (const row of ruleNumbers) {
  for (const column of ruleNumbers) {
    const reference: VtgCellReference = `${column}-${row}`
    catalog[reference] = {
      patternsBySpeedRatio: createPatternBuilders(rowPatterns[row], column),
    }
  }
}

export const vtgRowPatterns: Readonly<
  Partial<Record<VtgCellReference, Readonly<VtgPatternDefinition>>>
> = catalog
