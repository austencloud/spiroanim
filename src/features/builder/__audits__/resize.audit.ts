import { describe, expect, it } from 'vitest'

import { resizeVtgTransitionPatternPreview } from '@/features/vtg/math/createVtgTransitionQuickSlotAnimations'
import {
  auditTimeout,
  coreCompactSelections,
  createFailures,
  createThreePiece,
  describeSelection,
  expectNoFailures,
  fail,
  fullCatalogSelections,
  inputWasMutated,
  phasedCompactSelections,
  previewStates,
  resizeBeatCounts,
  statesMatchAllSpinsAndDuration,
} from '@/features/builder/__audits__/vtgBuilderMutationAudit'

describe('exhaustive VTG Builder resize audit', () => {
  it(
    'covers every motion, position, UI beat value, cell, ratio, and phase independently',
    () => {
      expect.hasAssertions()
      const failures = createFailures()
      const cases = coreCompactSelections.flatMap((second, index) =>
        ([0, 1, 2] as const).flatMap((targetIndex) =>
          resizeBeatCounts.map((beatCount) => ({
            first: fullCatalogSelections[index % fullCatalogSelections.length]!,
            second,
            third: coreCompactSelections.at(-(index + 1))!,
            targetIndex,
            beatCount,
          })),
        ),
      )
      cases.push(
        ...fullCatalogSelections.map((first, index) => ({
          first,
          second: coreCompactSelections[index % coreCompactSelections.length]!,
          third: coreCompactSelections[(index + 1) % coreCompactSelections.length]!,
          targetIndex: 0 as const,
          beatCount: resizeBeatCounts[index % resizeBeatCounts.length]!,
        })),
        ...phasedCompactSelections.map((second, index) => ({
          first: fullCatalogSelections[index % fullCatalogSelections.length]!,
          second,
          third: coreCompactSelections[index % coreCompactSelections.length]!,
          targetIndex: 1 as const,
          beatCount: resizeBeatCounts[index % resizeBeatCounts.length]!,
        })),
      )

      for (const { first, second, third, targetIndex, beatCount } of cases) {
        const context = `resize ${targetIndex} to ${beatCount} in ${describeSelection(first)} > ${describeSelection(second)} > ${describeSelection(third)}`
        const source = createThreePiece(first, second, third)
        const before = source ? previewStates(source) : undefined
        if (!source || !before) {
          fail(failures, context, 'could not create audit source')
          continue
        }
        const beforeInput = JSON.stringify(source)
        const result = resizeVtgTransitionPatternPreview(source, targetIndex, beatCount)
        const after = result ? previewStates(result) : undefined
        const expected = before.map((state, index) =>
          index === targetIndex ? { ...state, beatCount } : state,
        )
        if (!after || !statesMatchAllSpinsAndDuration(after, expected)) {
          fail(failures, context, 'Anti/In spins or resulting durations are incorrect')
        }
        if (inputWasMutated(beforeInput, source)) fail(failures, context, 'mutated its input')
      }

      expectNoFailures(failures)
    },
    auditTimeout,
  )
})
