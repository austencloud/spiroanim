import {
  useConceptPreviewRenderer,
  type ConceptPreviewDimensions,
} from '@/features/concepts/composables/useConceptPreviewRenderer'
import { createQtrPreviewAnimation } from '@/features/qtr/createQtrAnimation'
import type { QtrMode, QtrPatternSelection } from '@/features/qtr/types'
import { createVtgPreviewAnimation } from '@/features/vtg/createVtgAnimation'
import type {
  VtgBeat,
  VtgCellReference,
  VtgPatternSelection,
  VtgSpeedRatio,
} from '@/features/vtg/types'
import type { PatternShape } from '@/types/PatternTypes'

interface UseVtgPreviewsOptions {
  dimensions: readonly ConceptPreviewDimensions[]
  speedRatio: Ref<VtgSpeedRatio>
  isAnti: Ref<boolean>
  swapProps: Ref<boolean>
  reversePlane: Ref<boolean>
  shape: Ref<PatternShape>
  beat: Ref<VtgBeat>
  double: Ref<boolean>
  scale: Ref<number>
  quarters: Ref<QtrMode | false>
}

export const patternPreviewReferences = [
  '1-1',
  '3-1',
  '5-1',
  '1-3',
  '3-3',
  '5-3',
  '1-5',
  '3-5',
  '5-5',
] as const satisfies readonly VtgCellReference[]

const spinToggleCells: ReadonlySet<VtgCellReference> = new Set(['5-6', '6-6', '5-5', '6-5'])
const spinPreviewIndexes = patternPreviewReferences.flatMap((reference, index) =>
  spinToggleCells.has(reference) ? [index] : [],
)

export const usePatternPreviews = ({
  dimensions,
  speedRatio,
  isAnti,
  swapProps,
  reversePlane,
  shape,
  beat,
  double,
  scale,
  quarters,
}: UseVtgPreviewsOptions) => {
  const buildSelection = (
    reference: VtgCellReference,
  ): VtgPatternSelection | QtrPatternSelection => {
    const selection: VtgPatternSelection = {
      reference,
      speedRatio: speedRatio.value,
      scale: scale.value,
    }

    if (spinToggleCells.has(reference)) selection.isAnti = isAnti.value
    if (swapProps.value) selection.swapProps = true
    if (reversePlane.value) selection.reversePlane = true
    if (shape.value === 'box') selection.shape = shape.value
    if (beat.value !== 1) selection.beat = beat.value
    if (double.value) selection.double = true
    return quarters.value ? { ...selection, quarters: quarters.value } : selection
  }

  const renderer = useConceptPreviewRenderer({
    dimensions,
    references: patternPreviewReferences,
    label: 'VTG',
    partialIndexes: spinPreviewIndexes,
    createAnimation: (reference) => {
      const selection = buildSelection(reference)
      return 'quarters' in selection
        ? createQtrPreviewAnimation(selection)
        : createVtgPreviewAnimation(selection)
    },
  })

  // BPM changes animation timing only, so it intentionally does not invalidate still previews.
  watch(
    [speedRatio, swapProps, reversePlane, shape, beat, double, scale, quarters],
    renderer.requestPreviews,
  )
  watch(isAnti, renderer.requestPartialPreviews)

  return {
    previewUrls: renderer.previewUrls,
    requestPreviews: renderer.requestPreviews,
  }
}
