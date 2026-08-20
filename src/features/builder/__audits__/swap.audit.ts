import { describe, expect, it } from 'vitest'

import { swapVtgBuilderPatternProps } from '@/features/builder/appendVtgBuilderPattern'
import { getVtgBuilderMotion } from '@/features/builder/describeVtgBuilderMotion'
import { applyPatternFinalTransforms } from '@/features/concepts/applyPatternFinalTransforms'
import { createVtgTransitionPreviewAnimations } from '@/features/vtg/math/createVtgTransitionQuickSlotAnimations'
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

describe('exhaustive VTG Builder prop swap audit', () => {
  it(
    'swaps each local portion while preserving every survivor, duration, and complete motion code',
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
        const context = `swap ${targetIndex} in ${describeSelection(first)} > ${describeSelection(second)} > ${describeSelection(third)}`
        const source = createThreePiece(first, second, third)
        const before = source ? previewStates(source) : undefined
        const beforePreviews = source ? createVtgTransitionPreviewAnimations(source) : undefined
        if (!source || !before || !beforePreviews) {
          fail(failures, context, 'could not create audit source')
          continue
        }

        const beforeInput = JSON.stringify(source)
        const expectedSelected = applyPatternFinalTransforms(beforePreviews[targetIndex]!, {
          swapProps: true,
        })
        const expectedSelectedMotion = getVtgBuilderMotion(expectedSelected)
        const once = swapVtgBuilderPatternProps(source, targetIndex)
        const onceStates = once ? previewStates(once) : undefined
        const twice = once ? swapVtgBuilderPatternProps(once, targetIndex) : undefined
        const twiceStates = twice ? previewStates(twice) : undefined

        if (!once || !onceStates || !twice || !twiceStates) {
          fail(
            failures,
            context,
            `swap failed: once=${Boolean(once)}, onceStates=${Boolean(onceStates)}, twice=${Boolean(twice)}, twiceStates=${Boolean(twiceStates)}`,
          )
        } else {
          const survivorMismatch = onceStates.findIndex(
            (state, index) => index !== targetIndex && !statesMatch(state, before[index]!),
          )
          if (survivorMismatch >= 0) {
            fail(failures, context, `changed survivor ${survivorMismatch}`)
          }

          const selectedState = onceStates[targetIndex]
          const beforeSelectedState = before[targetIndex]
          if (
            !selectedState ||
            !beforeSelectedState ||
            selectedState.beatCount !== beforeSelectedState.beatCount ||
            JSON.stringify(selectedState.motion) !== JSON.stringify(expectedSelectedMotion)
          ) {
            fail(failures, context, 'swapped portion motion or duration is incorrect')
          }
          if (!statesMatchAll(twiceStates, before)) {
            fail(failures, context, 'two swaps did not restore every motion and duration')
          }
        }

        if (inputWasMutated(beforeInput, source)) fail(failures, context, 'mutated its input')
      }

      expectNoFailures(failures)
    },
    auditTimeout,
  )
})
