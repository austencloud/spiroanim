import { vtgColumnPatterns } from '@/features/vtg/data/patterns/columns'
import type {
  VtgCellReference,
  VtgPatternDefinition,
  VtgPatternSelection,
  VtgReadableAnimation,
} from '@/features/vtg/types'

const catalog: Readonly<Partial<Record<VtgCellReference, Readonly<VtgPatternDefinition>>>> = {
  ...vtgColumnPatterns,
}

export const buildVtgPattern = (
  selection: VtgPatternSelection,
): VtgReadableAnimation | undefined => {
  const buildPattern = catalog[selection.reference]?.patternsBySpeedRatio[selection.speedRatio]
  return buildPattern?.(selection.isAnti === true)
}
