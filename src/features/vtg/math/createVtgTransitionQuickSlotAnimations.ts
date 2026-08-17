import { rootCompile } from '@/math/animation/AnimFunc'
import { findExplicitPlaneOrTurnsFrameIndices } from '@/math/animation/findExplicitPlaneOrTurnsFrameIndices'
import { shiftAnimationFrames } from '@/math/animation/shiftAnimationFrames'
import { doublePlaybackMultiplier } from '@/math/animation/subdivideAnimationPlayback'
import type { VtgPatternRotationFilter } from '@/features/vtg/types'
import type { RootDataFinal } from '@/types/AnimTypes'

const extractedPatternSourceFrameCount = 2
const doubledVtgFrameCount = 9
const transitionSegmentCount = 4

export type VtgTransitionQuickSlotCandidates = readonly RootDataFinal[]
export type VtgTransitionPreviewAnimations = readonly RootDataFinal[]

export const getVtgTransitionPreviewBeatCount = (animation: RootDataFinal): number => {
  const frames = rootCompile(animation).props[0]?.anim
  if (!frames || frames.length < 2) return 0

  const doubledBeatCount = frames.slice(0, -1).reduce((total, frame) => total + frame.beats, 0)
  return doubledBeatCount / doublePlaybackMultiplier
}

export type VtgTransitionQuickSlotResolution =
  | { status: 'matched'; animations: readonly RootDataFinal[] }
  | {
      status: 'partial'
      animations: readonly RootDataFinal[]
      unmatchedSlots: readonly number[]
    }

type VtgTransitionQuickSlotMatcher = (
  animation: RootDataFinal,
  rotationFilter: VtgPatternRotationFilter,
) => VtgTransitionQuickSlotMatchKind | false | Promise<VtgTransitionQuickSlotMatchKind | false>

export type VtgTransitionQuickSlotMatchKind = 'exact' | 'transitionTurns'

const cloneAnimation = (animation: RootDataFinal): RootDataFinal => ({
  ...animation,
  props: animation.props.map((prop) => ({
    ...prop,
    anim: prop.anim.map((frame) => ({ ...frame })),
  })),
})

const shiftClosedAnimation = (
  animation: RootDataFinal,
  repetitions: number,
): RootDataFinal | undefined => {
  let shifted = cloneAnimation(animation)

  for (let repetition = 0; repetition < repetitions; repetition++) {
    const compiled = rootCompile(shifted)
    const shiftedFrames = shifted.props.map((prop, propIndex) => {
      const compiledProp = compiled.props[propIndex]
      return compiledProp ? shiftAnimationFrames(prop.anim, compiledProp.anim) : undefined
    })
    if (shiftedFrames.some((frames) => frames === undefined)) return undefined

    shifted = {
      ...shifted,
      props: shifted.props.map((prop, propIndex) => ({
        ...prop,
        anim: shiftedFrames[propIndex]!,
      })),
    }
  }

  return shifted
}

const extractDoubledCycle = (
  animation: RootDataFinal,
  targetFrameCount: number,
): RootDataFinal | undefined => {
  if (
    targetFrameCount < extractedPatternSourceFrameCount ||
    animation.props.some((prop) => prop.anim.length < extractedPatternSourceFrameCount)
  ) {
    return undefined
  }

  return {
    ...animation,
    props: animation.props.map((prop) => ({
      ...prop,
      anim: [
        ...prop.anim.slice(0, extractedPatternSourceFrameCount).map((frame) => ({ ...frame })),
        ...Array.from({ length: targetFrameCount - extractedPatternSourceFrameCount }, () => ({})),
      ],
    })),
  }
}

/**
 * Extracts pattern regions using the same relationship boundaries as Q2-Q5 while retaining each
 * duration. A relationship authored on frame N describes the path from N-1 into N, so adjacent
 * slices share frame N-1 and the following slice owns that complete visual segment.
 */
