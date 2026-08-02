import type { VtgPatternMatch, VtgPatternSelection } from '@/features/vtg/types'

export const qtrModes = [1, 2] as const
export type QtrMode = (typeof qtrModes)[number]

export interface QtrPatternSelection extends VtgPatternSelection {
  quarters: QtrMode
}

export interface QtrPatternMatch extends VtgPatternMatch {
  quarters: QtrMode
}
