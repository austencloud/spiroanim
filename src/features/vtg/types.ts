import type { PropReadable, RootDataFinal, RootReadable } from '@/types/AnimTypes'
import type { PatternShape } from '@/types/PatternTypes'
import type { PatternPropVisibilitySelection } from '@/features/concepts/patternPropVisibility'
import type { PatternPropSpacingSelection } from '@/features/concepts/patternPropSpacing'
import type { PatternPropColorSelection } from '@/features/concepts/patternPropColors'

export type VtgRuleNumber = 1 | 2 | 3 | 4 | 5 | 6

/**
 * VTG matrix references use the top-header number first, followed by the
 * left-header number. For example, `1-5` is their intersection.
 */
export type VtgCellReference = `${VtgRuleNumber}-${VtgRuleNumber}`
export type VtgTimingCode = 'S' | 'T' | 'Q'
export type VtgDirectionCode = 'S' | 'O'
export type VtgRelationshipCode = `${VtgTimingCode}${VtgDirectionCode}`
export type VtgPatternLabel = `${VtgRelationshipCode}/${VtgRelationshipCode}`

export interface VtgCellAddress {
  column: VtgRuleNumber
  row: VtgRuleNumber
}

export const vtgSpeedRatios = ['1:1', '1:2', '1:3', '1:4', '1:5'] as const
export type VtgSpeedRatio = (typeof vtgSpeedRatios)[number]
export const supportsVtgQtrTransition = (
  speedRatio: VtgSpeedRatio,
  enableDevelopmentRatios = import.meta.env.DEV,
) => enableDevelopmentRatios || (speedRatio !== '1:1' && speedRatio !== '1:2')
export const vtgCanonicalSpeedRatio = '1:3' satisfies VtgSpeedRatio
export const vtgDefaultSpeedRatio = vtgCanonicalSpeedRatio
export const vtgBeats = [1, 2, 3, 4] as const
export type VtgBeat = (typeof vtgBeats)[number]
export const vtgTransitionBeats = [6, 5, 4, 3, 2] as const
export type VtgTransitionBeats = (typeof vtgTransitionBeats)[number]
export const vtgPatternOrientations = [0, 90] as const
export type VtgPatternOrientation = (typeof vtgPatternOrientations)[number]
export const supportsVtgPatternOrientation = (speedRatio: VtgSpeedRatio) =>
  speedRatio === '1:2' || speedRatio === '1:4'
export const getDefaultVtgPatternOrientation = (
  _speedRatio: VtgSpeedRatio,
): VtgPatternOrientation => 0
export const vtgDefaultTransitionBeats = 4 satisfies VtgTransitionBeats

export interface VtgPatternSelection
  extends PatternPropVisibilitySelection, PatternPropSpacingSelection, PatternPropColorSelection {
  reference: VtgCellReference
  speedRatio: VtgSpeedRatio
  isAnti?: boolean
  swapProps?: boolean
  reversePlane?: boolean
  shape?: PatternShape
  beat?: VtgBeat
  transition?: boolean
  transitionBeats?: VtgTransitionBeats
  transitionQuad?: boolean
  transitionSecond?: boolean
  orientation?: VtgPatternOrientation
  bpm?: number
  scale?: number
  thick?: number
  paths?: boolean
  hands?: boolean
  arms?: boolean
}

export interface VtgPatternMatch {
  reference: VtgCellReference
  speedRatio: VtgSpeedRatio
  isAnti: boolean
  swapProps: boolean
  reversePlane: boolean
  shape?: PatternShape
  beat?: VtgBeat
  transition?: boolean
  transitionBeats?: VtgTransitionBeats
  transitionQuad?: boolean
  transitionSecond?: boolean
  orientation?: VtgPatternOrientation
  bpm: number
  scale: number
}

export type VtgPatternMatchPreferences = Pick<VtgPatternMatch, 'swapProps' | 'reversePlane'>

export const qtrModes = [1, 2] as const
export type QtrMode = (typeof qtrModes)[number]

export interface QtrPatternSelection extends VtgPatternSelection {
  quarters: QtrMode
}

export interface QtrPatternMatch extends VtgPatternMatch {
  quarters: QtrMode
}

export type QtrPatternMatchPreferences = VtgPatternMatchPreferences &
  Pick<QtrPatternMatch, 'quarters'>

export type VtgReadableAnimation = Partial<
  Omit<RootReadable, 'props'> & Pick<RootDataFinal, 'speed' | 'type' | 'turns' | 'depth'>
> & {
  props: PropReadable[]
}

export type VtgPatternBuilder = (isAnti: boolean) => VtgReadableAnimation

export interface VtgPatternDefinition {
  patternsBySpeedRatio: Readonly<Partial<Record<VtgSpeedRatio, VtgPatternBuilder>>>
}

export interface VtgPropPlacement {
  orientation?: 'vertical' | 'horizontal'
  lane: number
  start: number
  end: number
  largeEnd: 'start' | 'end'
}

export interface VtgRuleDiagram {
  props: readonly [VtgPropPlacement, VtgPropPlacement]
  divider?: number
}

export interface VtgRuleSpec {
  labels: readonly [string, string]
  number: VtgRuleNumber
  diagram: VtgRuleDiagram
  description: string
}