export const createVtgTransitionPreviewAnimations = (
  animation: RootDataFinal,
): VtgTransitionPreviewAnimations | undefined => {
  const firstProp = animation.props[0]
  if (
    !firstProp ||
    animation.props.length !== 2 ||
    animation.props.some((prop) => prop.anim.length !== firstProp.anim.length)
  ) {
    return undefined
  }

  const relationshipChangeFrames = findExplicitPlaneOrTurnsFrameIndices(
    animation,
    extractedPatternSourceFrameCount,
  )
  const sliceStarts = [0, ...relationshipChangeFrames.map((frameIndex) => frameIndex - 1)]

  const previews = sliceStarts.map((startFrameIndex, sliceIndex) => {
    const shifted = shiftClosedAnimation(animation, startFrameIndex)
    if (!shifted) return undefined

    const nextStartFrameIndex = sliceStarts[sliceIndex + 1]
    const sliceFrameCount =
      nextStartFrameIndex === undefined
        ? firstProp.anim.length - startFrameIndex
        : nextStartFrameIndex - startFrameIndex + 1

    return {
      ...shifted,
      props: shifted.props.map((prop) => ({
        ...prop,
        anim: prop.anim.slice(0, sliceFrameCount).map((frame) => ({ ...frame })),
      })),
    }
  })
  if (previews.some((preview) => preview === undefined)) return undefined

  return previews.map((preview) => preview!)
}

/**
 * Creates candidates for the current reciprocal transition and the four closed doubled-cycle
 * patterns surrounding its detected relationship changes. The matcher recognizes every half-beat
 * starting position directly, so each segment needs only its raw extracted cycle.
 */
export const createVtgTransitionQuickSlotAnimationCandidates = (
  animation: RootDataFinal,
): VtgTransitionQuickSlotCandidates | undefined => {
  const firstProp = animation.props[0]
  if (
    !firstProp ||
    animation.props.length !== 2 ||
    animation.props.some((prop) => prop.anim.length !== firstProp.anim.length)
  ) {
    return undefined
  }

  const relationshipChangeFrames = findExplicitPlaneOrTurnsFrameIndices(
    animation,
    extractedPatternSourceFrameCount,
  )
  const segmentShiftCounts = [
    0,
    ...relationshipChangeFrames
      .slice(0, transitionSegmentCount - 1)
      .map((frameIndex) => frameIndex + 1),
  ]
  if (segmentShiftCounts.length !== transitionSegmentCount) return undefined

  const segments = segmentShiftCounts.map((shiftCount) => {
    const shifted = shiftClosedAnimation(animation, shiftCount)
    return shifted ? extractDoubledCycle(shifted, doubledVtgFrameCount) : undefined
  })
  if (segments.some((segment) => segment === undefined)) return undefined

  return [cloneAnimation(animation), ...segments.map((segment) => segment!)]
}

/**
 * Resolves every generated slot through the same pattern matcher used by Concepts. Rotation is
 * deliberately the final comparison tier. When an extraction is not recognized, it is retained so
 * one unknown pattern cannot prevent the complete transition set from being created; the partial
 * result identifies every such slot to the UI.
 */
export const resolveVtgTransitionQuickSlotAnimations = async (
  candidates: VtgTransitionQuickSlotCandidates,
  matches: VtgTransitionQuickSlotMatcher,
): Promise<VtgTransitionQuickSlotResolution> => {
  const animations: RootDataFinal[] = []
  const unmatchedSlots: number[] = []

  for (const [slotIndex, candidate] of candidates.entries()) {
    if (slotIndex === 0) {
      animations.push(candidate)
      continue
    }

    let matched = false
    for (const matchKind of ['exact', 'transitionTurns'] as const) {
      for (const rotationFilter of ['unrotated', 'rotated'] as const) {
        matched = (await matches(candidate, rotationFilter)) === matchKind
        if (matched) break
      }
      if (matched) break
    }

    if (matched) {
      animations.push(candidate)
    } else {
      animations.push(candidate)
      unmatchedSlots.push(slotIndex + 1)
    }
  }

  return unmatchedSlots.length > 0
    ? { status: 'partial', animations, unmatchedSlots }
    : { status: 'matched', animations }
}
