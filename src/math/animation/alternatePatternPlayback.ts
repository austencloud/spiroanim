import { rootCompile } from '@/math/animation/AnimFunc'
import { doublePlaybackMultiplier } from '@/math/animation/subdivideAnimationPlayback'
import type { AnimData, RootDataFinal } from '@/types/AnimTypes'
import { vtgDefaultTransitionBeats, type VtgTransitionBeats } from '@/features/vtg/types'

const transitionPlane = 180
const doubledIntervalsPerHandRotation = 8

const appendFrames = (
  animation: RootDataFinal,
  changedFrames: readonly (AnimData | undefined)[],
  transitionFrameCount: number,
): RootDataFinal => ({
  ...animation,
  props: animation.props.map((prop, propIndex) => ({
    ...prop,
    anim: [
      ...prop.anim,
      ...Array.from({ length: transitionFrameCount }, (_unused, frameIndex) =>
        frameIndex === transitionFrameCount - 1 && changedFrames[propIndex]
          ? { ...changedFrames[propIndex] }
          : {},
      ),
    ],
  })),
})

const trimFrames = (animation: RootDataFinal, frameCount: number): RootDataFinal => ({
  ...animation,
  props: animation.props.map((prop) => ({
    ...prop,
    anim: prop.anim.slice(0, frameCount),
  })),
})

const replaceLastFrame = (
  animation: RootDataFinal,
  changedFrames: readonly (AnimData | undefined)[],
): RootDataFinal => ({
  ...animation,
  props: animation.props.map((prop, propIndex) => ({
    ...prop,
    anim: prop.anim.map((frame, frameIndex) =>
      changedFrames[propIndex] && frameIndex === prop.anim.length - 1
        ? { ...frame, ...changedFrames[propIndex] }
        : frame,
    ),
  })),
})

