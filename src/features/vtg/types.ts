import type { PropReadable, RootDataFinal, RootReadable } from '@/types/AnimTypes'

export type VtgRuleNumber = 1 | 2 | 3 | 4 | 5 | 6

/**
 * VTG matrix references always use the bottom-row number first, followed by
 * the left-column number. For example, `1-5` is board column 2, row 2.
 */
export type VtgCellReference = `${VtgRuleNumber}-${VtgRuleNumber}`

export interface VtgCellAddress {
  column: VtgRuleNumber
  row: VtgRuleNumber
}

export const vtgSpeedRatios = ['1:1', '1:3', '1:5'] as const
export type VtgSpeedRatio = (typeof vtgSpeedRatios)[number]

export interface VtgPatternSelection {
  reference: VtgCellReference
  speedRatio: VtgSpeedRatio
}

export type VtgReadableAnimation = Partial<
  Omit<RootReadable, 'props'> & Pick<RootDataFinal, 'speed' | 'type' | 'turns' | 'depth'>
> & {
  props: PropReadable[]
}

export interface VtgPatternDefinition {
  label: string
  patternsBySpeedRatio: Readonly<Partial<Record<VtgSpeedRatio, () => VtgReadableAnimation>>>
}

export interface VtgPropPlacement {
  lane: number
  start: number
  end: number
  largeEnd: 'start' | 'end'
}

export interface VtgRuleDiagram {
  props: readonly [VtgPropPlacement, VtgPropPlacement]
}

export interface VtgRuleSpec {
  labels: readonly [string, string]
  number: VtgRuleNumber
  diagram: VtgRuleDiagram
  description: string
}
