import { createEightStepAnimation } from '@/features/eight-step/createEightStepAnimation'
import { createQstAnimation } from '@/features/quarter-space-tech/createQstAnimation'
import {
  isEightStepPatternSelection,
  isQstPatternSelection,
  isQtrPatternSelection,
} from '@/features/concepts/types'
import type { ConceptPatternSelection } from '@/features/concepts/types'
import { createQtrAnimation } from '@/features/vtg/qtr/createQtrAnimation'
import { createVtgAnimation } from '@/features/vtg/createVtgAnimation'
import type { RootDataFinal } from '@/types/AnimTypes'

export const applyConceptPattern = (
  root: RootDataFinal,
  selection: ConceptPatternSelection,
): RootDataFinal | undefined =>
  isEightStepPatternSelection(selection)
    ? createEightStepAnimation(root, selection)
    : isQstPatternSelection(selection)
      ? createQstAnimation(root, selection)
      : isQtrPatternSelection(selection)
        ? createQtrAnimation(root, selection)
        : createVtgAnimation(root, selection)
