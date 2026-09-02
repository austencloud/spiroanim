import type { ConceptPatternSelection } from '@/features/concepts/types'
import type { QtrPatternSelection, VtgPatternSelection } from '@/features/vtg/types'

export type VtgBuilderPatternSelection = VtgPatternSelection | QtrPatternSelection
export type VtgBuilderScaleMode = 'simple' | 'advanced'
export type VtgBuilderScaleValues = [Record<string, number>, Record<string, number>]

export const builderPatternDragType = 'application/x-spiroanim-pattern'

export interface BuilderPatternDrop {
  previewIndex: number
  selection: ConceptPatternSelection
}
