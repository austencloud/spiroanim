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

const firstPairGreenFrames: VtgPropFrames = [
  { plane: 180, arc: 90 },
  { plane: 180, arc: 90 },
]

const createFirstRowPattern = (frames: VtgPatternFrames): VtgReadableAnimation => {
  const [firstPropFrames, secondPropFrames] = frames

  return {
    ...vtgPlayerSettings,
    props: [{ anim: [...firstPropFrames] }, { anim: [...secondPropFrames] }],
  }
}

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
            { plane: 180, arc: 90 },
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
        createFirstRowPattern([
          [
            { plane: 180, arc: 90, turns: -180 },
            { plane: 180, arc: 90, turns: 0 },
          ],
          [
            { plane: 180, arc: 90, turns: 180 },
            { arc: 90, turns: -180 },
          ],
        ]),
    },
  },
  '4-6': {
    label: 'SS/TO',
    patternsBySpeedRatio: {
      '1:1': () =>
        createFirstRowPattern([
          [
            { plane: 180, arc: 90, turns: -180 },
            { plane: 180, arc: 90, turns: 0 },
          ],
          [
            { arc: 90, turns: 180 },
            { arc: 90, turns: -180 },
          ],
        ]),
    },
  },
  '5-6': {
    label: 'SO/TO',
    patternsBySpeedRatio: {
      '1:1': (selection) =>
        selection.isAnti
          ? createFirstRowPattern([
              [
                { arc: 90 },
                { arc: 90, turns: -180 },
              ],
              [
                { arc: 90, turns: 180 },
                { plane: 180, arc: 90, turns: -180 },
              ],
            ])
          : createFirstRowPattern([
              [{ arc: 90 }, { arc: 90 }],
              [
                { arc: 90, turns: 180 },
                { plane: 180, arc: 90, turns: 0 },
              ],
            ]),
    },
  },
  '6-6': {
    label: 'SS/TS',
    patternsBySpeedRatio: {
      '1:1': (selection) =>
        selection.isAnti
          ? createFirstRowPattern([
              [
                { plane: 180, arc: 90, turns: 180 },
                { plane: 180, arc: 90, turns: -180 },
              ],
              [
                { arc: 90 },
                { arc: 90, turns: -180 },
              ],
            ])
          : createFirstRowPattern([
              [
                { plane: 180, arc: 90, turns: 180 },
                { plane: 180, arc: 90, turns: 0 },
              ],
              [{ arc: 90 }, { arc: 90, turns: 0 }],
            ]),
    },
  },
} satisfies VtgRowPatterns
