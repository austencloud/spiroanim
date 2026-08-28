import type {
  EightStepPatternMatchRequest,
  EightStepPatternMatchResult,
  QstPatternMatchRequest,
  QstPatternMatchResult,
  VtgPatternMatchRequest,
  VtgPatternMatchResult,
} from '@/workers/pattern-matching/PatternMatchingWorkerTypes'

const matchedVtg = (
  match: Extract<VtgPatternMatchResult, { source: 'vtg' }>['match'],
  exact: boolean,
): VtgPatternMatchResult => ({ status: 'matched', source: 'vtg', match, exact })

const matchedQtr = (
  match: Extract<VtgPatternMatchResult, { source: 'qtr' }>['match'],
  exact: boolean,
): VtgPatternMatchResult => ({ status: 'matched', source: 'qtr', match, exact })

export const matchVtgPatternRequest = async ({
  animation,
  preferences,
  rotationFilter,
  lastSelection,
}: VtgPatternMatchRequest): Promise<VtgPatternMatchResult> => {
  if (!rotationFilter && lastSelection && 'quarters' in lastSelection) {
    const { exactlyMatchesQtrSelection } = await import('@/features/vtg/qtr/matchQtrAnimation')
    if (exactlyMatchesQtrSelection(animation, lastSelection)) return { status: 'unchanged' }
  }

  const { exactlyMatchesVtgSelection, findVtgPatternMatchResolution } =
    await import('@/features/vtg/matchVtgAnimation')
  if (!rotationFilter && lastSelection && !('quarters' in lastSelection)) {
    if (exactlyMatchesVtgSelection(animation, lastSelection)) return { status: 'unchanged' }
  }

  const { findQtrPatternMatchResolution } = await import('@/features/vtg/qtr/matchQtrAnimation')
  const qtrResolution = findQtrPatternMatchResolution(animation, preferences, rotationFilter)
  const vtgResolution = findVtgPatternMatchResolution(animation, preferences, rotationFilter)
  const qtrMatch = qtrResolution?.match
  const vtgMatch = vtgResolution?.match
  const qtrExactlyRegenerates = qtrResolution?.exact ?? false
  const vtgExactlyRegenerates = vtgResolution?.exact ?? false

  if (qtrMatch && qtrExactlyRegenerates && vtgMatch && vtgExactlyRegenerates) {
    const qtrUsesPropRotation = qtrMatch.propRotationOffsets !== undefined
    const vtgUsesPropRotation = vtgMatch.propRotationOffsets !== undefined
    if (qtrUsesPropRotation !== vtgUsesPropRotation) {
      return qtrUsesPropRotation ? matchedVtg(vtgMatch, true) : matchedQtr(qtrMatch, true)
    }

    const qtrIsRotated = (qtrMatch.orientation ?? 0) !== 0
    const vtgIsRotated = (vtgMatch.orientation ?? 0) !== 0
    if (qtrIsRotated !== vtgIsRotated) {
      return qtrIsRotated ? matchedVtg(vtgMatch, true) : matchedQtr(qtrMatch, true)
    }

    const qtrBeat = qtrMatch.beat ?? 1
    const vtgBeat = vtgMatch.beat ?? 1
    const controlsDifferWithinCell =
      qtrMatch.reference === vtgMatch.reference &&
      (qtrBeat !== vtgBeat || (qtrMatch.orientation ?? 0) !== (vtgMatch.orientation ?? 0))
    if (controlsDifferWithinCell) {
      return matchedQtr(qtrMatch, true)
    }

    if (qtrBeat !== vtgBeat) {
      return qtrBeat < vtgBeat ? matchedQtr(qtrMatch, true) : matchedVtg(vtgMatch, true)
    }

    return qtrMatch.reference !== vtgMatch.reference
      ? matchedQtr(qtrMatch, true)
      : matchedVtg(vtgMatch, true)
  }

  if (qtrMatch && qtrExactlyRegenerates) {
    return matchedQtr(qtrMatch, true)
  }
  if (vtgMatch && vtgExactlyRegenerates) {
    return matchedVtg(vtgMatch, true)
  }

  if (vtgMatch?.orientation !== undefined || qtrMatch?.orientation !== undefined) {
    if (vtgMatch && vtgMatch.initialTurnsOffset === undefined) {
      return matchedVtg(vtgMatch, false)
    }
    if (qtrMatch && qtrMatch.initialTurnsOffset === undefined) {
      return matchedQtr(qtrMatch, false)
    }
    if (vtgMatch) return matchedVtg(vtgMatch, false)
    return qtrMatch ? matchedQtr(qtrMatch, false) : { status: 'unmatched' }
  }

  const {
    describePatternSelectionRelationships,
    inferPatternRelationshipOrientation,
    inferPatternRelationshipPropRotationOffsets,
  } = await import('@/features/concepts/math/describePatternSelectionRelationships')
  const { describePatternRelationships } =
    await import('@/features/concepts/math/describePatternRelationships')
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
    return matchedVtg(resolvedVtgMatch, false)
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
    return matchedQtr(resolvedQtrMatch, false)
  }
  if (resolvedVtgMatch && resolvedVtgMatch.initialTurnsOffset === undefined) {
    return matchedVtg(resolvedVtgMatch, false)
  }

  if (resolvedQtrMatch && resolvedQtrMatch.initialTurnsOffset === undefined) {
    return matchedQtr(resolvedQtrMatch, false)
  }
  if (resolvedVtgMatch) return matchedVtg(resolvedVtgMatch, false)
  return resolvedQtrMatch ? matchedQtr(resolvedQtrMatch, false) : { status: 'unmatched' }
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
