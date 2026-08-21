import {
  areVtgBuilderMotionsEqual,
  areVtgBuilderSpinsEqual,
  getCompiledVtgBuilderMotion,
  type VtgBuilderMotion,
} from '@/features/builder/describeVtgBuilderMotion'
import { rootCompile } from '@/math/animation/AnimFunc'
import type { RootDataFinal } from '@/types/AnimTypes'

const planeMasks = [0, 1, 2, 3] as const
const normalizeSignedAngle = (angle: number): number => {
  const normalized = ((angle % 360) + 360) % 360
  return normalized > 180 ? normalized - 360 : normalized
}
const reverseDirectionAngle = (angle: number): number => normalizeSignedAngle(angle + 180)

const adjustJunctionDirections = (
  candidate: RootDataFinal,
  targetFrameIndex: number,
  planeMask: number,
  axisMask: number,
): RootDataFinal => {
  if (planeMask === 0 && axisMask === 0) return candidate

  const compiledCandidate = rootCompile(candidate)
  return {
    ...candidate,
    props: candidate.props.map((prop, propIndex) => {
      if (propIndex > 1) return prop
      const reversePlane = (planeMask & (1 << propIndex)) !== 0
      const reverseAxis = (axisMask & (1 << propIndex)) !== 0
      if (!reversePlane && !reverseAxis) return prop
      const compiledRelationship = compiledCandidate.props[propIndex]?.anim[targetFrameIndex]
      if (!compiledRelationship) return prop

      return {
        ...prop,
        anim: prop.anim.map((frame, frameIndex) =>
          frameIndex === targetFrameIndex
            ? {
                ...frame,
                ...(reversePlane
                  ? { plane: reverseDirectionAngle(compiledRelationship.plane) }
                  : undefined),
                ...(reverseAxis
                  ? { axis: reverseDirectionAngle(compiledRelationship.axis) }
                  : undefined),
              }
            : frame,
        ),
      }
    }),
  }
}

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
                    ? { ...frame, plane: reverseDirectionAngle(compiledRelationship.plane) }
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

/** Selects Plane and Axis directions that preserve the complete Builder motion code. */
export const selectVtgBuilderJunctionMotion = (
  candidate: RootDataFinal,
  targetFrameIndex: number,
  expectedMotion: VtgBuilderMotion,
): RootDataFinal | undefined => {
  for (const planeMask of planeMasks) {
    for (const axisMask of planeMasks) {
      const directionCandidate = adjustJunctionDirections(
        candidate,
        targetFrameIndex,
        planeMask,
        axisMask,
      )
      if (
        areVtgBuilderMotionsEqual(
          getCompiledVtgBuilderMotion(rootCompile(directionCandidate), targetFrameIndex),
          expectedMotion,
        )
      ) {
        return directionCandidate
      }
    }
  }

  return undefined
}
