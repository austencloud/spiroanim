import { vtgPlayerSettings } from '@/features/vtg/data/vtgPlayerSettings'
import type {
  VtgCellReference,
  VtgPatternDefinition,
  VtgReadableAnimation,
} from '@/features/vtg/types'
import type { AnimReadable } from '@/types/AnimTypes'

type VtgRowPatterns = Readonly<Partial<Record<VtgCellReference, Readonly<VtgPatternDefinition>>>>
type VtgPropFrames = readonly [AnimReadable, AnimReadable]
type VtgPatternFrames = readonly [VtgPropFrames, VtgPropFrames]
type VtgStartingFrames = readonly [AnimReadable, AnimReadable]

const firstPairGreenFrames: VtgPropFrames = [
  { plane: -180, arc: 90, scale: 10 },
  { plane: 180, arc: 90 },
]

const secondPairStarts: VtgStartingFrames = [
  { arc: 180, turns: -180, scale: 10 },
  { plane: 180, arc: 0, scale: 10 },
]

const createFirstRowPattern = (frames: VtgPatternFrames): VtgReadableAnimation => {
  const [firstPropFrames, secondPropFrames] = frames

  return {
    ...vtgPlayerSettings,
    props: [{ anim: [...firstPropFrames] }, { anim: [...secondPropFrames] }],
  }
}

const createCellPattern = (
  starts: VtgStartingFrames,
  continuations: readonly [AnimReadable, AnimReadable],
): VtgReadableAnimation =>
  createFirstRowPattern([
    [starts[0], continuations[0]],
    [starts[1], continuations[1]],
  ])

/**
 * Visual row 1 patterns. The VTG reference uses the bottom rule first and
 * left rule second, so its first cell is `1-6`.
 *
 * Each cell defines values by speed ratio. Unsupported ratios remain absent
 * and therefore do not replace the current player animation.
 */
export const vtgFirstRowPatterns = {
  '1-6': {
    label: 'SO/TS',
    patternsBySpeedRatio: {
      '1:1': () =>
        createFirstRowPattern([
          firstPairGreenFrames,
          [
            { plane: 180, arc: 90, scale: 10 },
            { arc: 90, turns: -180 },
          ],
        ]),
    },
  },
  '2-6': {
    label: 'SS/TO',
    patternsBySpeedRatio: {
      '1:1': () =>
        createFirstRowPattern([
          firstPairGreenFrames,
          [
            { plane: 0, arc: 90 },
            { arc: 90, turns: -180 },
          ],
        ]),
    },
  },
  '3-6': {
    label: 'SO/TS',
    patternsBySpeedRatio: {
      '1:1': () =>
        createCellPattern(secondPairStarts, [
          { arc: 90, turns: 0 },
          { arc: 90, turns: -180 },
        ]),
    },
  },
  '4-6': {
    label: 'SS/TO',
    patternsBySpeedRatio: {
      '1:1': () =>
        createCellPattern(secondPairStarts, [
          { arc: 90, turns: 0 },
          { plane: 180, arc: 90, turns: -180 },
        ]),
    },
  },
} satisfies VtgRowPatterns
