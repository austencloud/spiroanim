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
