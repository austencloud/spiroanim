import { vtgPlayerSettings } from '@/features/vtg/data/vtgPlayerSettings'
import type {
  VtgCellReference,
  VtgPatternDefinition,
  VtgReadableAnimation,
  VtgRuleNumber,
} from '@/features/vtg/types'
import type { AnimReadable } from '@/types/AnimTypes'

type VtgPropPair = readonly [AnimReadable, AnimReadable]

interface VtgSpinAntiPair {
  spin: VtgPropPair
  anti: VtgPropPair
}

type VtgCellPattern = VtgPropPair | VtgSpinAntiPair
type VtgRowPatterns = Readonly<Record<VtgRuleNumber, VtgCellPattern>>

interface VtgColumnPattern {
  starts: VtgPropPair
  rows: VtgRowPatterns
  swapProps?: boolean
}

const arc = { arc: 90 } as const satisfies AnimReadable
const arcStill = { arc: 90, turns: 0 } as const satisfies AnimReadable
const arcBack = { arc: 90, turns: -180 } as const satisfies AnimReadable
const arcForward = { arc: 90, turns: 180 } as const satisfies AnimReadable
const plane = { plane: 180, arc: 90 } as const satisfies AnimReadable
const planeStill = { plane: 180, arc: 90, turns: 0 } as const satisfies AnimReadable
const planeBack = { plane: 180, arc: 90, turns: -180 } as const satisfies AnimReadable
const planeForward = { plane: 180, arc: 90, turns: 180 } as const satisfies AnimReadable
const zeroPlane = { plane: 0, arc: 90 } as const satisfies AnimReadable
const zeroPlaneStill = { plane: 0, arc: 90, turns: 0 } as const satisfies AnimReadable

const outsideColumnRows = {
  1: [plane, plane],
  2: [plane, arc],
  3: [planeBack, planeBack],
  4: [planeBack, arcBack],
  5: [plane, planeBack],
  6: [plane, arcBack],
} as const satisfies VtgRowPatterns

const insideColumnRows = {
  1: [planeBack, planeBack],
  2: [planeBack, arcBack],
  3: [planeStill, planeStill],
  4: [planeStill, arcStill],
  5: [planeStill, planeBack],
  6: [planeStill, arcBack],
} as const satisfies VtgRowPatterns

const createPattern = (
  column: VtgColumnPattern,
  row: VtgRuleNumber,
  isAnti: boolean,
): VtgReadableAnimation => {
  const rowPattern = column.rows[row]
  const continuations =
    'spin' in rowPattern ? (isAnti ? rowPattern.anti : rowPattern.spin) : rowPattern
  const firstProp = { anim: [column.starts[0], continuations[0]] }
  const secondProp = { anim: [column.starts[1], continuations[1]] }

  return {
    ...vtgPlayerSettings,
    props: column.swapProps ? [secondProp, firstProp] : [firstProp, secondProp],
  }
}

/**
 * A VTG reference stores the column first and row second. Every cell in a
 * column shares the same first animation frame for each prop. Each row entry
 * supplies the second frames, and only the four special cells define explicit
 * Spin/Anti variants.
 */
const columnPatterns: Readonly<Record<VtgRuleNumber, VtgColumnPattern>> = {
  1: {
    starts: [plane, plane],
    rows: outsideColumnRows,
  },
  2: {
    starts: [plane, zeroPlane],
    rows: outsideColumnRows,
  },
  3: {
    starts: [planeBack, planeForward],
    rows: {
      ...insideColumnRows,
      4: [planeStill, zeroPlaneStill],
    },
  },
  4: {
    starts: [planeBack, arcForward],
    rows: insideColumnRows,
  },
  5: {
    starts: [arc, arcForward],
    rows: {
      1: [arc, arcBack],
      2: [arc, planeBack],
      3: [arcBack, arcStill],
      4: [arcBack, planeStill],
      5: {
        spin: [arc, arcStill],
        anti: [planeBack, planeBack],
      },
      6: {
        spin: [arc, planeStill],
        anti: [arcBack, planeBack],
      },
    },
  },
  6: {
    starts: [planeForward, arc],
    swapProps: true,
    rows: {
      1: [arcBack, arcStill],
      2: [planeBack, arcStill],
      3: [arcStill, arcBack],
      4: [planeStill, arcBack],
      5: {
        spin: [arcStill, arcStill],
        anti: [arcBack, arcBack],
      },
      6: {
        spin: [planeStill, arcStill],
        anti: [planeBack, arcBack],
      },
    },
  },
}

const rowLabels: Readonly<Record<VtgRuleNumber, readonly string[]>> = {
  6: ['SO/TS', 'SS/TO', 'SO/TS', 'SS/TO', 'SO/TO', 'SS/TS'],
  5: ['TS/SO', 'TO/SS', 'TS/SO', 'TO/SS', 'TS/SS', 'TO/SO'],
  4: ['SO/SO', 'SS/SS', 'SO/SO', 'SS/SS', 'SO/SS', 'SS/SO'],
  3: ['TS/TS', 'TO/TO', 'TS/TS', 'TO/TO', 'TS/TO', 'TO/TS'],
  2: ['SO/SO', 'SS/SS', 'SO/SO', 'SS/SS', 'SO/SS', 'SS/SO'],
  1: ['TS/TS', 'TO/TO', 'TS/TS', 'TO/TO', 'TS/TO', 'TO/TS'],
}

const ruleNumbers = [1, 2, 3, 4, 5, 6] as const
const catalog: Partial<Record<VtgCellReference, Readonly<VtgPatternDefinition>>> = {}

for (const row of ruleNumbers) {
  for (const column of ruleNumbers) {
    const reference: VtgCellReference = `${column}-${row}`
    const label = rowLabels[row][column - 1]
    if (label === undefined) throw new Error(`Missing VTG label for ${reference}`)

    catalog[reference] = {
      label,
      patternsBySpeedRatio: {
        '1:1': (selection) => createPattern(columnPatterns[column], row, selection.isAnti === true),
      },
    }
  }
}

export const vtgColumnPatterns: Readonly<
  Partial<Record<VtgCellReference, Readonly<VtgPatternDefinition>>>
> = catalog
