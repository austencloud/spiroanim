import type { EightStepPatternMatch, EightStepPatternSelection } from '@/features/eight-step/types'
import type {
  QtrPatternMatch,
  QtrPatternMatchPreferences,
  QtrPatternSelection,
  VtgPatternMatch,
  VtgPatternMatchPreferences,
  VtgPatternSelection,
} from '@/features/vtg/types'
import type { RootDataFinal } from '@/types/AnimTypes'

export interface VtgPatternMatchRequest {
  animation: RootDataFinal
  preferences: VtgPatternMatchPreferences & Pick<QtrPatternMatchPreferences, 'quarters'>
  lastSelection?: VtgPatternSelection | QtrPatternSelection
}

export type VtgPatternMatchResult =
  | { status: 'unchanged' }
  | { status: 'unmatched' }
  | { status: 'matched'; source: 'vtg'; match: VtgPatternMatch }
  | { status: 'matched'; source: 'qtr'; match: QtrPatternMatch }

export interface EightStepPatternMatchRequest {
  animation: RootDataFinal
  lastSelection?: EightStepPatternSelection
}

export type EightStepPatternMatchResult =
  | { status: 'unchanged' }
  | { status: 'unmatched' }
  | { status: 'matched'; match: EightStepPatternMatch }

export interface PatternMatchingBridgeMap {
  matchVtg: {
    arg: VtgPatternMatchRequest
    ret: VtgPatternMatchResult
  }
  matchEightStep: {
    arg: EightStepPatternMatchRequest
    ret: EightStepPatternMatchResult
  }
}

export interface PatternMatchingClient {
  matchVtg: (request: VtgPatternMatchRequest) => Promise<VtgPatternMatchResult>
  matchEightStep: (request: EightStepPatternMatchRequest) => Promise<EightStepPatternMatchResult>
}
