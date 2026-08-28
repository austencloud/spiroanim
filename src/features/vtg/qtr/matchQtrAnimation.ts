import { createVtgCatalogMatcher } from '@/features/vtg/math/createVtgCatalogMatcher'
import {
  createDefaultQtrAnimation,
  createDefaultQtrBaseAnimation,
} from '@/features/vtg/qtr/createQtrAnimation'
import type {
  QtrPatternMatch,
  QtrPatternMatchPreferences,
  QtrPatternSelection,
  VtgPatternRotationFilter,
} from '@/features/vtg/types'
import type { RootDataFinal } from '@/types/AnimTypes'

const matcher = createVtgCatalogMatcher<QtrPatternSelection, QtrPatternMatch>({
  createDefaultAnimation: createDefaultQtrAnimation,
  createCatalogBaseAnimation: createDefaultQtrBaseAnimation,
  toSelection: (selection) => ({ ...selection, quarters: 1 }),
  toMatch: (match) => ({ ...match, quarters: 1 }),
})

export const findQtrPatternMatches = (
  animation: RootDataFinal,
  rotationFilter?: VtgPatternRotationFilter,
): readonly QtrPatternMatch[] => matcher.findMatches(animation, rotationFilter)

export const findQtrPatternMatchResolution = (
  animation: RootDataFinal,
  preferences?: QtrPatternMatchPreferences,
  rotationFilter?: VtgPatternRotationFilter,
) => matcher.findResolution(animation, preferences, rotationFilter)

export const findQtrPatternMatch = (
  animation: RootDataFinal,
  preferences?: QtrPatternMatchPreferences,
  rotationFilter?: VtgPatternRotationFilter,
): QtrPatternMatch | undefined =>
  findQtrPatternMatchResolution(animation, preferences, rotationFilter)?.match

export const matchesQtrSelection = matcher.matchesSelection
export const exactlyMatchesQtrSelection = matcher.exactlyMatchesSelection
