import type { VtgCellReference, VtgRuleNumber } from '@/features/vtg/types'

type VtgQuarterRuleLabels = readonly [string, string]

export const vtgQuarterCellLabels = {
  '1-1': '',
  '2-1': '',
  '3-1': '',
  '4-1': '',
  '5-1': '',
  '6-1': '',
  '1-2': '',
  '2-2': '',
  '3-2': '',
  '4-2': '',
  '5-2': '',
  '6-2': '',
  '1-3': '',
  '2-3': '',
  '3-3': '',
  '4-3': '',
  '5-3': '',
  '6-3': '',
  '1-4': '',
  '2-4': '',
  '3-4': '',
  '4-4': '',
  '5-4': '',
  '6-4': '',
  '1-5': '',
  '2-5': '',
  '3-5': '',
  '4-5': '',
  '5-5': '',
  '6-5': '',
  '1-6': '',
  '2-6': '',
  '3-6': '',
  '4-6': '',
  '5-6': '',
  '6-6': '',
} as const satisfies Readonly<Record<VtgCellReference, string>>

export const vtgQuarterBottomRuleLabels = {
  1: ['', ''],
  2: ['', ''],
  3: ['', ''],
  4: ['', ''],
  5: ['', ''],
  6: ['', ''],
} as const satisfies Readonly<Record<VtgRuleNumber, VtgQuarterRuleLabels>>

export const vtgQuarterSideRuleLabels = {
  1: ['', ''],
  2: ['', ''],
  3: ['', ''],
  4: ['', ''],
  5: ['', ''],
  6: ['', ''],
} as const satisfies Readonly<Record<VtgRuleNumber, VtgQuarterRuleLabels>>
