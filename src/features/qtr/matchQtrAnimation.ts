import { removeQtrArcs } from '@/features/qtr/createQtrAnimation'
import { qtrModes } from '@/features/qtr/types'
import type { QtrPatternMatch, QtrPatternSelection } from '@/features/qtr/types'
import { findVtgPatternMatches } from '@/features/vtg/matchVtgAnimation'
import type { RootDataFinal } from '@/types/AnimTypes'

export const findQtrPatternMatches = (animation: RootDataFinal): readonly QtrPatternMatch[] =>
  qtrModes.flatMap((quarters) => {
    const nonSwapMatches = findVtgPatternMatches(removeQtrArcs(animation, quarters, false))
      .filter((match) => !match.swapProps)
      .map((match) => ({ ...match, quarters }))
    const swapMatches = findVtgPatternMatches(removeQtrArcs(animation, quarters, true))
      .filter((match) => match.swapProps)
      .map((match) => ({ ...match, quarters }))

    return [...nonSwapMatches, ...swapMatches]
  })

export const findQtrPatternMatch = (animation: RootDataFinal): QtrPatternMatch | undefined =>
  findQtrPatternMatches(animation)[0]

export const matchesQtrSelection = (
  animation: RootDataFinal,
  selection: QtrPatternSelection,
): boolean => {
  return findQtrPatternMatches(animation).some(
    (match) =>
      match.reference === selection.reference &&
      match.speedRatio === selection.speedRatio &&
      match.quarters === selection.quarters &&
      match.isAnti === (selection.isAnti ?? false) &&
      match.swapProps === (selection.swapProps ?? false) &&
      match.reversePlane === (selection.reversePlane ?? false) &&
      match.shape === (selection.shape ?? 'diamond'),
  )
}
