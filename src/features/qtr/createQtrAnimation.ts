import { applyQtrStartingPosition } from '@/features/qtr/math/applyQtrStartingPosition'
import type { QtrPatternSelection } from '@/features/qtr/types'
import type { VtgPatternSelection } from '@/features/vtg/types'
import {
  createDefaultVtgAnimation,
  createVtgAnimation,
  toVtgPreviewAnimation,
} from '@/features/vtg/createVtgAnimation'
import type { RootDataFinal } from '@/types/AnimTypes'

const toQtrVtgSelection = (selection: QtrPatternSelection): VtgPatternSelection => {
  const { beat: _beat, quarters: _quarters, ...vtgSelection } = selection
  return vtgSelection
}

export const createQtrAnimation = (
  current: RootDataFinal,
  selection: QtrPatternSelection,
): RootDataFinal | undefined => {
  const animation = createVtgAnimation(current, toQtrVtgSelection(selection))
  return animation
    ? applyQtrStartingPosition(animation, selection.beat ?? 1, selection.swapProps === true)
    : undefined
}

export const createDefaultQtrAnimation = (
  selection: QtrPatternSelection,
): RootDataFinal | undefined => {
  const animation = createDefaultVtgAnimation(toQtrVtgSelection(selection))
  return animation
    ? applyQtrStartingPosition(animation, selection.beat ?? 1, selection.swapProps === true)
    : undefined
}

export const createQtrPreviewAnimation = (
  selection: QtrPatternSelection,
): RootDataFinal | undefined => {
  const animation = createDefaultQtrAnimation(selection)
  return animation ? toVtgPreviewAnimation(animation) : undefined
}
