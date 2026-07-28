import { vtgPlayerSettings } from '@/features/vtg/data/vtgPlayerSettings'
import type {
  VtgCellReference,
  VtgPatternDefinition,
  VtgReadableAnimation,
  VtgSpeedRatio,
} from '@/features/vtg/types'
import type { AnimReadable } from '@/types/AnimTypes'

type VtgRowPatterns = Readonly<Partial<Record<VtgCellReference, Readonly<VtgPatternDefinition>>>>

const firstRowStartingFrames: readonly [AnimReadable, AnimReadable] = [
  { arc: 180, scale: 10 },
  { plane: 180, arc: 0, turns: 180, scale: 10 },
]

const createFirstRowPattern = (
  continuations: readonly [AnimReadable, AnimReadable],
): VtgReadableAnimation => {
  const [firstStart, secondStart] = firstRowStartingFrames

  return {
    ...vtgPlayerSettings,
    props: [
      {
        anim: [firstStart, continuations[0]],
      },
      {
        anim: [secondStart, continuations[1]],
      },
    ],
  }
}

/**
 * Visual row 1 patterns. The VTG reference uses the bottom rule first and
 * left rule second, so its first cell is `1-6`.
 *
 * Speed ratio is deliberately passed through the builder even though the
 * first pattern does not transform it yet.
 */
export const vtgFirstRowPatterns = {
  '1-6': {
    label: 'SO/TS',
    build: (_speedRatio: VtgSpeedRatio) =>
      createFirstRowPattern([{ arc: 90 }, { arc: 90, turns: -180 }]),
  },
} satisfies VtgRowPatterns
