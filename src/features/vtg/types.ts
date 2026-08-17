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
export const vtgCanonicalSpeedRatio = '1:3' satisfies VtgSpeedRatio
export const vtgDefaultSpeedRatio = vtgCanonicalSpeedRatio
export const vtgBeats = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5] as const
export type VtgBeat = (typeof vtgBeats)[number]
export const vtgDefaultBeat = 1 satisfies VtgBeat
export const vtgTransitionBeats = [6, 5, 4, 3, 2] as const
export type VtgTransitionBeats = (typeof vtgTransitionBeats)[number]
export const vtgTransitionInitialTurnsOffsets = [-45, 45] as const
export type VtgTransitionInitialTurnsOffset = (typeof vtgTransitionInitialTurnsOffsets)[number]
export const vtgPatternOrientations = [-90, 0, 90, 180] as const
export type VtgPatternOrientation = (typeof vtgPatternOrientations)[number]
// Odd-ratio 45 Trans audits found that -90 and 90 always identify the same quarter-turn class once
// beat, Swap, and 180 are considered. Positive 90 is the canonical quarter turn for odd ratios.
const vtgOddPatternOrientations = [0, 90, 180] as const
// The same audit found no 1:3 extraction that required the half turn.
const vtg1to3PatternOrientations = [0, 90] as const
export const getVtgPatternOrientations = (
  speedRatio: VtgSpeedRatio,
): readonly VtgPatternOrientation[] =>
  speedRatio === '1:3'
    ? vtg1to3PatternOrientations
    : speedRatio === '1:1' || speedRatio === '1:5'
      ? vtgOddPatternOrientations
      : vtgPatternOrientations
export const vtgDefaultPatternOrientation = -90 satisfies VtgPatternOrientation
export const supportsVtgPatternOrientation = (speedRatio: VtgSpeedRatio) =>
  getVtgPatternOrientations(speedRatio).length > 1
export const getDefaultVtgPatternOrientation = (
  speedRatio: VtgSpeedRatio,
): VtgPatternOrientation =>
  speedRatio === '1:2' || speedRatio === '1:4' ? vtgDefaultPatternOrientation : 0
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
  initialTurnsOffset?: VtgTransitionInitialTurnsOffset
  initialTurnsOffsetBeat?: VtgBeat
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
  initialTurnsOffset?: VtgTransitionInitialTurnsOffset
  orientation?: VtgPatternOrientation
  bpm: number
  scale: number
}

export type VtgPatternMatchPreferences = Pick<VtgPatternMatch, 'swapProps' | 'reversePlane'>
export type VtgPatternRotationFilter = 'unrotated' | 'rotated'

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
