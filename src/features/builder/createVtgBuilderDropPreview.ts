import {
  appendVtgBuilderPattern,
  insertVtgBuilderPattern,
} from '@/features/builder/appendVtgBuilderPattern'
import type { VtgBuilderPatternSelection } from '@/features/builder/types'
import { createDefaultVtgAnimation } from '@/features/vtg/createVtgAnimation'
import { createDefaultQtrAnimation } from '@/features/vtg/qtr/createQtrAnimation'
import { createVtgTransitionPreviewAnimations } from '@/features/vtg/math/createVtgTransitionQuickSlotAnimations'
import { prepareVtg45TransitionPattern } from '@/features/vtg/math/prepareVtg45TransitionPattern'
import type { RootDataFinal } from '@/types/AnimTypes'

/** Builds the portion a VTG selection would create at one Builder drop target. */
export const createVtgBuilderDropPreview = (
  source: RootDataFinal,
  selection: VtgBuilderPatternSelection,
  targetIndex: number,
): RootDataFinal | undefined => {
  if (targetIndex === 0) {
    return 'quarters' in selection
      ? createDefaultQtrAnimation(selection)
      : createDefaultVtgAnimation(selection)
  }

  const prepared = prepareVtg45TransitionPattern(source)
  if (!prepared.supported) return undefined
  const previewCount = createVtgTransitionPreviewAnimations(prepared.pattern)?.length
  if (previewCount === undefined || targetIndex > previewCount) return undefined

  const updated =
    targetIndex === previewCount
      ? appendVtgBuilderPattern(prepared.pattern, selection)
      : insertVtgBuilderPattern(prepared.pattern, selection, targetIndex)
  return updated === undefined
    ? undefined
    : createVtgTransitionPreviewAnimations(updated)?.[targetIndex]
}
