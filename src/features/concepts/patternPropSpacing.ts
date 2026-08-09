import { vtgSpacingControl } from '@/features/vtg/data/vtgPlayerSettings'
import type { MotionData, PropReadable } from '@/types/AnimTypes'

export interface PatternPropSpacingSelection {
  spacing?: number
}

const createHorizontalMotion = (move: number): MotionData[] =>
  move === 0
    ? []
    : [
        {
          precision: true,
          arc: 90,
          plane: move < 0 ? 180 : 0,
          distance: Math.abs(move),
        },
      ]

export const getPatternPropMoves = (
  spacing: number = vtgSpacingControl.default,
): readonly [number, number] => {
  const clampedSpacing = Math.min(
    vtgSpacingControl.max,
    Math.max(vtgSpacingControl.min, Math.round(spacing)),
  )

  const rightMove = Math.floor(clampedSpacing / 2)
  return [Math.ceil(clampedSpacing / 2), rightMove === 0 ? 0 : -rightMove]
}

export const applyPatternPropSpacing = (
  props: readonly PropReadable[],
  selection: PatternPropSpacingSelection,
): PropReadable[] => {
  const moves = getPatternPropMoves(selection.spacing)
  return props.map((prop, index) => ({
    ...prop,
    motion: createHorizontalMotion(moves[index] ?? 0),
  }))
}
