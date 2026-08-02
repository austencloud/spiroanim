import type { PropReadable, RootDataFinal, RootReadable } from '@/types/AnimTypes'

export type VtgRuleNumber = 1 | 2 | 3 | 4 | 5 | 6

/**
 * VTG matrix references use the bottom-header number first, followed by the
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
  thick?: number
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
