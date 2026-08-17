import { rootCompile } from '@/math/animation/AnimFunc'
import { analyzeAlternatingPatternPlayback } from '@/math/animation/alternatePatternPlayback'
import { shiftAnimationFrames } from '@/math/animation/shiftAnimationFrames'
import { doublePlaybackMultiplier } from '@/math/animation/subdivideAnimationPlayback'
import type { VtgPatternRotationFilter } from '@/features/vtg/types'
import type { RootDataFinal } from '@/types/AnimTypes'

const extractedPatternSourceFrameCount = 2
const transitionSegmentCount = 4

export type VtgTransitionQuickSlotCandidateGroups = readonly (readonly RootDataFinal[])[]

export type VtgTransitionQuickSlotResolution =
  | { status: 'matched'; animations: readonly RootDataFinal[] }
  | { status: 'invalid'; slot: number }
  | { status: 'unmatched'; slot: number }

type VtgTransitionQuickSlotMatcher = (
  animation: RootDataFinal,
  rotationFilter: VtgPatternRotationFilter,
) => boolean | Promise<boolean>

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

const createDoubledCyclePhases = (animation: RootDataFinal): readonly RootDataFinal[] => {
  const phases = [animation]
  const cycleFrameCount = (animation.props[0]?.anim.length ?? 1) - 1
  let shifted = animation

  // A transition may itself have been shifted by an authored frame. Keep the raw extraction first,
  // then offer every cyclic phase so QSlots can retain the first one recognized by the matcher.
  for (let shiftCount = 1; shiftCount < cycleFrameCount; shiftCount++) {
    const next = shiftClosedAnimation(shifted, 1)
    if (!next) break
    shifted = next
    phases.push(shifted)
  }

  return phases
}

/**
 * Creates candidates for the current reciprocal transition and the four closed doubled-cycle
 * patterns surrounding its detected relationship changes. Each extracted cycle is followed by all
 * of its cyclic phases so the pattern matcher can select a recognizable phase during generation.
 */
export const createVtgTransitionQuickSlotAnimationCandidates = (
  animation: RootDataFinal,
): VtgTransitionQuickSlotCandidateGroups | undefined => {
  const analysis = analyzeAlternatingPatternPlayback(animation)
  const targetFrameCount = analysis?.base.props[0]?.anim.length
  if (
    !analysis ||
    targetFrameCount === undefined ||
    animation.props.length !== 2 ||
    analysis.base.props.some((prop) => prop.anim.length !== targetFrameCount)
  ) {
    return undefined
  }

  const transitionFrameCount = analysis.transitionBeats * doublePlaybackMultiplier
  const segmentShiftCounts = Array.from(
    { length: transitionSegmentCount },
    (_unused, segmentIndex) => (segmentIndex === 0 ? 0 : segmentIndex * transitionFrameCount + 1),
  )
  const segments = segmentShiftCounts.map((shiftCount) => {
    const shifted = shiftClosedAnimation(animation, shiftCount)
    const extracted = shifted ? extractDoubledCycle(shifted, targetFrameCount) : undefined
    return extracted ? createDoubledCyclePhases(extracted) : undefined
  })
  if (segments.some((segment) => segment === undefined)) return undefined

  return [[cloneAnimation(animation)], ...segments.map((segment) => segment!)]
}

/**
 * Resolves every generated slot through the same pattern matcher used by Concepts. A complete
 * result is returned only when all four extracted cycles have a recognized phase. Rotation is
 * deliberately the final comparison tier.
 */
export const resolveVtgTransitionQuickSlotAnimations = async (
  candidateGroups: VtgTransitionQuickSlotCandidateGroups,
  matches: VtgTransitionQuickSlotMatcher,
): Promise<VtgTransitionQuickSlotResolution> => {
  const animations: RootDataFinal[] = []

  for (const [slotIndex, candidates] of candidateGroups.entries()) {
    const firstCandidate = candidates[0]
    if (!firstCandidate) return { status: 'invalid', slot: slotIndex + 1 }
    if (slotIndex === 0) {
      animations.push(firstCandidate)
      continue
    }

    let matched: RootDataFinal | undefined
    for (const rotationFilter of ['unrotated', 'rotated'] as const) {
      for (const candidate of candidates) {
        if (await matches(candidate, rotationFilter)) {
          matched = candidate
          break
        }
      }
      if (matched) break
    }

    if (!matched) return { status: 'unmatched', slot: slotIndex + 1 }
    animations.push(matched)
  }

  return { status: 'matched', animations }
}
