import { expect } from 'vitest'

import { appendVtgBuilderPattern } from '@/features/builder/appendVtgBuilderPattern'
import {
  areVtgBuilderMotionsEqual,
  areVtgBuilderSpinsEqual,
  getVtgBuilderMotion,
  type VtgBuilderMotion,
} from '@/features/builder/describeVtgBuilderMotion'
import { createDefaultVtgAnimation } from '@/features/vtg/createVtgAnimation'
import {
  createVtgTransitionPreviewAnimations,
  getVtgTransitionPreviewBeatCount,
} from '@/features/vtg/math/createVtgTransitionQuickSlotAnimations'
import type { VtgCellReference, VtgPatternSelection, VtgRuleNumber } from '@/features/vtg/types'
import { getVtgBeats, vtgSpeedRatios } from '@/features/vtg/types'
import type { RootDataFinal } from '@/types/AnimTypes'

export const auditTimeout = 10 * 60 * 1000
const ruleNumbers = [1, 2, 3, 4, 5, 6] as const satisfies readonly VtgRuleNumber[]
const compactReferences = [
  '1-1',
  '2-1',
  '3-1',
  '4-1',
  '1-6',
  '2-6',
  '3-6',
  '4-6',
] as const satisfies readonly VtgCellReference[]

export interface PreviewState {
  motion: VtgBuilderMotion
  beatCount: number
}

export interface AuditFailures {
  count: number
  examples: string[]
}

export const fullCatalogSelections: readonly VtgPatternSelection[] = ruleNumbers.flatMap((row) =>
  ruleNumbers.map((column) => ({
    reference: `${column}-${row}` as VtgCellReference,
    speedRatio: '1:3' as const,
  })),
)

export const coreCompactSelections: readonly VtgPatternSelection[] = compactReferences.map(
  (reference) => ({ reference, speedRatio: '1:3' }),
)

/** Every compact motion at every independently meaningful ratio and starting phase. */
export const phasedCompactSelections: readonly VtgPatternSelection[] = compactReferences.flatMap(
  (reference) =>
    vtgSpeedRatios.flatMap((speedRatio) =>
      getVtgBeats(speedRatio).map((beat) => ({ reference, speedRatio, beat })),
    ),
)

/** Every full cell with ratio and phase varied independently, without a redundant Cartesian cross. */
export const variedFullSelections: readonly VtgPatternSelection[] = fullCatalogSelections.flatMap(
  ({ reference }) => [
    { reference, speedRatio: '1:3' as const },
    ...vtgSpeedRatios
      .filter((speedRatio) => speedRatio !== '1:3')
      .map((speedRatio) => ({ reference, speedRatio })),
    ...getVtgBeats('1:3')
      .filter((beat) => beat !== 1)
      .map((beat) => ({ reference, speedRatio: '1:3' as const, beat })),
  ],
)

export const resizeBeatCounts = Array.from({ length: 16 }, (_, index) => (index + 1) / 2)

export const describeSelection = (selection: VtgPatternSelection): string =>
  `${selection.reference} ${selection.speedRatio} beat ${selection.beat ?? 1}`

export const createFailures = (): AuditFailures => ({ count: 0, examples: [] })

export const fail = (failures: AuditFailures, context: string, reason: string) => {
  failures.count++
  if (failures.examples.length < 50) failures.examples.push(`${context}: ${reason}`)
}

export const expectNoFailures = (failures: AuditFailures) => {
  expect(
    failures.count,
    `${failures.count} mutation audit failures. First ${failures.examples.length}:\n${failures.examples.join('\n')}`,
  ).toBe(0)
}

export const previewStates = (animation: RootDataFinal): readonly PreviewState[] | undefined =>
  createVtgTransitionPreviewAnimations(animation)?.map((preview) => ({
    motion: getVtgBuilderMotion(preview),
    beatCount: getVtgTransitionPreviewBeatCount(preview),
  }))

export const statesMatch = (actual: PreviewState, expected: PreviewState): boolean =>
  actual.beatCount === expected.beatCount &&
  areVtgBuilderMotionsEqual(actual.motion, expected.motion)

export const statesMatchSpinsAndDuration = (
  actual: PreviewState,
  expected: PreviewState,
): boolean =>
  actual.beatCount === expected.beatCount && areVtgBuilderSpinsEqual(actual.motion, expected.motion)

export const statesMatchAll = (
  actual: readonly PreviewState[],
  expected: readonly PreviewState[],
): boolean =>
  actual.length === expected.length &&
  actual.every(
    (state, index) => expected[index] !== undefined && statesMatch(state, expected[index]),
  )

export const statesMatchAllSpinsAndDuration = (
  actual: readonly PreviewState[],
  expected: readonly PreviewState[],
): boolean =>
  actual.length === expected.length &&
  actual.every(
    (state, index) =>
      expected[index] !== undefined && statesMatchSpinsAndDuration(state, expected[index]),
  )

export const createInitial = (selection: VtgPatternSelection): RootDataFinal | undefined =>
  createDefaultVtgAnimation(selection)

export const createTwoPiece = (
  first: VtgPatternSelection,
  second: VtgPatternSelection,
): RootDataFinal | undefined => {
  const initial = createInitial(first)
  return initial ? appendVtgBuilderPattern(initial, second) : undefined
}

export const createThreePiece = (
  first: VtgPatternSelection,
  second: VtgPatternSelection,
  third: VtgPatternSelection,
): RootDataFinal | undefined => {
  const firstTwo = createTwoPiece(first, second)
  return firstTwo ? appendVtgBuilderPattern(firstTwo, third) : undefined
}

export const inputWasMutated = (before: string, animation: RootDataFinal): boolean =>
  JSON.stringify(animation) !== before

export const expectedDroppedState = (selection: VtgPatternSelection): PreviewState | undefined => {
  const animation = createDefaultVtgAnimation(selection)
  return animation ? previewStates(animation)?.[0] : undefined
}
