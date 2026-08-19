import { selectVtgBuilderJunctionPlane } from '@/features/builder/selectVtgBuilderJunctionPlane'
import { rootCompile } from '@/math/animation/AnimFunc'
import type { VtgBuilderMotion } from '@/features/builder/describeVtgBuilderMotion'
import type { AnimData, RootDataFinal } from '@/types/AnimTypes'

/**
 * Rejoins an authored Builder suffix after a changed prefix. Inherited scalar values are
 * materialized at the new junction, Axis remains authored, and only the four Plane directions are
 * considered when preserving the two prop Anti/In results.
 */
export const rejoinVtgBuilderJunction = (
  candidate: RootDataFinal,
  candidateStartFrameIndex: number,
  following: RootDataFinal,
  followingStartFrameIndex: number,
  expectedMotion: VtgBuilderMotion,
): RootDataFinal | undefined => {
  const followingTargetFrameIndex = followingStartFrameIndex + 1
  const compiledFollowing = rootCompile(following)
  const props: RootDataFinal['props'] = []

  for (const [propIndex, prop] of candidate.props.entries()) {
    const followingProp = following.props[propIndex]
    const relationship = followingProp?.anim[followingTargetFrameIndex]
    const compiledRelationship = compiledFollowing.props[propIndex]?.anim[followingTargetFrameIndex]
    if (!followingProp || !relationship || !compiledRelationship) return undefined

    const materializedRelationship: AnimData = {
      ...relationship,
      turns: compiledRelationship.turns,
      beats: compiledRelationship.beats,
      scale: compiledRelationship.scale,
      depth: compiledRelationship.depth,
      type: compiledRelationship.type,
      adjust: compiledRelationship.adjust,
      arc: compiledRelationship.arc,
      plane: compiledRelationship.plane,
    }
    props.push({
      ...prop,
      anim: [
        ...prop.anim.slice(0, candidateStartFrameIndex + 1).map((frame) => ({ ...frame })),
        materializedRelationship,
        ...followingProp.anim.slice(followingTargetFrameIndex + 1).map((frame) => ({ ...frame })),
      ],
    })
  }

  return selectVtgBuilderJunctionPlane(
    { ...candidate, props },
    candidateStartFrameIndex + 1,
    expectedMotion,
  )
}
