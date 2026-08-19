import {
  areVtgBuilderSpinsEqual,
  getCompiledVtgBuilderMotion,
  type VtgBuilderMotion,
} from '@/features/builder/describeVtgBuilderMotion'
import { rootCompile } from '@/math/animation/AnimFunc'
import type { RootDataFinal } from '@/types/AnimTypes'

const planeMasks = [0, 1, 2, 3] as const

/** Selects one of the two Plane directions for each prop while preserving both Anti/In codes. */
export const selectVtgBuilderJunctionPlane = (
  candidate: RootDataFinal,
  targetFrameIndex: number,
  expectedMotion: VtgBuilderMotion,
): RootDataFinal | undefined => {
  const compiledCandidate = rootCompile(candidate)

  for (const planeMask of planeMasks) {
    const planeCandidate =
      planeMask === 0
        ? candidate
        : {
            ...candidate,
            props: candidate.props.map((prop, propIndex) => {
              if (propIndex > 1 || (planeMask & (1 << propIndex)) === 0) return prop
              const compiledRelationship =
                compiledCandidate.props[propIndex]?.anim[targetFrameIndex]
              if (!compiledRelationship) return prop
              return {
                ...prop,
                anim: prop.anim.map((frame, frameIndex) =>
                  frameIndex === targetFrameIndex
                    ? { ...frame, plane: compiledRelationship.plane + 180 }
                    : frame,
                ),
              }
            }),
          }
    const compiledPlaneCandidate = planeMask === 0 ? compiledCandidate : rootCompile(planeCandidate)
    if (
      areVtgBuilderSpinsEqual(
        getCompiledVtgBuilderMotion(compiledPlaneCandidate, targetFrameIndex),
        expectedMotion,
      )
    ) {
      return planeCandidate
    }
  }

  return undefined
}
