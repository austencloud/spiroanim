import type { ConceptPatternSelection } from '@/features/concepts/types'
import type { QtrPatternSelection, VtgPatternSelection } from '@/features/vtg/types'

export type VtgBuilderPatternSelection = VtgPatternSelection | QtrPatternSelection

export const builderPatternDragType = 'application/x-spiroanim-pattern'

export interface BuilderPatternDrop {
  previewIndex: number
  selection: ConceptPatternSelection
}
