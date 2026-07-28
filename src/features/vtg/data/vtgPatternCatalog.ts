import { vtgFirstRowPatterns } from '@/features/vtg/data/patterns/firstRow'
import type {
  VtgCellReference,
  VtgPatternDefinition,
  VtgPatternSelection,
} from '@/features/vtg/types'

const catalog: Readonly<Partial<Record<VtgCellReference, Readonly<VtgPatternDefinition>>>> = {
  ...vtgFirstRowPatterns,
}

export const getVtgPatternDefinition = (
  selection: VtgPatternSelection,
): Readonly<VtgPatternDefinition> | undefined => catalog[selection.reference]