const prepareFirstTransition = (
  animation: RootDataFinal,
  transitionBeats: VtgTransitionBeats,
  baseBeatCount: number,
): RootDataFinal => {
  const frameDelta = (transitionBeats - baseBeatCount) * doublePlaybackMultiplier
  if (frameDelta > 0) return appendFrames(animation, [], frameDelta)
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

/**
 * Extends a doubled closed cycle with reciprocal QTR/VTG relationship changes. By default both
 * props change together four times for a one-rotation timing cycle and eight times for a
 * two-rotation timing cycle; Quad mode alternates the same number of single-prop changes.
 * Five beats preserves the original complete-cycle-plus-transition timing. Shorter experimental
 * intervals trim doubled frames before the first change. Boundary mode places changes on each
 * interval's final frame. After-boundary mode places each change on the following frame, so its
 * conceptual final change falls just beyond the closed cycle and is omitted. The turns transform
 * preserves the compiled rotation at the change frame while Plane 180 reverses its local axis.
 */
export const alternatePatternPlayback = (
  animation: RootDataFinal,
  transitionBeats: VtgTransitionBeats = vtgDefaultTransitionBeats,
  firstPropIndex: 0 | 1 = 0,
  quad = false,
  afterBoundary = false,
): RootDataFinal | undefined => {
  const firstProp = animation.props[0]
  if (!firstProp || animation.props.some((prop) => prop.anim.length !== firstProp.anim.length)) {
    return undefined
  }

  const cycleFrameCount = firstProp.anim.length - 1
  if (cycleFrameCount < 1 || animation.props.length < 1) return undefined
  const timingCycleCount = cycleFrameCount / doubledIntervalsPerHandRotation
  if (!Number.isInteger(timingCycleCount) || timingCycleCount < 1) return undefined
  const baseBeatCount = timingCycleCount * 4

  const prepared = prepareFirstTransition(animation, transitionBeats, baseBeatCount)

  const compiled = rootCompile(prepared)
  const inheritedTurns = compiled.props.map((prop) => prop.anim.at(-1)?.turns)
  const inheritedArcs = compiled.props.map((prop) => prop.anim.at(-1)?.arc)
  if (inheritedTurns.some((value) => value === undefined)) return undefined
  if (inheritedArcs.some((value) => value === undefined)) return undefined

  const changeCount = animation.props.length * doublePlaybackMultiplier * timingCycleCount
  const transitionFrameCount = transitionBeats * doublePlaybackMultiplier
  const resultFrameCount = changeCount * transitionFrameCount + 1
  let result = prepared

  for (let changeIndex = 0; changeIndex < changeCount; changeIndex += 1) {
    const changedPropIndexes = quad
      ? [(firstPropIndex + changeIndex) % animation.props.length]
      : animation.props.map((_prop, propIndex) => propIndex)
    const changedFrames: (AnimData | undefined)[] = Array.from({
      length: animation.props.length,
    })
    for (const propIndex of changedPropIndexes) {
      const turns = inheritedTurns[propIndex]
      const arc = inheritedArcs[propIndex]
      if (turns === undefined || arc === undefined) return undefined

      const nextTurns = alternateTurns(turns, arc)
      inheritedTurns[propIndex] = nextTurns
      changedFrames[propIndex] = { turns: nextTurns, plane: transitionPlane }
    }
    result = afterBoundary
      ? appendFrames(result, changedFrames, changeIndex === 0 ? 1 : transitionFrameCount)
      : changeIndex === 0
        ? replaceLastFrame(result, changedFrames)
        : appendFrames(result, changedFrames, transitionFrameCount)
  }

  return afterBoundary ? trimFrames(result, resultFrameCount) : result
}

export interface AlternatingPatternPlaybackAnalysis {
  base: RootDataFinal
  transitionBeats: VtgTransitionBeats
  transitionQuad: boolean
  transitionSecond: boolean
  transitionAfterBeat: boolean
}

const isTransitionBeatCount = (value: number): value is VtgTransitionBeats =>
  value >= 2 && value <= 6 && Number.isInteger(value)

/**
 * Recovers the doubled VTG/QTR cycle, timing, and transition mode from a reciprocal sequence.
 * Doubled VTG continuation frames are deliberately empty and inheritance-only,
 * so shortened modes can restore the removed tail without pattern regeneration.
 */
export const analyzeAlternatingPatternPlayback = (
  animation: RootDataFinal,
): AlternatingPatternPlaybackAnalysis | undefined => {
  const firstProp = animation.props[0]
  if (!firstProp || animation.props.length < 1) return undefined
  if (animation.props.some((prop) => prop.anim.length !== firstProp.anim.length)) return undefined

  const mode = ([1, 2] as const)
    .flatMap((timingCycleCount) =>
      ([false, true] as const).flatMap((quad) =>
        ([1, 0] as const).map((frameOffset) => ({ timingCycleCount, quad, frameOffset })),
      ),
    )
    .find(({ timingCycleCount, quad, frameOffset }) => {
      const eventCount = animation.props.length * doublePlaybackMultiplier * timingCycleCount
      const beats = (firstProp.anim.length - 1) / (eventCount * doublePlaybackMultiplier)
      if (!isTransitionBeatCount(beats)) return false
      const firstChangeIndex = beats * doublePlaybackMultiplier + frameOffset
      const changedPropCount = animation.props.filter(
        (prop) => prop.anim[firstChangeIndex]?.plane === transitionPlane,
      ).length
      return changedPropCount === (quad ? 1 : animation.props.length)
    })
  if (mode === undefined) return undefined
  const { timingCycleCount, quad: transitionQuad, frameOffset } = mode
  const eventCount = animation.props.length * doublePlaybackMultiplier * timingCycleCount
  const transitionBeats = (firstProp.anim.length - 1) / (eventCount * doublePlaybackMultiplier)
  if (!isTransitionBeatCount(transitionBeats)) return undefined
  const firstChangeIndex = transitionBeats * doublePlaybackMultiplier + frameOffset
  const changedPropIndexes = animation.props.flatMap((prop, propIndex) =>
    prop.anim[firstChangeIndex]?.plane === transitionPlane ? [propIndex] : [],
  )
  const transitionSecond = transitionQuad && changedPropIndexes[0] === 1

  const doubledVtgBaseFrameCount = timingCycleCount * doubledIntervalsPerHandRotation + 1
  const retainedBaseFrameCount = Math.min(doubledVtgBaseFrameCount, firstChangeIndex + 1)
  const base = {
    ...animation,
    props: animation.props.map((prop) => {
      const retainedFrames = prop.anim
        .slice(0, retainedBaseFrameCount)
        .map((frame) => ({ ...frame }))
      if (transitionBeats <= 4 && firstChangeIndex < retainedFrames.length) {
        retainedFrames[firstChangeIndex] = {}
      }

      return {
        ...prop,
        anim: [
          ...retainedFrames,
          ...Array.from({ length: doubledVtgBaseFrameCount - retainedFrames.length }, () => ({})),
        ],
      }
    }),
  }

  return {
    base,
    transitionBeats,
    transitionQuad,
    transitionSecond,
    transitionAfterBeat: frameOffset === 1,
  }
}
