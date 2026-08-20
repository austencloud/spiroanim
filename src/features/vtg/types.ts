import type { PropReadable, RootDataFinal, RootReadable } from '@/types/AnimTypes'
import type { PatternShape } from '@/types/PatternTypes'
import type { PatternPropVisibilitySelection } from '@/features/concepts/patternPropVisibility'
import type { PatternPropSpacingSelection } from '@/features/concepts/patternPropSpacing'
import type { PatternPropColorSelection } from '@/features/concepts/patternPropColors'
export type VtgRuleNumber = 1 | 2 | 3 | 4 | 5 | 6

/** VTG matrix references are presented as row first, then column. */
export type VtgCellReference = `${VtgRuleNumber}-${VtgRuleNumber}`
export type VtgTimingCode = 'S' | 'T' | 'Q'
export type VtgDirectionCode = 'S' | 'O'
export type VtgRelationshipCode = `${VtgTimingCode}${VtgDirectionCode}`
export type VtgPatternLabel = `${VtgRelationshipCode} / ${VtgRelationshipCode}`

export interface VtgCellAddress {
  column: VtgRuleNumber
  row: VtgRuleNumber
}

export const vtgIndividualSpeedRatios = ['1:1', '1:2', '1:3', '1:4', '1:5'] as const
export type VtgIndividualSpeedRatio = (typeof vtgIndividualSpeedRatios)[number]
type VtgRatioNumber = VtgIndividualSpeedRatio extends `1:${infer Ratio}` ? Ratio : never
export type VtgCompoundSpeedRatio = `1:${VtgRatioNumber}v${VtgRatioNumber}`
export type VtgSpeedRatio = VtgIndividualSpeedRatio | VtgCompoundSpeedRatio
export const vtgSpeedRatios = [
  ...vtgIndividualSpeedRatios,
  '1:2v3',
  '1:3v2',
] as const satisfies readonly VtgSpeedRatio[]
export const vtgCanonicalSpeedRatio = '1:3' satisfies VtgSpeedRatio
export const vtgDefaultSpeedRatio = vtgCanonicalSpeedRatio

const toIndividualSpeedRatio = (ratio: VtgRatioNumber): VtgIndividualSpeedRatio => `1:${ratio}`
export const isVtgSpeedRatio = (value: string): value is VtgSpeedRatio =>
  /^1:[1-5](?:v[1-5])?$/.test(value)

export const getVtgPropSpeedRatios = (
  speedRatio: VtgSpeedRatio,
): readonly [VtgIndividualSpeedRatio, VtgIndividualSpeedRatio] => {
  const [leftRatio, rightRatio = leftRatio] = speedRatio.slice(2).split('v') as [
    VtgRatioNumber,
    VtgRatioNumber?,
  ]
  return [toIndividualSpeedRatio(leftRatio), toIndividualSpeedRatio(rightRatio)]
}

export const vtgBeats = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5] as const
export type VtgBeat = (typeof vtgBeats)[number]
export const vtgDefaultBeat = 1 satisfies VtgBeat
export const vtgTransitionBeats = [6, 5, 4, 3, 2] as const
export type VtgTransitionBeats = (typeof vtgTransitionBeats)[number]
export const vtgTransitionInitialTurnsOffsets = [-45, 45] as const
export type VtgTransitionInitialTurnsOffset = (typeof vtgTransitionInitialTurnsOffsets)[number]
export const vtgPatternOrientations = [-90, -45, 0, 45, 90, 180] as const
export type VtgPatternOrientation = number
export const getVtgPatternOrientations = (
  _speedRatio: VtgSpeedRatio,
): readonly VtgPatternOrientation[] => vtgPatternOrientations
export const vtgDefaultPatternOrientation = -90 satisfies VtgPatternOrientation
export const supportsVtgPatternOrientation = (_speedRatio: VtgSpeedRatio) => true
export const getDefaultVtgPatternOrientation = (
  speedRatio: VtgSpeedRatio,
): VtgPatternOrientation =>
  getVtgPropSpeedRatios(speedRatio).some((ratio) => Number(ratio.slice(2)) % 2 === 0)
    ? vtgDefaultPatternOrientation
    : 0
export const vtgDefaultTransitionBeats = 4 satisfies VtgTransitionBeats

export interface VtgPatternSelection
  extends PatternPropVisibilitySelection, PatternPropSpacingSelection, PatternPropColorSelection {
  reference: VtgCellReference
  speedRatio: VtgSpeedRatio
  isAnti?: boolean
  swapProps?: boolean
  reversePlane?: boolean
  /** @deprecated VTG no longer applies Tilted/Box shape transforms. */
  shape?: PatternShape
  beat?: VtgBeat
  transition?: boolean
  transitionAfterBeat?: boolean
  transitionBeats?: VtgTransitionBeats
  transitionQuad?: boolean
  transitionSecond?: boolean
  initialTurnsOffset?: VtgTransitionInitialTurnsOffset
  initialTurnsOffsetBeat?: VtgBeat
  orientation?: VtgPatternOrientation
  /** Hidden per-prop phase alignment inferred while matching an existing pattern. */
  propRotationOffsets?: readonly [number, number]
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
  /** @deprecated VTG matching no longer returns Tilted/Box variants. */
  shape?: PatternShape
  beat?: VtgBeat
  transition?: boolean
  transitionAfterBeat?: boolean
  transitionBeats?: VtgTransitionBeats
  transitionQuad?: boolean
  transitionSecond?: boolean
  initialTurnsOffset?: VtgTransitionInitialTurnsOffset
  orientation?: VtgPatternOrientation
  /** Hidden per-prop phase alignment relative to the matched catalog cell. */
  propRotationOffsets?: readonly [number, number]
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

export type VtgPatternBuilder = (isAnti: boolean, speedRatio: VtgSpeedRatio) => VtgReadableAnimation

export interface VtgPatternDefinition {
  build: VtgPatternBuilder
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
