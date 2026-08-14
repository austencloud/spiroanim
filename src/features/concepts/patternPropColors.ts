import { COLORS } from '@/domain/animation/AnimStruct'
import type { ColorInd, RootDataFinal } from '@/types/AnimTypes'

export type PatternPropColor = (typeof COLORS)[number]

export interface PatternPropColorSelection {
  propColors?: readonly [PatternPropColor, PatternPropColor]
}

export const defaultPatternPropColors = ['Cyan', 'Green'] as const satisfies readonly [
  PatternPropColor,
  PatternPropColor,
]

const patternPropColorIndices: Record<PatternPropColor, ColorInd> = {
  Red: 0,
  Green: 1,
  Blue: 2,
  Yellow: 3,
  Cyan: 4,
  Magenta: 5,
  Orange: 6,
}

export const applyPatternPropColors = (
  animation: RootDataFinal,
  selection: PatternPropColorSelection,
): RootDataFinal => {
  if (!selection.propColors) return animation

  return {
    ...animation,
    props: animation.props.map((prop, index) => {
      const color = selection.propColors?.[index]
      return color === undefined ? prop : { ...prop, color: patternPropColorIndices[color] }
    }),
  }
}
