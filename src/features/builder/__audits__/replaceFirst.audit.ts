import { describe, expect, it } from 'vitest'

import { replaceFirstVtgBuilderPattern } from '@/features/builder/appendVtgBuilderPattern'
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
  variedFullSelections,
} from '@/features/builder/__audits__/vtgBuilderMutationAudit'

const relationshipStarts = (animation: Parameters<typeof previewStates>[0]): readonly number[] => [
  0,
  ...findExplicitPlaneOrTurnsFrameIndices(animation, 2).map((frameIndex) => frameIndex - 1),
]

describe('exhaustive VTG Builder first-replacement audit', () => {
  it(
    'crosses every replacement cell with every successor motion and covers phase controls separately',
    () => {
      expect.hasAssertions()
      const failures = createFailures()
      const cases = [
        ...fullCatalogSelections.flatMap((replacement) =>
          coreCompactSelections.map((following) => ({
            replacement,
            following,
          })),
        ),
        ...phasedCompactSelections.map((following, index) => ({
          replacement: fullCatalogSelections[index % fullCatalogSelections.length]!,
          following,
        })),
        ...variedFullSelections.map((replacement, index) => ({
          replacement,
          following: coreCompactSelections[index % coreCompactSelections.length]!,
        })),
      ]

      for (const { replacement, following } of cases) {
        const context = `replace first with ${describeSelection(replacement)} before ${describeSelection(following)}`
        const source = createTwoPiece(fullCatalogSelections[0]!, following)
        const before = source ? previewStates(source) : undefined
        const expectedReplacement = expectedDroppedState(replacement)
        if (!source || !before || !expectedReplacement) {
          fail(failures, context, 'could not create audit source')
          continue
        }
        const beforeInput = JSON.stringify(source)
        const result = replaceFirstVtgBuilderPattern(source, replacement)
        const after = result ? previewStates(result) : undefined
        const expected = [expectedReplacement, ...before.slice(1)]
        if (!after || !statesMatchAllSpinsAndDuration(after, expected)) {
          fail(
            failures,
            context,
            result
              ? `expected ${JSON.stringify(expected)}, received ${JSON.stringify(after)}`
              : 'none of the four Plane combinations retained the following Anti/In relationship',
          )
        }
        if (result) {
          const sourceFollowingTarget = relationshipStarts(source)[1]! + 1
          const resultFollowingTarget = relationshipStarts(result)[1]! + 1
          result.props.forEach((prop, propIndex) => {
            const sourceProp = source.props[propIndex]
            if (!sourceProp) {
              fail(failures, context, `lost prop ${propIndex + 1}`)
              return
            }
            if (
              prop.anim[resultFollowingTarget]?.axis !==
              sourceProp.anim[sourceFollowingTarget]?.axis
            ) {
              fail(failures, context, `changed prop ${propIndex + 1} Axis`)
            }
            if (
              JSON.stringify(prop.anim.slice(resultFollowingTarget + 1)) !==
              JSON.stringify(sourceProp.anim.slice(sourceFollowingTarget + 1))
            ) {
              fail(
                failures,
                context,
                `changed authored frames after prop ${propIndex + 1} junction`,
              )
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
