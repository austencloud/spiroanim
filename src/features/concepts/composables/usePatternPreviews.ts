import {
  useConceptPreviewRenderer,
  type ConceptPreviewDimensions,
} from '@/features/concepts/composables/useConceptPreviewRenderer'
import { createQtrPreviewAnimation } from '@/features/vtg/qtr/createQtrAnimation'
import type { QtrMode, QtrPatternSelection } from '@/features/vtg/types'
import { createVtgPreviewAnimation } from '@/features/vtg/createVtgAnimation'
import type {
  VtgBeat,
  VtgCellReference,
  VtgPatternSelection,
  VtgSpeedRatio,
  VtgPatternOrientation,
} from '@/features/vtg/types'
import { supportsVtgPatternOrientation } from '@/features/vtg/types'
import type { PatternShape } from '@/types/PatternTypes'
import type { PatternPropColor } from '@/features/concepts/patternPropColors'

interface UseVtgPreviewsOptions {
  dimensions: readonly ConceptPreviewDimensions[]
  speedRatio: Ref<VtgSpeedRatio>
  isAnti: Ref<boolean>
  swapProps: Ref<boolean>
  reversePlane: Ref<boolean>
  shape: Ref<PatternShape>
  beat: Ref<VtgBeat>
  scale: Ref<number>
  spacing: Ref<number>
  quarters: Ref<QtrMode | false>
  leftPropColor: Ref<PatternPropColor>
  rightPropColor: Ref<PatternPropColor>
  orientation: Ref<VtgPatternOrientation>
  pairedLayout: Readonly<Ref<boolean>>
}

export const pairedPatternPreviewReferences = [1, 2, 3, 4, 5, 6].flatMap((row) =>
  [1, 3, 5].map((column) => `${column}-${row}` as VtgCellReference),
)

export const patternPreviewReferences = pairedPatternPreviewReferences.filter((reference) => {
  const row = Number(reference.split('-')[1])
  return row % 2 === 1
})

const spinToggleCells: ReadonlySet<VtgCellReference> = new Set(['5-6', '6-6', '5-5', '6-5'])
const spinPreviewIndexes = pairedPatternPreviewReferences.flatMap((reference, index) =>
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
  scale,
  spacing,
  quarters,
  leftPropColor,
  rightPropColor,
  orientation,
  pairedLayout,
}: UseVtgPreviewsOptions) => {
  const activePreviewIndexes = computed(() => {
    const references = pairedLayout.value
      ? pairedPatternPreviewReferences
      : patternPreviewReferences
    return references.map((reference) => pairedPatternPreviewReferences.indexOf(reference))
  })

  const buildSelection = (
    reference: VtgCellReference,
  ): VtgPatternSelection | QtrPatternSelection => {
    const selection: VtgPatternSelection = {
      reference,
      speedRatio: speedRatio.value,
      scale: scale.value,
      spacing: spacing.value,
      propColors: [leftPropColor.value, rightPropColor.value],
    }

    if (spinToggleCells.has(reference)) selection.isAnti = isAnti.value
    if (swapProps.value) selection.swapProps = true
    if (reversePlane.value) selection.reversePlane = true
    if (shape.value === 'box') selection.shape = shape.value
    if (beat.value !== 1) selection.beat = beat.value
    if (supportsVtgPatternOrientation(speedRatio.value) && orientation.value !== 0) {
      selection.orientation = orientation.value
    }
    return quarters.value ? { ...selection, quarters: quarters.value } : selection
  }

  const renderer = useConceptPreviewRenderer({
    dimensions,
    references: pairedPatternPreviewReferences,
    label: 'VTG',
    partialIndexes: spinPreviewIndexes,
    activeIndexes: activePreviewIndexes,
    createAnimation: (reference) => {
      const selection = buildSelection(reference)
      return 'quarters' in selection
        ? createQtrPreviewAnimation(selection)
        : createVtgPreviewAnimation(selection)
    },
  })

  // BPM changes animation timing only, so it intentionally does not invalidate still previews.
  watch(
    [
      speedRatio,
      swapProps,
      reversePlane,
      shape,
      beat,
      scale,
      spacing,
      quarters,
      leftPropColor,
      rightPropColor,
      orientation,
      pairedLayout,
    ],
    renderer.requestPreviews,
  )
  watch(isAnti, renderer.requestPartialPreviews)

  return {
    previewUrls: renderer.previewUrls,
    requestPreviews: renderer.requestPreviews,
  }
}
