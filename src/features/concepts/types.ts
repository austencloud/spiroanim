import type { EightStepPatternSelection } from '@/features/eight-step/types'
import type { QtrPatternSelection } from '@/features/qtr/types'
import type { VtgPatternSelection } from '@/features/vtg/types'

export const conceptKeys = ['vtg', '8stp'] as const

export type ConceptKey = (typeof conceptKeys)[number]
export type ConceptPatternSelection =
  | VtgPatternSelection
  | QtrPatternSelection
  | EightStepPatternSelection

export const isVtgPatternSelection = (
  selection: ConceptPatternSelection,
): selection is VtgPatternSelection => !('quarters' in selection) && !('concept' in selection)

export const isQtrPatternSelection = (
  selection: ConceptPatternSelection,
): selection is QtrPatternSelection => 'quarters' in selection

export const isEightStepPatternSelection = (
  selection: ConceptPatternSelection,
): selection is EightStepPatternSelection => 'concept' in selection && selection.concept === '8stp'
