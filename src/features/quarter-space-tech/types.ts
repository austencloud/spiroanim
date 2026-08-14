import type { PatternPropSpacingSelection } from '@/features/concepts/patternPropSpacing'
import type { PatternPropVisibilitySelection } from '@/features/concepts/patternPropVisibility'
import type { PatternPropColorSelection } from '@/features/concepts/patternPropColors'
import type { PropReadable, RootDataFinal, RootReadable } from '@/types/AnimTypes'

export const qstCollectionKeys = ['breaks', 'advanced', 'beyond'] as const
export type QstCollectionKey = (typeof qstCollectionKeys)[number]

export type QstPatternReference = `${QstCollectionKey}-${number}`

export const qstPositions = ['top', 'left', 'front', 'right', 'bottom', 'back'] as const
export type QstPosition = (typeof qstPositions)[number]
export type QstPositionPair = readonly [QstPosition, QstPosition]

export interface QstPatternSelection
  extends PatternPropVisibilitySelection, PatternPropSpacingSelection, PatternPropColorSelection {
  concept: 'qst'
  reference: QstPatternReference
  swapProps?: boolean
  reversePlane?: boolean
  bpm?: number
  scale?: number
  thick?: number
  paths?: boolean
  hands?: boolean
  arms?: boolean
}

export interface QstPatternMatch {
  reference: QstPatternReference
  swapProps: boolean
  reversePlane: boolean
  bpm: number
  scale: number
}

export type QstPatternMatchPreferences = Pick<QstPatternMatch, 'swapProps' | 'reversePlane'>

export type QstReadableAnimation = Partial<
  Omit<RootReadable, 'props'> & Pick<RootDataFinal, 'speed' | 'type' | 'turns' | 'depth'>
> & {
  props: PropReadable[]
}

export interface QstPatternDefinition {
  caption: string
  lineBeats?: number
  props: readonly [PropReadable, PropReadable]
  reference: QstPatternReference
}

export interface QstPatternSwapPair {
  first: QstPatternDefinition
  second: QstPatternDefinition
}

export interface QstCatalogPage {
  patterns: readonly QstPatternDefinition[]
}

export interface QstCollectionDefinition {
  description: string
  key: QstCollectionKey
  level: 'Intermediate' | 'Advanced' | 'Master'
  pages: readonly QstCatalogPage[]
  title: string
}

export interface QstSequenceTile {
  current: QstPositionPair
  next: QstPositionPair
  transition: QstTransitionCode
}

export interface QstSequenceLine {
  index: number
  tiles: readonly QstSequenceTile[]
}

export type QstTransitionCode =
  | 'QQ'
  | 'F'
  | 'FB'
  | 'O'
  | 'OB'
  | 'QT'
  | 'QS'
  | 'TQ'
  | 'TT'
  | 'TS'
  | 'SQ'
  | 'ST'
  | 'SS'

export type QstSharedFill =
  | 'first-left'
  | 'second-left'
  | 'first-top'
  | 'second-top'
  | 'first-top-left'
  | 'first-bottom-left'
  | 'second-top-left'
  | 'second-bottom-left'

export interface QstTileDescription {
  current: QstPositionPair
  sharedFill?: QstSharedFill
  transition: QstTransitionCode
}
