import { vtgPlayerSettings } from '@/features/vtg/data/vtgPlayerSettings'
import type {
  VtgCellReference,
  VtgPatternDefinition,
  VtgReadableAnimation,
  VtgRuleNumber,
} from '@/features/vtg/types'
import type { AnimReadable } from '@/types/AnimTypes'

type VtgPropPair = readonly [AnimReadable, AnimReadable]

interface VtgColumnPattern {
  starts: VtgPropPair
  spin: VtgPropPair
  anti?: VtgPropPair
  rows?: Readonly<Partial<Record<VtgRuleNumber, { spin: VtgPropPair; anti?: VtgPropPair }>>>
}

const createPattern = (
  column: VtgColumnPattern,
  row: VtgRuleNumber,
  isAnti: boolean,
): VtgReadableAnimation => {
  const rowPattern = column.rows?.[row]
  const spin = rowPattern?.spin ?? column.spin
  const anti = rowPattern?.anti ?? column.anti
  const continuations = isAnti && anti ? anti : spin

  return {
    ...vtgPlayerSettings,
    props: [
      { anim: [column.starts[0], continuations[0]] },
      { anim: [column.starts[1], continuations[1]] },
    ],
  }
}

/**
 * A VTG reference stores the column first and row second. Every cell in a
 * column shares the same first animation frame for each prop. Until the
 * remaining cell continuations are defined, every row also reuses its top
 * cell's second frames.
 *
 * Only the four Spin/Anti cells expose the column's Anti continuation.
 */
const columnPatterns: Readonly<Record<VtgRuleNumber, VtgColumnPattern>> = {
  1: {
    starts: [
      { plane: 180, arc: 90 },
      { plane: 180, arc: 90 },
    ],
    spin: [
      { plane: 180, arc: 90 },
      { arc: 90, turns: -180 },
    ],
    rows: {
      5: {
        spin: [
          { plane: 180, arc: 90 },
          { plane: 180, arc: 90, turns: -180 },
        ],
      },
    },
  },
  2: {
    starts: [
      { plane: 180, arc: 90 },
      { plane: 0, arc: 90 },
    ],
    spin: [
      { plane: 180, arc: 90 },
      { arc: 90, turns: -180 },
    ],
    rows: {
      5: {
        spin: [
          { plane: 180, arc: 90 },
          { plane: 180, arc: 90, turns: -180 },
        ],
      },
    },
  },
  3: {
    starts: [
      { plane: 180, arc: 90, turns: -180 },
      { plane: 180, arc: 90, turns: 180 },
    ],
    spin: [
      { plane: 180, arc: 90, turns: 0 },
      { arc: 90, turns: -180 },
    ],
    rows: {
      5: {
        spin: [
          { plane: 180, arc: 90, turns: 0 },
          { plane: 180, arc: 90, turns: -180 },
        ],
      },
    },
  },
  4: {
    starts: [
      { plane: 180, arc: 90, turns: -180 },
      { arc: 90, turns: 180 },
    ],
    spin: [
      { plane: 180, arc: 90, turns: 0 },
      { arc: 90, turns: -180 },
    ],
    rows: {
      5: {
        spin: [
          { plane: 180, arc: 90, turns: 0 },
          { plane: 180, arc: 90, turns: -180 },
        ],
      },
    },
  },
  5: {
    starts: [{ arc: 90 }, { arc: 90, turns: 180 }],
    spin: [{ arc: 90 }, { plane: 180, arc: 90, turns: 0 }],
    anti: [
      { arc: 90, turns: -180 },
      { plane: 180, arc: 90, turns: -180 },
    ],
    rows: {
      5: {
        spin: [{ arc: 90 }, { arc: 90, turns: 0 }],
        anti: [
          { plane: 180, arc: 90, turns: -180 },
          { plane: 180, arc: 90, turns: -180 },
        ],
      },
    },
  },
  6: {
    starts: [{ plane: 180, arc: 90, turns: 180 }, { arc: 90 }],
    spin: [
      { plane: 180, arc: 90, turns: 0 },
      { arc: 90, turns: 0 },
    ],
    anti: [
      { plane: 180, arc: 90, turns: -180 },
      { arc: 90, turns: -180 },
    ],
    rows: {
      5: {
        spin: [
          { arc: 90, turns: 0 },
          { arc: 90, turns: 0 },
        ],
        anti: [
          { arc: 90, turns: -180 },
          { arc: 90, turns: -180 },
        ],
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

const antiCells: ReadonlySet<VtgCellReference> = new Set(['5-6', '6-6', '5-5', '6-5'])
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
        '1:1': (selection) =>
          createPattern(
            columnPatterns[column],
            row,
            antiCells.has(reference) && selection.isAnti === true,
          ),
      },
    }
  }
}

export const vtgColumnPatterns: Readonly<
  Partial<Record<VtgCellReference, Readonly<VtgPatternDefinition>>>
> = catalog
