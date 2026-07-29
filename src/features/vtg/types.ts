import type { PropReadable, RootDataFinal, RootReadable } from '@/types/AnimTypes'

export type VtgRuleNumber = 1 | 2 | 3 | 4 | 5 | 6

/**
 * VTG matrix references always use the bottom-row number first, followed by
 * the left-column number. For example, `1-5` is board column 2, row 2.
 */
export type VtgCellReference = `${VtgRuleNumber}-${VtgRuleNumber}`
export type VtgRelationshipCode = `${'S' | 'T'}${'S' | 'O'}`
export type VtgPatternLabel = `${VtgRelationshipCode}/${VtgRelationshipCode}`

export interface VtgCellAddress {
  column: VtgRuleNumber
  row: VtgRuleNumber
}

export const vtgSpeedRatios = ['1:1', '1:3', '1:5'] as const
export type VtgSpeedRatio = (typeof vtgSpeedRatios)[number]
export const vtgDefaultSpeedRatio = '1:3' satisfies VtgSpeedRatio

export interface VtgPatternSelection {
  reference: VtgCellReference
  speedRatio: VtgSpeedRatio
  isAnti?: boolean
  swapProps?: boolean
  reversePlane?: boolean
  bpm?: number
  scale?: number
}

export interface VtgPatternMatch {
  reference: VtgCellReference
  speedRatio: VtgSpeedRatio
  isAnti: boolean
  swapProps: boolean
  reversePlane: boolean
  bpm: number
  scale: number
}

export type VtgReadableAnimation = Partial<
  Omit<RootReadable, 'props'> & Pick<RootDataFinal, 'speed' | 'type' | 'turns' | 'depth'>
> & {
  props: PropReadable[]
}

export type VtgPatternBuilder = (isAnti: boolean) => VtgReadableAnimation

export interface VtgPatternDefinition {
  label: VtgPatternLabel
  patternsBySpeedRatio: Readonly<Partial<Record<VtgSpeedRatio, VtgPatternBuilder>>>
}

export interface VtgPropPlacement {
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
