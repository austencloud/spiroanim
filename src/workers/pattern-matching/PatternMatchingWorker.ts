import { createMessageChannel } from '@/workers/createMessageChannel'
import {
  getUniqueVtgPatternOrientationsRequest,
  matchEightStepPatternRequest,
  matchQstPatternRequest,
  matchVtgPatternRequest,
} from '@/workers/pattern-matching/handlePatternMatchingRequest'
import type { PatternMatchingBridgeMap } from '@/workers/pattern-matching/PatternMatchingWorkerTypes'

const { register } = createMessageChannel<PatternMatchingBridgeMap>(
  self as DedicatedWorkerGlobalScope,
)

register('matchVtg', matchVtgPatternRequest)
register('getUniqueVtgPatternOrientations', getUniqueVtgPatternOrientationsRequest)
register('matchEightStep', matchEightStepPatternRequest)
register('matchQst', matchQstPatternRequest)
