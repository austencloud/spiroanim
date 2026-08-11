import { rootCompile } from '@/math/animation/AnimFunc'
import { doublePlaybackMultiplier } from '@/math/animation/subdivideAnimationPlayback'
import type { AnimData, RootDataFinal } from '@/types/AnimTypes'
import type { VtgTransitionBeats } from '@/features/vtg/types'

const rotationTolerance = 0.000_001
const transitionPlane = 180
const defaultTransitionBeats = 5 satisfies VtgTransitionBeats
const doubledVtgBaseFrameCount = 9

const rotationsMatch = (first: readonly number[], second: readonly number[]) =>
  first.length === second.length &&
  first.every((value, index) => Math.abs(value - second[index]!) <= rotationTolerance)

const appendFrames = (
  animation: RootDataFinal,
  changedPropIndex: number | undefined,
  changedFrame: AnimData | undefined,
  transitionFrameCount: number,
): RootDataFinal => ({
  ...animation,
  props: animation.props.map((prop, propIndex) => ({
    ...prop,
    anim: [
      ...prop.anim,
      ...Array.from({ length: transitionFrameCount }, (_unused, frameIndex) =>
        propIndex === changedPropIndex && frameIndex === transitionFrameCount - 1
          ? { ...changedFrame }
          : {},
      ),
    ],
  })),
})

const replaceLastFrame = (
  animation: RootDataFinal,
  changedPropIndex: number | undefined,
  changedFrame: AnimData | undefined,
): RootDataFinal => ({
  ...animation,
  props: animation.props.map((prop, propIndex) => ({
    ...prop,
    anim: prop.anim.map((frame, frameIndex) =>
      propIndex === changedPropIndex && frameIndex === prop.anim.length - 1
        ? { ...frame, ...changedFrame }
        : frame,
    ),
  })),
})

const prepareFirstTransition = (
  animation: RootDataFinal,
  transitionBeats: VtgTransitionBeats,
): RootDataFinal => {
  const frameDelta = (transitionBeats - 4) * doublePlaybackMultiplier
  if (frameDelta > 0) return appendFrames(animation, undefined, undefined, frameDelta)
  if (frameDelta === 0) return animation

  return {
    ...animation,
    props: animation.props.map((prop) => ({
      ...prop,
      anim: prop.anim.slice(0, frameDelta),
    })),
  }
}

const alternateTurns = (turns: number, arc: number) => -turns - 2 * arc

const findFirstConvertibleProp = (animation: RootDataFinal): number | undefined => {
  const compiled = rootCompile(animation)

  for (const [propIndex, prop] of compiled.props.entries()) {
    const lastFrame = prop.anim.at(-1)
    if (!lastFrame) continue

    const candidate = rootCompile(
      replaceLastFrame(animation, propIndex, {
        turns: alternateTurns(lastFrame.turns, lastFrame.arc),
        plane: transitionPlane,
      }),
    )
    const candidateRotation = candidate.props[propIndex]?.anim.at(-1)?.rot
    const baselineRotation = compiled.props[propIndex]?.anim.at(-1)?.rot
    if (
      candidateRotation &&
      baselineRotation &&
      rotationsMatch(candidateRotation, baselineRotation)
    ) {
      return propIndex
    }
  }

  return undefined
}

/**
 * Extends a doubled closed cycle with alternating QTR/VTG relationship changes.
 * Five beats preserves the original complete-cycle-plus-transition timing. Shorter
 * experimental intervals trim doubled frames before the first change, then place
 * later changes at the selected beat interval. The turns transform preserves the
 * compiled rotation at the change frame while Plane 180 reverses its local rotation axis.
 */
