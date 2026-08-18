import { rootCompile } from '@/math/animation/AnimFunc'
import { alignCompiledRelationshipDirection } from '@/math/animation/alignCompiledRelationshipDirection'
import { findExplicitPlaneOrTurnsFrameIndices } from '@/math/animation/findExplicitPlaneOrTurnsFrameIndices'
import {
  shiftAnimationFrameRange,
  shiftAnimationFrames,
} from '@/math/animation/shiftAnimationFrames'
import { doublePlaybackMultiplier } from '@/math/animation/subdivideAnimationPlayback'
import type { VtgPatternRotationFilter } from '@/features/vtg/types'
import type { AnimData, AnimDataCompiled, RootDataFinal } from '@/types/AnimTypes'

const extractedPatternSourceFrameCount = 2
const doubledVtgFrameCount = 9
const transitionSegmentCount = 4
const rigidShapeMatchTolerance = 1e-8

export type VtgTransitionQuickSlotCandidates = readonly RootDataFinal[]
export type VtgTransitionPreviewAnimations = readonly RootDataFinal[]

export const getVtgTransitionPreviewBeatCount = (animation: RootDataFinal): number => {
  const frames = rootCompile(animation).props[0]?.anim
  if (!frames || frames.length < 2) return 0

  const doubledBeatCount = frames.slice(0, -1).reduce((total, frame) => total + frame.beats, 0)
  return doubledBeatCount / doublePlaybackMultiplier
}

type ShapeVector = AnimDataCompiled['pos']

const dotShapeVectors = (first: ShapeVector, second: ShapeVector) =>
  first.reduce((total, value, index) => total + value * second[index]!, 0)

const shapeTripleProduct = (first: ShapeVector, second: ShapeVector, third: ShapeVector) =>
  first[0] * (second[1] * third[2] - second[2] * third[1]) -
  first[1] * (second[0] * third[2] - second[2] * third[0]) +
  first[2] * (second[0] * third[1] - second[1] * third[0])

/** Compares a prop's complete hand/prop shape while allowing one rigid rotation of the result. */
const getCompiledTrackShapeDifference = (
  actual: readonly AnimDataCompiled[],
  expected: readonly AnimDataCompiled[],
) => {
  if (actual.length !== expected.length) return Number.POSITIVE_INFINITY

  const actualVectors = actual.flatMap((frame) => [frame.pos, frame.rot, frame.posx, frame.rotx])
  const expectedVectors = expected.flatMap((frame) => [
    frame.pos,
    frame.rot,
    frame.posx,
    frame.rotx,
  ])
  let difference = 0

  // Pairwise dot products preserve the complete shape under rotation. Signed triple products
  // additionally distinguish mirrored paths, which is required to retain Anti versus In.
  for (let firstIndex = 0; firstIndex < actualVectors.length; firstIndex++) {
    const actualFirst = actualVectors[firstIndex]
    const expectedFirst = expectedVectors[firstIndex]
    if (!actualFirst || !expectedFirst) return Number.POSITIVE_INFINITY

    for (let secondIndex = firstIndex; secondIndex < actualVectors.length; secondIndex++) {
      const actualSecond = actualVectors[secondIndex]
      const expectedSecond = expectedVectors[secondIndex]
      if (!actualSecond || !expectedSecond) return Number.POSITIVE_INFINITY
      difference += Math.abs(
        dotShapeVectors(actualFirst, actualSecond) - dotShapeVectors(expectedFirst, expectedSecond),
      )

      for (let thirdIndex = secondIndex + 1; thirdIndex < actualVectors.length; thirdIndex++) {
        const actualThird = actualVectors[thirdIndex]
        const expectedThird = expectedVectors[thirdIndex]
        if (!actualThird || !expectedThird) return Number.POSITIVE_INFINITY
        difference += Math.abs(
          shapeTripleProduct(actualFirst, actualSecond, actualThird) -
            shapeTripleProduct(expectedFirst, expectedSecond, expectedThird),
        )
      }
    }
  }

  return difference
}

