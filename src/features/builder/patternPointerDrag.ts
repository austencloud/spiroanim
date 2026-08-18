import type { ConceptPatternSelection } from '@/features/concepts/types'

export const builderPatternPointerMoveEvent = 'spiroanim:builder-pattern-pointer-move'
export const builderPatternPointerDropEvent = 'spiroanim:builder-pattern-pointer-drop'
export const builderPatternPointerEndEvent = 'spiroanim:builder-pattern-pointer-end'

export interface BuilderPatternPointerDetail {
  clientX: number
  clientY: number
  selection: ConceptPatternSelection
}

export const createBuilderPatternPointerEvent = (
  type: typeof builderPatternPointerMoveEvent | typeof builderPatternPointerDropEvent,
  detail: BuilderPatternPointerDetail,
) => new CustomEvent<BuilderPatternPointerDetail>(type, { detail })
