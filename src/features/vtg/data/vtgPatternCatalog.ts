import { vtgColumnPatterns } from '@/features/vtg/data/patterns/columns'
import type {
  VtgCellReference,
  VtgPatternDefinition,
  VtgPatternSelection,
} from '@/features/vtg/types'

const catalog: Readonly<Partial<Record<VtgCellReference, Readonly<VtgPatternDefinition>>>> = {
  ...vtgColumnPatterns,
}

export const getVtgPatternDefinition = (
  selection: VtgPatternSelection,
): Readonly<VtgPatternDefinition> | undefined => catalog[selection.reference]
