import type { QtrPatternSelection } from '@/features/qtr/types'
import type { VtgPatternSelection } from '@/features/vtg/types'

export const conceptKeys = ['vtg', 'qtr'] as const

export type ConceptKey = (typeof conceptKeys)[number]
export type ConceptPatternSelection = VtgPatternSelection | QtrPatternSelection

export const isVtgPatternSelection = (
  selection: ConceptPatternSelection,
): selection is VtgPatternSelection => !('quarters' in selection)

export const isQtrPatternSelection = (
  selection: ConceptPatternSelection,
): selection is QtrPatternSelection => 'quarters' in selection
