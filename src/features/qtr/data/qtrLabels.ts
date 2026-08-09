import type { VtgRuleNumber } from '@/features/vtg/types'

type QtrRuleLabels = readonly [string, string]

export const qtrColumnRuleLabels = {
  1: ['', ''],
  2: ['', ''],
  3: ['', ''],
  4: ['', ''],
  5: ['', ''],
  6: ['', ''],
} as const satisfies Readonly<Record<VtgRuleNumber, QtrRuleLabels>>

export const qtrSideRuleLabels = {
  1: ['', ''],
  2: ['', ''],
  3: ['', ''],
  4: ['', ''],
  5: ['', ''],
  6: ['', ''],
} as const satisfies Readonly<Record<VtgRuleNumber, QtrRuleLabels>>
