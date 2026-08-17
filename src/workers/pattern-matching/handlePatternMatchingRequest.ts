import type {
  EightStepPatternMatchRequest,
  EightStepPatternMatchResult,
  QstPatternMatchRequest,
  QstPatternMatchResult,
  VtgPatternMatchRequest,
  VtgPatternMatchResult,
} from '@/workers/pattern-matching/PatternMatchingWorkerTypes'

export const matchVtgPatternRequest = async ({
  animation,
  preferences,
  rotationFilter,
  lastSelection,
}: VtgPatternMatchRequest): Promise<VtgPatternMatchResult> => {
  if (!rotationFilter && lastSelection && 'quarters' in lastSelection) {
    const { matchesQtrSelection } = await import('@/features/vtg/qtr/matchQtrAnimation')
    if (matchesQtrSelection(animation, lastSelection)) return { status: 'unchanged' }
  }

  const { findVtgPatternMatch, matchesVtgSelection } =
    await import('@/features/vtg/matchVtgAnimation')
  if (!rotationFilter && lastSelection && !('quarters' in lastSelection)) {
    if (matchesVtgSelection(animation, lastSelection)) return { status: 'unchanged' }
  }

  const vtgMatch = findVtgPatternMatch(animation, preferences, rotationFilter)
  const { findQtrPatternMatch } = await import('@/features/vtg/qtr/matchQtrAnimation')
  const qtrMatch = findQtrPatternMatch(animation, preferences, rotationFilter)

  if (vtgMatch && vtgMatch.initialTurnsOffset === undefined) {
    return { status: 'matched', source: 'vtg', match: vtgMatch }
  }
  if (qtrMatch && qtrMatch.initialTurnsOffset === undefined) {
    return { status: 'matched', source: 'qtr', match: qtrMatch }
  }
  if (vtgMatch) return { status: 'matched', source: 'vtg', match: vtgMatch }
  return qtrMatch ? { status: 'matched', source: 'qtr', match: qtrMatch } : { status: 'unmatched' }
}

export const matchEightStepPatternRequest = async ({
  animation,
  lastSelection,
}: EightStepPatternMatchRequest): Promise<EightStepPatternMatchResult> => {
  const { findEightStepPatternMatch, matchesEightStepSelection } =
    await import('@/features/eight-step/matchEightStepAnimation')

  if (lastSelection && matchesEightStepSelection(animation, lastSelection)) {
    return { status: 'unchanged' }
  }

  const match = findEightStepPatternMatch(animation)
  return match ? { status: 'matched', match } : { status: 'unmatched' }
}

export const matchQstPatternRequest = async ({
  animation,
  preferences,
  lastSelection,
}: QstPatternMatchRequest): Promise<QstPatternMatchResult> => {
  const { findQstPatternMatch, matchesQstSelection } =
    await import('@/features/quarter-space-tech/matchQstAnimation')

  if (lastSelection && matchesQstSelection(animation, lastSelection)) {
    return { status: 'unchanged' }
  }

  const match = findQstPatternMatch(animation, preferences)
  return match ? { status: 'matched', match } : { status: 'unmatched' }
}
