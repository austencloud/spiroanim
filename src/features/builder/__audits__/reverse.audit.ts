import { describe, expect, it } from 'vitest'

import { reverseVtgTransitionPatternPreview } from '@/features/vtg/math/createVtgTransitionQuickSlotAnimations'
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
  statesMatch,
  statesMatchAll,
} from '@/features/builder/__audits__/vtgBuilderMutationAudit'

describe('exhaustive VTG Builder reverse audit', () => {
  it(
    'reverses each local junction pair and independently covers cell, phase, and position',
    () => {
      expect.hasAssertions()
      const failures = createFailures()
      const cases = coreCompactSelections.flatMap((second) =>
        coreCompactSelections.flatMap((third) =>
          ([0, 1, 2] as const).map((targetIndex) => ({
            first: fullCatalogSelections[0]!,
            second,
            third,
            targetIndex,
          })),
        ),
      )
      cases.push(
        ...fullCatalogSelections.map((first, index) => ({
          first,
          second: coreCompactSelections[index % coreCompactSelections.length]!,
          third: coreCompactSelections[(index + 1) % coreCompactSelections.length]!,
          targetIndex: (index % 3) as 0 | 1 | 2,
        })),
        ...phasedCompactSelections.map((second, index) => ({
          first: fullCatalogSelections[index % fullCatalogSelections.length]!,
          second,
          third: phasedCompactSelections.at(-(index + 1))!,
          targetIndex: (index % 3) as 0 | 1 | 2,
        })),
      )

      for (const { first, second, third, targetIndex } of cases) {
        const context = `reverse ${targetIndex} in ${describeSelection(first)} > ${describeSelection(second)} > ${describeSelection(third)}`
        const source = createThreePiece(first, second, third)
        const before = source ? previewStates(source) : undefined
        if (!source || !before) {
          fail(failures, context, 'could not create audit source')
          continue
        }
        const beforeInput = JSON.stringify(source)
        const once = reverseVtgTransitionPatternPreview(source, targetIndex)
        const onceStates = once ? previewStates(once) : undefined
        const twice = once ? reverseVtgTransitionPatternPreview(once, targetIndex) : undefined
        const twiceStates = twice ? previewStates(twice) : undefined
        if (!once || !onceStates || !twice || !twiceStates) {
          fail(
            failures,
            context,
            `reverse failed: once=${Boolean(once)}, onceStates=${Boolean(onceStates)}, twice=${Boolean(twice)}, twiceStates=${Boolean(twiceStates)}`,
          )
        } else {
          if (JSON.stringify(once) === beforeInput)
            fail(failures, context, 'first reverse was a no-op')
          if (
            !onceStates.every(
              (state, index) => index >= targetIndex || statesMatch(state, before[index]!),
            )
          ) {
            const mismatchIndex = onceStates.findIndex(
              (state, index) => index < targetIndex && !statesMatch(state, before[index]!),
            )
            fail(
              failures,
              context,
              `survivor ${mismatchIndex}: expected ${JSON.stringify(before[mismatchIndex])}, received ${JSON.stringify(onceStates[mismatchIndex])}`,
            )
          }
          if (!statesMatchAll(twiceStates, before)) {
            fail(failures, context, 'two reversals did not restore compiled motion/duration')
          }
        }
        if (inputWasMutated(beforeInput, source)) fail(failures, context, 'mutated its input')
      }

      expectNoFailures(failures)
    },
    auditTimeout,
  )
})