export const resizeVtgTransitionPatternPreview = (
  animation: RootDataFinal,
  previewIndex: number,
  beatCount: number,
): RootDataFinal | undefined => {
  const firstProp = animation.props[0]
  if (!firstProp) return undefined

  const relationshipChangeFrames = findExplicitPlaneOrTurnsFrameIndices(
    animation,
    extractedPatternSourceFrameCount,
  )
  const sliceStarts = [0, ...relationshipChangeFrames.map((frameIndex) => frameIndex - 1)]
  const startFrameIndex = sliceStarts[previewIndex]
  if (startFrameIndex === undefined) return undefined

  const nextStartFrameIndex = sliceStarts[previewIndex + 1]
  const currentIntervalCount =
    nextStartFrameIndex === undefined
      ? firstProp.anim.length - startFrameIndex - 1
      : nextStartFrameIndex - startFrameIndex
  const targetIntervalCount = Math.round(beatCount * doublePlaybackMultiplier)
  const intervalDelta = targetIntervalCount - currentIntervalCount
  if (intervalDelta === 0) return animation

  return {
    ...animation,
    props: animation.props.map((prop) => ({
      ...prop,
      anim: (() => {
        const frames = prop.anim.map((frame) => ({ ...frame }))
        if (nextStartFrameIndex === undefined) {
          if (intervalDelta > 0) frames.push(...Array.from({ length: intervalDelta }, () => ({})))
          else frames.splice(frames.length + intervalDelta, -intervalDelta)
        } else if (intervalDelta > 0) {
          frames.splice(
            nextStartFrameIndex + 1,
            0,
            ...Array.from({ length: intervalDelta }, () => ({})),
          )
        } else {
          frames.splice(nextStartFrameIndex + intervalDelta + 1, -intervalDelta)
        }
        return frames
      })(),
    })),
  }
}

