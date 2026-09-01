import type { ConceptPatternSelection } from '@/features/concepts/types'
import type { ElementalRelationship } from '@/features/concepts/elementalRelationships'

export const builderPatternPointerMoveEvent = 'spiroanim:builder-pattern-pointer-move'
export const builderPatternPointerDropEvent = 'spiroanim:builder-pattern-pointer-drop'
export const builderPatternPointerEndEvent = 'spiroanim:builder-pattern-pointer-end'

export interface BuilderPatternPointerPreview {
  width: number
  height: number
  label: string
  imageUrl?: string
  elemental?: {
    hands?: ElementalRelationship
    props?: ElementalRelationship
    handsIndeterminate?: boolean
    propsIndeterminate?: boolean
    prefix?: string
  }
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
