import type { PropReadable, RootDataFinal, RootReadable } from '@/types/AnimTypes'

export const eightStepColumns = [1, 2, 3, 4, 5, 6, 7, 8] as const
export const eightStepRows = ['AA', 'AE', 'AI', 'EA', 'EE', 'EI', 'IA', 'IE', 'II'] as const
export const eightStepPages = [1, 3, 5, 7, 9, 11, 13, 15] as const
export const eightStepShapes = ['diamond', 'box'] as const

export type EightStepColumn = (typeof eightStepColumns)[number]
export type EightStepRow = (typeof eightStepRows)[number]
export type EightStepPage = (typeof eightStepPages)[number]
export type EightStepToken = 'T' | 'R' | 'B' | 'L'
export type EightStepCurveFamily = 'antispin' | 'extension' | 'inspin' | 'outspin'
export type EightStepShape = (typeof eightStepShapes)[number]

/** Eight Step references use the top-header number first and the left-header code second. */
export type EightStepCellReference = `${EightStepColumn}-${EightStepRow}`

export interface EightStepPatternSelection {
  concept: '8stp'
  reference: EightStepCellReference
  swapProps?: boolean
  reversePlane?: boolean
  shape?: EightStepShape
  bpm?: number
  scale?: number
  thick?: number
  paths?: boolean
  hands?: boolean
  arms?: boolean
}

export interface EightStepPatternMatch {
  reference: EightStepCellReference
  swapProps: boolean
  reversePlane: boolean
  shape: EightStepShape
  bpm: number
  scale: number
}

export type EightStepReadableAnimation = Partial<
  Omit<RootReadable, 'props'> & Pick<RootDataFinal, 'speed' | 'type' | 'turns' | 'depth'>
> & {
  props: PropReadable[]
}

export interface EightStepPatternDefinition {
  column: EightStepColumn
  page: EightStepPage
  row: EightStepRow
  reference: EightStepCellReference
  props: readonly [PropReadable, PropReadable]
}
