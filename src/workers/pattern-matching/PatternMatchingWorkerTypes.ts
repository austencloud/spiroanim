import type { EightStepPatternMatch, EightStepPatternSelection } from '@/features/eight-step/types'
import type {
  QstPatternMatch,
  QstPatternMatchPreferences,
  QstPatternSelection,
} from '@/features/quarter-space-tech/types'
import type {
  QtrPatternMatch,
  QtrPatternMatchPreferences,
  QtrPatternSelection,
  VtgPatternMatch,
  VtgPatternMatchPreferences,
  VtgPatternRotationFilter,
  VtgPatternSelection,
} from '@/features/vtg/types'
import type { RootDataFinal } from '@/types/AnimTypes'

export interface VtgPatternMatchRequest {
  animation: RootDataFinal
  preferences: VtgPatternMatchPreferences & Pick<QtrPatternMatchPreferences, 'quarters'>
  rotationFilter?: VtgPatternRotationFilter
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

export interface QstPatternMatchRequest {
  animation: RootDataFinal
  preferences: QstPatternMatchPreferences
  lastSelection?: QstPatternSelection
}

export type QstPatternMatchResult =
  | { status: 'unchanged' }
  | { status: 'unmatched' }
  | { status: 'matched'; match: QstPatternMatch }

export interface PatternMatchingBridgeMap {
  matchVtg: {
    arg: VtgPatternMatchRequest
    ret: VtgPatternMatchResult
  }
  matchEightStep: {
    arg: EightStepPatternMatchRequest
    ret: EightStepPatternMatchResult
  }
  matchQst: {
    arg: QstPatternMatchRequest
    ret: QstPatternMatchResult
  }
}

export interface PatternMatchingClient {
  matchVtg: (request: VtgPatternMatchRequest) => Promise<VtgPatternMatchResult>
  matchEightStep: (request: EightStepPatternMatchRequest) => Promise<EightStepPatternMatchResult>
  matchQst: (request: QstPatternMatchRequest) => Promise<QstPatternMatchResult>
}
