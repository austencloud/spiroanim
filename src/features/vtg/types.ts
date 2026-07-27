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
  number: number
  diagram: VtgRuleDiagram
  accent?: boolean
}
