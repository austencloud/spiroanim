import { createDefaultVtgAnimation } from '@/features/vtg/createVtgAnimation'
import { createVtgCatalogMatcher } from '@/features/vtg/math/createVtgCatalogMatcher'
import type {
  VtgPatternMatch,
  VtgPatternMatchPreferences,
  VtgPatternRotationFilter,
  VtgPatternSelection,
} from '@/features/vtg/types'
import type { RootDataFinal } from '@/types/AnimTypes'

const matcher = createVtgCatalogMatcher<VtgPatternSelection, VtgPatternMatch>({
  createDefaultAnimation: createDefaultVtgAnimation,
  createCatalogBaseAnimation: (selection) =>
    createDefaultVtgAnimation({
      ...selection,
      beat: 1,
      transition: false,
      swapProps: false,
      reversePlane: false,
    }),
  toSelection: (selection) => selection,
  toMatch: (match) => match,
})

export const findVtgPatternMatches = (
  animation: RootDataFinal,
  rotationFilter?: VtgPatternRotationFilter,
): readonly VtgPatternMatch[] => matcher.findMatches(animation, rotationFilter)

export const findVtgPatternMatchResolution = (
  animation: RootDataFinal,
  preferences?: VtgPatternMatchPreferences,
  rotationFilter?: VtgPatternRotationFilter,
) => matcher.findResolution(animation, preferences, rotationFilter)

export const findVtgPatternMatch = (
  animation: RootDataFinal,
  preferences?: VtgPatternMatchPreferences,
  rotationFilter?: VtgPatternRotationFilter,
): VtgPatternMatch | undefined =>
  findVtgPatternMatchResolution(animation, preferences, rotationFilter)?.match

export const matchesVtgSelection = matcher.matchesSelection
export const exactlyMatchesVtgSelection = matcher.exactlyMatchesSelection
