import { describe, expect, it } from 'vitest'

import { removeVtgTransitionPatternPreview } from '@/features/vtg/math/createVtgTransitionQuickSlotAnimations'
import { findExplicitPlaneOrTurnsFrameIndices } from '@/math/animation/findExplicitPlaneOrTurnsFrameIndices'
import {
  auditTimeout,
  coreCompactSelections,
  createFailures,
  createInitial,
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

describe('exhaustive VTG Builder delete audit', () => {
  it(
    'deletes each local junction pair and independently covers cell, phase, and position',
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
          targetIndex: 0 as const,
        })),
        ...phasedCompactSelections.map((second, index) => ({
          first: fullCatalogSelections[index % fullCatalogSelections.length]!,
          second,
          third: phasedCompactSelections.at(-(index + 1))!,
          targetIndex: (index % 2) as 0 | 1,
        })),
      )

      for (const { first, second, third, targetIndex } of cases) {
        const context = `delete ${targetIndex} from ${describeSelection(first)} > ${describeSelection(second)} > ${describeSelection(third)}`
        const source = createThreePiece(first, second, third)
        const before = source ? previewStates(source) : undefined
        if (!source || !before) {
          fail(failures, context, 'could not create audit source')
          continue
        }
        const beforeInput = JSON.stringify(source)
        const result = removeVtgTransitionPatternPreview(source, targetIndex)
        const after = result ? previewStates(result) : undefined
        const expected = before.filter((_, index) => index !== targetIndex)
        if (!after || !statesMatchAll(after, expected)) {
          const mismatchIndex = after?.findIndex(
            (state, index) => expected[index] === undefined || !statesMatch(state, expected[index]),
          )
          fail(
            failures,
            context,
            mismatchIndex === undefined || mismatchIndex < 0
              ? 'the surviving preview count changed'
              : `survivor ${mismatchIndex}: expected ${JSON.stringify(expected[mismatchIndex])}, received ${JSON.stringify(after?.[mismatchIndex])}; source starts ${JSON.stringify(findExplicitPlaneOrTurnsFrameIndices(source, 2))}, result starts ${JSON.stringify(result && findExplicitPlaneOrTurnsFrameIndices(result, 2))}, lengths ${JSON.stringify(result?.props.map((prop) => prop.anim.length))}`,
          )
        }
        if (result && targetIndex > 0 && targetIndex < before.length - 1) {
          const sourceStarts = [
            0,
            ...findExplicitPlaneOrTurnsFrameIndices(source, 2).map((frameIndex) => frameIndex - 1),
          ]
          const resultStarts = [
            0,
            ...findExplicitPlaneOrTurnsFrameIndices(result, 2).map((frameIndex) => frameIndex - 1),
          ]
          const sourceTarget = sourceStarts[targetIndex + 1]! + 1
          const resultTarget = resultStarts[targetIndex]! + 1
          result.props.forEach((prop, propIndex) => {
            const sourceProp = source.props[propIndex]!
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

      for (const selection of fullCatalogSelections) {
        const source = createInitial(selection)
        const result = source ? removeVtgTransitionPatternPreview(source, 0) : undefined
        if (!result || result.props.length !== 0) {
          fail(
            failures,
            `delete only ${describeSelection(selection)}`,
            'did not return empty Builder',
          )
        }
      }

      expectNoFailures(failures)
    },
    auditTimeout,
  )
})
