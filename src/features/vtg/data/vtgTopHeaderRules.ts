import type {
  VtgEstablishedIndividualSpeedRatio,
  VtgRuleNumber,
  VtgSpeedRatio,
} from '@/features/vtg/types'

export interface VtgTopHeaderRule {
  ruleNumbers: readonly VtgRuleNumber[]
  showDetails: boolean
}

const standardRuleNumbers = [1, 2, 3, 4, 5, 6] as const satisfies readonly VtgRuleNumber[]
const swappedRuleNumbers = [3, 4, 1, 2, 5, 6] as const satisfies readonly VtgRuleNumber[]

const defaultTopHeaderRule: VtgTopHeaderRule = {
  ruleNumbers: standardRuleNumbers,
  showDetails: false,
}

const establishedTopHeaderRules = {
  '1:1': { ruleNumbers: swappedRuleNumbers, showDetails: true },
  '1:2': defaultTopHeaderRule,
  '1:3': { ruleNumbers: standardRuleNumbers, showDetails: true },
  '1:4': defaultTopHeaderRule,
  '1:5': { ruleNumbers: swappedRuleNumbers, showDetails: true },
} as const satisfies Readonly<Record<VtgEstablishedIndividualSpeedRatio, VtgTopHeaderRule>>

const hasEstablishedTopHeaderRule = (
  speedRatio: VtgSpeedRatio,
): speedRatio is VtgEstablishedIndividualSpeedRatio => speedRatio in establishedTopHeaderRules

/** Ratios without an established mapping intentionally use the 1:2/1:4 top headers. */
export const getVtgTopHeaderRule = (speedRatio: VtgSpeedRatio): VtgTopHeaderRule =>
  hasEstablishedTopHeaderRule(speedRatio)
    ? establishedTopHeaderRules[speedRatio]
    : defaultTopHeaderRule
