import { vtgBeats } from '@/features/vtg/types'
import type { VtgBeat, VtgPatternMatch, VtgPatternSelection } from '@/features/vtg/types'

export const qtrModes = [1, 2] as const
export type QtrMode = (typeof qtrModes)[number]

export const qtrBeats = vtgBeats
export type QtrBeat = VtgBeat

export interface QtrPatternSelection extends VtgPatternSelection {
  quarters: QtrMode
  beat?: QtrBeat
}

export interface QtrPatternMatch extends VtgPatternMatch {
  quarters: QtrMode
  beat: QtrBeat
}
