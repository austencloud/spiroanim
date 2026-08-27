import type {
  EightStepPatternMatchRequest,
  EightStepPatternMatchResult,
  QstPatternMatchRequest,
  QstPatternMatchResult,
  VtgPatternMatchRequest,
  VtgPatternMatchResult,
  VtgPatternOrientationsRequest,
} from '@/workers/pattern-matching/PatternMatchingWorkerTypes'

export const getUniqueVtgPatternOrientationsRequest = async ({
  selection,
}: VtgPatternOrientationsRequest) => {
  const { getUniqueVtgPatternOrientations } =
    await import('@/features/vtg/math/getUniqueVtgPatternOrientations')
  return getUniqueVtgPatternOrientations(selection)
}

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

  const { exactlyMatchesVtgSelection, findVtgPatternMatch, matchesVtgSelection } =
    await import('@/features/vtg/matchVtgAnimation')
  if (!rotationFilter && lastSelection && !('quarters' in lastSelection)) {
    if (matchesVtgSelection(animation, lastSelection)) return { status: 'unchanged' }
  }

  const { exactlyMatchesQtrSelection, findQtrPatternMatch } = await import(
    '@/features/vtg/qtr/matchQtrAnimation'
  )
  const qtrMatch = findQtrPatternMatch(animation, preferences, rotationFilter)
  const vtgMatch = findVtgPatternMatch(animation, preferences, rotationFilter)
  const qtrExactlyRegenerates = qtrMatch ? exactlyMatchesQtrSelection(animation, qtrMatch) : false
  const vtgExactlyRegenerates = vtgMatch ? exactlyMatchesVtgSelection(animation, vtgMatch) : false

  if (vtgMatch && vtgExactlyRegenerates && !qtrExactlyRegenerates) {
    return { status: 'matched', source: 'vtg', match: vtgMatch }
  }

  if (
    qtrMatch &&
    qtrExactlyRegenerates &&
    (!vtgMatch || vtgMatch.reference !== qtrMatch.reference)
  ) {
    return { status: 'matched', source: 'qtr', match: qtrMatch }
  }

  if (vtgMatch?.orientation !== undefined || qtrMatch?.orientation !== undefined) {
    if (vtgMatch && vtgMatch.initialTurnsOffset === undefined) {
      return { status: 'matched', source: 'vtg', match: vtgMatch }
    }
    if (qtrMatch && qtrMatch.initialTurnsOffset === undefined) {
      return { status: 'matched', source: 'qtr', match: qtrMatch }
    }
    if (vtgMatch) return { status: 'matched', source: 'vtg', match: vtgMatch }
    return qtrMatch
      ? { status: 'matched', source: 'qtr', match: qtrMatch }
      : { status: 'unmatched' }
  }

  const {
    describePatternSelectionRelationships,
    inferPatternRelationshipOrientation,
    inferPatternRelationshipPropRotationOffsets,
  } = await import('@/features/concepts/math/describePatternSelectionRelationships')
  const { describePatternRelationships } = await import(
    '@/features/concepts/math/describePatternRelationships'
  )
  const actualRelationship = describePatternRelationships(animation).label
  const vtgRelationshipOffsets = vtgMatch
    ? inferPatternRelationshipPropRotationOffsets(animation, vtgMatch)
    : undefined
  const resolvedVtgMatch = vtgMatch
    ? {
        ...vtgMatch,
        ...(vtgRelationshipOffsets ? { propRotationOffsets: vtgRelationshipOffsets } : undefined),
      }
    : undefined
  const vtgPreservesRelationship =
    resolvedVtgMatch !== undefined &&
    describePatternSelectionRelationships(resolvedVtgMatch).label === actualRelationship
  if (vtgPreservesRelationship && resolvedVtgMatch.initialTurnsOffset === undefined) {
    return { status: 'matched', source: 'vtg', match: resolvedVtgMatch }
  }

  const qtrRelationshipOrientation = qtrMatch
    ? inferPatternRelationshipOrientation(animation, qtrMatch)
    : undefined
  const qtrRelationshipSelection = qtrMatch
    ? {
        ...qtrMatch,
        ...(qtrRelationshipOrientation === undefined
          ? undefined
          : { orientation: qtrRelationshipOrientation }),
      }
    : undefined
  const qtrRelationshipOffsets = qtrRelationshipSelection
    ? qtrExactlyRegenerates
      ? undefined
      : inferPatternRelationshipPropRotationOffsets(animation, qtrRelationshipSelection)
    : undefined
  const resolvedQtrMatch = qtrMatch
    ? {
        ...qtrMatch,
        ...(qtrRelationshipOrientation === undefined
          ? undefined
          : { orientation: qtrRelationshipOrientation }),
        ...(qtrRelationshipOffsets ? { propRotationOffsets: qtrRelationshipOffsets } : undefined),
      }
    : undefined
  const qtrPreservesRelationship =
    resolvedQtrMatch !== undefined &&
    describePatternSelectionRelationships(resolvedQtrMatch).label === actualRelationship

  if (qtrPreservesRelationship && !vtgPreservesRelationship) {
    return { status: 'matched', source: 'qtr', match: resolvedQtrMatch }
  }
  if (resolvedVtgMatch && resolvedVtgMatch.initialTurnsOffset === undefined) {
    return { status: 'matched', source: 'vtg', match: resolvedVtgMatch }
  }

  if (resolvedQtrMatch && resolvedQtrMatch.initialTurnsOffset === undefined) {
    return { status: 'matched', source: 'qtr', match: resolvedQtrMatch }
  }
  if (resolvedVtgMatch) return { status: 'matched', source: 'vtg', match: resolvedVtgMatch }
  return resolvedQtrMatch
    ? { status: 'matched', source: 'qtr', match: resolvedQtrMatch }
    : { status: 'unmatched' }
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
