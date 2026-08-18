import { rootCompile } from '@/math/animation/AnimFunc'
import type { AnimDataCompiled, RootDataFinal } from '@/types/AnimTypes'
import { Vector3 } from 'three'

const relativeSignedAxisDirection = (
  first: readonly AnimDataCompiled[],
  second: readonly AnimDataCompiled[],
  targetIndex: number,
) => {
  const signedAxis = (frames: readonly AnimDataCompiled[]) => {
    const target = frames[targetIndex]
    return target
      ? new Vector3()
          .fromArray(target.posx)
          .multiplyScalar(Math.sign(target.arc) || 1)
          .normalize()
      : undefined
  }
  const firstAxis = signedAxis(first)
  const secondAxis = signedAxis(second)
  return firstAxis && secondAxis ? Math.sign(firstAxis.dot(secondAxis)) : undefined
}

/** Flips the second prop's Plane when a rebuilt junction reverses the source relationship. */
export const alignCompiledRelationshipDirection = (
  candidate: RootDataFinal,
  candidateTargetIndex: number,
  source: RootDataFinal,
  sourceTargetIndex: number,
): RootDataFinal => {
  if (candidate.props.length < 2 || source.props.length < 2) return candidate
  const compiledCandidate = rootCompile(candidate)
  const compiledSource = rootCompile(source)
  const candidateDirection = relativeSignedAxisDirection(
    compiledCandidate.props[0]!.anim,
    compiledCandidate.props[1]!.anim,
    candidateTargetIndex,
  )
  const sourceDirection = relativeSignedAxisDirection(
    compiledSource.props[0]!.anim,
    compiledSource.props[1]!.anim,
    sourceTargetIndex,
  )
  if (sourceDirection === undefined || sourceDirection === candidateDirection) return candidate

  const secondProp = candidate.props[1]!
  const relationship = secondProp.anim[candidateTargetIndex]
  const compiledRelationship = compiledCandidate.props[1]!.anim[candidateTargetIndex]
  if (!relationship || !compiledRelationship) return candidate
  return {
    ...candidate,
    props: candidate.props.map((prop, index) =>
      index === 1
        ? {
            ...prop,
            anim: prop.anim.map((frame, frameIndex) =>
              frameIndex === candidateTargetIndex
                ? { ...frame, plane: (frame.plane ?? compiledRelationship.plane) + 180 }
                : frame,
            ),
          }
        : prop,
    ),
  }
}