/** Removes one Builder preview while preserving the authored relationship that follows it. */
export const removeVtgTransitionPatternPreview = (
  animation: RootDataFinal,
  previewIndex: number,
): RootDataFinal | undefined => {
  const firstProp = animation.props[0]
  if (!firstProp || animation.props.some((prop) => prop.anim.length !== firstProp.anim.length)) {
    return undefined
  }

  const relationshipChangeFrames = findExplicitPlaneOrTurnsFrameIndices(
    animation,
    extractedPatternSourceFrameCount,
  )
  const sliceStarts = [0, ...relationshipChangeFrames.map((frameIndex) => frameIndex - 1)]
  const startFrameIndex = sliceStarts[previewIndex]
  if (startFrameIndex === undefined) return undefined

  const nextStartFrameIndex = sliceStarts[previewIndex + 1]
  if (previewIndex === 0) {
    if (nextStartFrameIndex === undefined) {
      return { ...animation, props: [] }
    }

    // Rebase the next closed slice exactly as preview extraction does so all inherited position
    // and rotation state becomes its valid standalone starting state.
    const shifted = shiftClosedAnimation(animation, nextStartFrameIndex, true)
    if (!shifted) return undefined
    const remainingFrameCount = firstProp.anim.length - nextStartFrameIndex
    return {
      ...shifted,
      props: shifted.props.map((prop) => ({
        ...prop,
        anim: prop.anim.slice(0, remainingFrameCount).map((frame) => ({ ...frame })),
      })),
    }
  }

  const deleteEndFrameIndex = nextStartFrameIndex ?? firstProp.anim.length - 1
  const deleteCount = deleteEndFrameIndex - startFrameIndex
  const followingPreview =
    nextStartFrameIndex === undefined
      ? undefined
      : createVtgTransitionPreviewAnimations(animation)?.[previewIndex + 1]
  if (!followingPreview) {
    return {
      ...animation,
      props: animation.props.map((prop) => ({
        ...prop,
        anim: [
          ...prop.anim.slice(0, startFrameIndex + 1).map((frame) => ({ ...frame })),
          ...prop.anim.slice(startFrameIndex + 1 + deleteCount).map((frame) => ({ ...frame })),
        ],
      })),
    }
  }

  const nextFollowingStartFrameIndex = sliceStarts[previewIndex + 2]
  const buildCandidate = (
    followingTracks: readonly (readonly AnimData[])[],
  ): RootDataFinal | undefined => {
    const props: RootDataFinal['props'] = []
    for (const [propIndex, prop] of animation.props.entries()) {
      const prefix = prop.anim.slice(0, startFrameIndex + 1).map((frame) => ({ ...frame }))
      const followingTrack = followingTracks[propIndex]
      if (!followingTrack) return undefined

      const tailStart =
        nextFollowingStartFrameIndex === undefined
          ? prop.anim.length
          : nextFollowingStartFrameIndex + 1
      props.push({
        ...prop,
        // Rejoin the immediate following piece at its selected phase. Later pieces remain
        // authored exactly as they were.
        anim: [
          ...prefix,
          ...followingTrack.slice(1).map((frame) => ({ ...frame })),
          ...prop.anim.slice(tailStart).map((frame) => ({ ...frame })),
        ],
      })
    }

    return { ...animation, props }
  }

  const expectedPreviews = createVtgTransitionPreviewAnimations(animation)?.slice(previewIndex + 1)
  if (!expectedPreviews) return undefined

  const shiftedTracks = followingPreview.props.map((prop, propIndex) => {
    const variants: AnimData[][] = [prop.anim.map((frame) => ({ ...frame }))]
    for (let shift = 1; shift < prop.anim.length; shift++) {
      const previous = variants.at(-1)
      if (!previous) break
      const compiled = rootCompile({
        ...followingPreview,
        props: followingPreview.props.map((candidateProp, candidatePropIndex) => ({
          ...candidateProp,
          anim: candidatePropIndex === propIndex ? previous : candidateProp.anim,
        })),
      }).props[propIndex]
      if (!compiled) break

      const shifted = shiftAnimationFrameRange(previous, compiled.anim, 0, previous.length - 1, {
        allowEndpointMismatch: true,
      })
      if (!shifted) break
      variants.push(shifted)
    }
    return variants
  })
  const firstPropVariants = shiftedTracks[0]
  const secondPropVariants = shiftedTracks[1]
  if (!firstPropVariants || !secondPropVariants) return undefined

  const scoreCandidate = (candidate: RootDataFinal): number => {
    const candidatePreviews = createVtgTransitionPreviewAnimations(candidate)?.slice(previewIndex)
    if (!candidatePreviews || candidatePreviews.length !== expectedPreviews.length) {
      return Number.POSITIVE_INFINITY
    }

    let score = 0
    for (const [candidatePreviewIndex, candidatePreview] of candidatePreviews.entries()) {
      const expectedPreview = expectedPreviews[candidatePreviewIndex]
      if (!expectedPreview) return Number.POSITIVE_INFINITY

      const candidateCompiled = rootCompile(candidatePreview)
      const expectedCompiled = rootCompile(expectedPreview)
      if (candidateCompiled.props.length !== expectedCompiled.props.length) {
        return Number.POSITIVE_INFINITY
      }

      for (const [propIndex, candidateProp] of candidateCompiled.props.entries()) {
        const expectedProp = expectedCompiled.props[propIndex]
        if (!expectedProp) return Number.POSITIVE_INFINITY
        score += getCompiledTrackShapeDifference(candidateProp.anim, expectedProp.anim)
      }
    }

    return score
  }

  let bestCandidate: RootDataFinal | undefined
  let bestScore = Number.POSITIVE_INFINITY
  for (const swapTracks of [false, true]) {
    const firstVariants = swapTracks ? secondPropVariants : firstPropVariants
    const secondVariants = swapTracks ? firstPropVariants : secondPropVariants
    for (const firstTrack of firstVariants) {
      for (const secondTrack of secondVariants) {
        const rawCandidate = buildCandidate([firstTrack, secondTrack])
        if (!rawCandidate) continue
        const candidate = alignCompiledRelationshipDirection(
          rawCandidate,
          startFrameIndex + 1,
          followingPreview,
          1,
        )
        const score = scoreCandidate(candidate)
        if (score <= rigidShapeMatchTolerance) return candidate
        if (!bestCandidate || score < bestScore) {
          bestCandidate = candidate
          bestScore = score
        }
      }
    }
  }

  return bestCandidate
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
  allowEndpointMismatch = false,
): RootDataFinal | undefined => {
  let shifted = cloneAnimation(animation)

  for (let repetition = 0; repetition < repetitions; repetition++) {
    const compiled = rootCompile(shifted)
    const shiftedFrames = shifted.props.map((prop, propIndex) => {
      const compiledProp = compiled.props[propIndex]
      if (!compiledProp) return undefined
      return allowEndpointMismatch
        ? shiftAnimationFrameRange(prop.anim, compiledProp.anim, 0, prop.anim.length - 1, {
            allowEndpointMismatch: true,
          })
        : shiftAnimationFrames(prop.anim, compiledProp.anim)
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
    const shifted = shiftClosedAnimation(animation, startFrameIndex, true)
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
