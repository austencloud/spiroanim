import type { ConceptPatternSelection } from '@/features/concepts/types'

export const builderPatternDragType = 'application/x-spiroanim-pattern'

export interface BuilderPatternDrop {
  previewIndex: number
  selection: ConceptPatternSelection
}
