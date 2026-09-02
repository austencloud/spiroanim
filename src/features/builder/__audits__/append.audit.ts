import { describe, expect, it } from 'vitest'

import { appendVtgBuilderPattern } from '@/features/builder/appendVtgBuilderPattern'
import {
  auditTimeout,
  coreCompactSelections,
  createFailures,
  createInitial,
  describeSelection,
  expectNoFailures,
  expectedDroppedState,
  fail,
  fullCatalogSelections,
  inputWasMutated,
  phasedCompactSelections,
  previewStates,
  statesMatchAll,
} from '@/features/builder/__audits__/vtgBuilderMutationAudit'

describe('exhaustive VTG Builder append audit', () => {
  it(
    'appends every compact spin pair and control factor without changing existing portions',
    () => {
      expect.hasAssertions()
      const failures = createFailures()
      const cases = [
        ...fullCatalogSelections.flatMap((first) =>
          coreCompactSelections.map((dropped) => ({ first, dropped })),
        ),
        ...phasedCompactSelections.map((dropped, index) => ({
          first: fullCatalogSelections[index % fullCatalogSelections.length]!,
          dropped,
        })),
      ]

      for (const { first, dropped } of cases) {
        const context = `append ${describeSelection(dropped)} after ${describeSelection(first)}`
        const source = createInitial(first)
        const expectedDrop = expectedDroppedState(dropped)
        if (!source || !expectedDrop) {
          fail(failures, context, 'could not create audit source')
          continue
        }
        const beforeInput = JSON.stringify(source)
        const before = previewStates(source)
        const result = appendVtgBuilderPattern(source, dropped)
        const after = result ? previewStates(result) : undefined
        if (!before || !after || !statesMatchAll(after, [...before, expectedDrop])) {
          fail(failures, context, 'existing or appended motion code or duration is incorrect')
        }
        if (inputWasMutated(beforeInput, source)) fail(failures, context, 'mutated its input')
      }

      const template = createInitial(fullCatalogSelections[0]!)
      if (!template) fail(failures, 'empty append setup', 'could not create template')
      else {
        for (const dropped of fullCatalogSelections) {
          const empty = { ...template, props: [] }
          const result = appendVtgBuilderPattern(empty, dropped)
          const after = result ? previewStates(result) : undefined
          const expected = expectedDroppedState(dropped)
          if (!after || !expected || !statesMatchAll(after, [expected])) {
            fail(
              failures,
              `empty append ${describeSelection(dropped)}`,
              'initial portion is incorrect',
            )
          }
        }
      }

      expectNoFailures(failures)
    },
    auditTimeout,
  )
})
