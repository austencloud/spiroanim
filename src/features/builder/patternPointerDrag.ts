import type { ConceptPatternSelection } from '@/features/concepts/types'

export const builderPatternPointerMoveEvent = 'spiroanim:builder-pattern-pointer-move'
export const builderPatternPointerDropEvent = 'spiroanim:builder-pattern-pointer-drop'
export const builderPatternPointerEndEvent = 'spiroanim:builder-pattern-pointer-end'

export interface BuilderPatternPointerPreview {
  width: number
  height: number
  label: string
  imageUrl?: string
}

export interface BuilderPatternPointerDetail {
  clientX: number
  clientY: number
  selection: ConceptPatternSelection
  preview: BuilderPatternPointerPreview
}

export const createBuilderPatternPointerEvent = (
  type: typeof builderPatternPointerMoveEvent | typeof builderPatternPointerDropEvent,
  detail: BuilderPatternPointerDetail,
) => new CustomEvent<BuilderPatternPointerDetail>(type, { detail })