export const alternatePatternPlayback = (
  animation: RootDataFinal,
  transitionBeats: VtgTransitionBeats = defaultTransitionBeats,
): RootDataFinal | undefined => {
  const firstProp = animation.props[0]
  if (!firstProp || animation.props.some((prop) => prop.anim.length !== firstProp.anim.length)) {
    return undefined
  }

  const cycleFrameCount = firstProp.anim.length - 1
  if (cycleFrameCount < 1 || animation.props.length < 1) return undefined

  const prepared = prepareFirstTransition(animation, transitionBeats)
  const firstConvertibleProp = findFirstConvertibleProp(prepared)
  if (firstConvertibleProp === undefined) return undefined

  const compiled = rootCompile(prepared)
  const inheritedTurns = compiled.props.map((prop) => prop.anim.at(-1)?.turns)
  const inheritedArcs = compiled.props.map((prop) => prop.anim.at(-1)?.arc)
  if (inheritedTurns.some((value) => value === undefined)) return undefined
  if (inheritedArcs.some((value) => value === undefined)) return undefined

  const changeCount = animation.props.length * doublePlaybackMultiplier
  let result = prepared

  for (let changeIndex = 0; changeIndex < changeCount; changeIndex += 1) {
    const propIndex = (firstConvertibleProp + changeIndex) % animation.props.length
    const turns = inheritedTurns[propIndex]
    const arc = inheritedArcs[propIndex]
    if (turns === undefined || arc === undefined) return undefined

    const nextTurns = alternateTurns(turns, arc)
    inheritedTurns[propIndex] = nextTurns
    const changedFrame = { turns: nextTurns, plane: transitionPlane }
    result =
      changeIndex === 0
        ? replaceLastFrame(result, propIndex, changedFrame)
        : appendFrames(result, propIndex, changedFrame, transitionBeats * doublePlaybackMultiplier)
  }

  return result
}

export interface AlternatingPatternPlaybackAnalysis {
  base: RootDataFinal
  transitionBeats: VtgTransitionBeats
}

const isTransitionBeatCount = (value: number): value is VtgTransitionBeats =>
  value >= 2 && value <= 6 && Number.isInteger(value)

/**
 * Recovers the doubled VTG/QTR cycle and timing from an alternating sequence.
 * Doubled VTG continuation frames are deliberately empty and inheritance-only,
 * so shortened modes can restore the removed tail without pattern regeneration.
 */
export const analyzeAlternatingPatternPlayback = (
  animation: RootDataFinal,
): AlternatingPatternPlaybackAnalysis | undefined => {
  const firstProp = animation.props[0]
  if (!firstProp || animation.props.length < 1) return undefined
  if (animation.props.some((prop) => prop.anim.length !== firstProp.anim.length)) return undefined

  const transitionBeats = (firstProp.anim.length - 1) / 8
  if (!isTransitionBeatCount(transitionBeats)) return undefined

  const firstChangeIndex = transitionBeats * doublePlaybackMultiplier
  const changedProps = animation.props.filter(
    (prop) => prop.anim[firstChangeIndex]?.plane === transitionPlane,
  )
  if (changedProps.length !== 1) return undefined

  const retainedBaseFrameCount = Math.min(doubledVtgBaseFrameCount, firstChangeIndex + 1)
  const base = {
    ...animation,
    props: animation.props.map((prop) => {
      const retainedFrames = prop.anim
        .slice(0, retainedBaseFrameCount)
        .map((frame) => ({ ...frame }))
      if (transitionBeats <= 4) retainedFrames[firstChangeIndex] = {}

      return {
        ...prop,
        anim: [
          ...retainedFrames,
          ...Array.from({ length: doubledVtgBaseFrameCount - retainedFrames.length }, () => ({})),
        ],
      }
    }),
  }

  return { base, transitionBeats }
}

/**
 * Uses the distinctive derived frame count to recover the original doubled
 * cycle without generating or caching every extended candidate.
 */
export const getAlternatingPatternBase = (animation: RootDataFinal): RootDataFinal | undefined => {
  return analyzeAlternatingPatternPlayback(animation)?.base
}
