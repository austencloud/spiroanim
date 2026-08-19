import { describe, expect, it } from 'vitest'

import { insertVtgBuilderPattern } from '@/features/builder/appendVtgBuilderPattern'
import { findExplicitPlaneOrTurnsFrameIndices } from '@/math/animation/findExplicitPlaneOrTurnsFrameIndices'
import {
  auditTimeout,
  coreCompactSelections,
  createFailures,
  createTwoPiece,
  describeSelection,
  expectNoFailures,
  expectedDroppedState,
  fail,
  fullCatalogSelections,
  inputWasMutated,
  phasedCompactSelections,
  previewStates,
  statesMatchAllSpinsAndDuration,
} from '@/features/builder/__audits__/vtgBuilderMutationAudit'

describe('exhaustive VTG Builder insert audit', () => {
  it(
    'inserts each junction pair while preserving survivor spins, durations, Axis, and suffixes',
    () => {
      expect.hasAssertions()
      const failures = createFailures()
      const cases = coreCompactSelections.flatMap((following) =>
        coreCompactSelections.flatMap((dropped) =>
          ([0, 1] as const).map((targetIndex) => ({
            first: fullCatalogSelections[0]!,
            following,
            dropped,
            targetIndex,
          })),
        ),
      )
      cases.push(
        ...fullCatalogSelections.flatMap((first, index) =>
          ([0, 1] as const).map((targetIndex) => ({
            first,
            following: coreCompactSelections[index % coreCompactSelections.length]!,
            dropped: coreCompactSelections[(index + 3) % coreCompactSelections.length]!,
            targetIndex,
          })),
        ),
        ...phasedCompactSelections.map((dropped, index) => ({
          first: fullCatalogSelections[index % fullCatalogSelections.length]!,
          following: phasedCompactSelections.at(-(index + 1))!,
          dropped,
          targetIndex: (index % 2) as 0 | 1,
        })),
      )

      for (const { first, following, dropped, targetIndex } of cases) {
        const context = `insert ${describeSelection(dropped)} at ${targetIndex} before ${describeSelection(following)}`
        const source = createTwoPiece(first, following)
        const before = source ? previewStates(source) : undefined
        const expectedDrop = expectedDroppedState(dropped)
        if (!source || !before || !expectedDrop) {
          fail(failures, context, 'could not create audit source')
          continue
        }
        const beforeInput = JSON.stringify(source)
        const result = insertVtgBuilderPattern(source, dropped, targetIndex)
        const after = result ? previewStates(result) : undefined
        const expected = [
          ...before.slice(0, targetIndex),
          expectedDrop,
          ...before.slice(targetIndex),
        ]
        if (!after || !statesMatchAllSpinsAndDuration(after, expected)) {
          fail(failures, context, 'inserted or preserved Anti/In spins or duration are incorrect')
        }
        if (result) {
          const sourceStarts = [
            0,
            ...findExplicitPlaneOrTurnsFrameIndices(source, 2).map((frameIndex) => frameIndex - 1),
          ]
          const resultStarts = [
            0,
            ...findExplicitPlaneOrTurnsFrameIndices(result, 2).map((frameIndex) => frameIndex - 1),
          ]
          const sourceTarget = sourceStarts[targetIndex]! + 1
          const resultTarget = resultStarts[targetIndex + 1]! + 1
          result.props.forEach((prop, propIndex) => {
            const sourceProp = source.props[propIndex]!
            if (prop.anim[resultTarget]?.axis !== sourceProp.anim[sourceTarget]?.axis) {
              fail(failures, context, `changed following prop ${propIndex + 1} Axis`)
            }
            if (
              JSON.stringify(prop.anim.slice(resultTarget + 1)) !==
              JSON.stringify(sourceProp.anim.slice(sourceTarget + 1))
            ) {
              fail(failures, context, `changed authored prop ${propIndex + 1} suffix`)
            }
          })
        }
        if (inputWasMutated(beforeInput, source)) fail(failures, context, 'mutated its input')
      }

      expectNoFailures(failures)
    },
    auditTimeout,
  )
})
