import { describe, expect, it } from 'vitest'

import {
  areVtgBuilderSpinsEqual,
  getCompiledVtgBuilderMotion,
} from '@/features/builder/describeVtgBuilderMotion'
import { selectVtgBuilderJunctionPlane } from '@/features/builder/selectVtgBuilderJunctionPlane'
import { createDefaultVtgAnimation } from '@/features/vtg/createVtgAnimation'
import { rootCompile } from '@/math/animation/AnimFunc'

const withPlaneMask = (mask: number) => {
  const animation = createDefaultVtgAnimation({ reference: '5-1', speedRatio: '1:3' })
  if (!animation) throw new Error('Expected a supported VTG pattern')
  const compiled = rootCompile(animation)
  return {
    ...animation,
    props: animation.props.map((prop, propIndex) => ({
      ...prop,
      anim: prop.anim.map((frame, frameIndex) =>
        frameIndex === 1 && (mask & (1 << propIndex)) !== 0
          ? { ...frame, plane: compiled.props[propIndex]!.anim[1]!.plane + 180 }
          : { ...frame },
      ),
    })),
  }
}

describe('selectVtgBuilderJunctionPlane', () => {
  it('covers exactly both Plane directions for both props and never changes Axis', () => {
    const candidate = withPlaneMask(0)
    const axesBefore = candidate.props.map((prop) => prop.anim.map((frame) => frame.axis))

    for (const mask of [0, 1, 2, 3]) {
      const expected = getCompiledVtgBuilderMotion(rootCompile(withPlaneMask(mask)), 1)
      const result = selectVtgBuilderJunctionPlane(candidate, 1, {
        ...expected,
        // Together/Opposite belongs to the new hand placement and predecessor, not preservation.
        directions: [
          expected.directions[0] === 'S' ? 'O' : 'S',
          expected.directions[1] === 'S' ? 'O' : 'S',
        ],
      })
      if (!result) throw new Error(`Expected Plane mask ${mask} to be selectable`)

      expect(
        areVtgBuilderSpinsEqual(getCompiledVtgBuilderMotion(rootCompile(result), 1), expected),
      ).toBe(true)
      expect(result.props.map((prop) => prop.anim.map((frame) => frame.axis))).toEqual(axesBefore)
    }
  })
})
