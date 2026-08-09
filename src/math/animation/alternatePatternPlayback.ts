import { rootCompile } from '@/math/animation/AnimFunc'
import { doublePlaybackMultiplier } from '@/math/animation/subdivideAnimationPlayback'
import type { AnimData, RootDataFinal } from '@/types/AnimTypes'

const rotationTolerance = 0.000_001
const transitionPlane = 180

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

const alternateTurns = (turns: number, arc: number) => -turns - 2 * arc

const findFirstConvertibleProp = (
  animation: RootDataFinal,
  transitionFrameCount: number,
): number | undefined => {
  const compiled = rootCompile(animation)
  const baseline = rootCompile(appendFrames(animation, undefined, undefined, transitionFrameCount))

  for (const [propIndex, prop] of compiled.props.entries()) {
    const lastFrame = prop.anim.at(-1)
    if (!lastFrame) continue

    const candidate = rootCompile(
      appendFrames(
        animation,
        propIndex,
        {
          turns: alternateTurns(lastFrame.turns, lastFrame.arc),
          plane: transitionPlane,
        },
        transitionFrameCount,
      ),
    )
    const candidateRotation = candidate.props[propIndex]?.anim.at(-1)?.rot
    const baselineRotation = baseline.props[propIndex]?.anim.at(-1)?.rot
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
 * Each change occupies one doubled beat, then runs one complete cycle before
 * changing the next prop. The turns transform preserves the compiled rotation
 * at the change frame while Plane 180 reverses its local rotation axis.
 */
export const alternatePatternPlayback = (animation: RootDataFinal): RootDataFinal | undefined => {
  const firstProp = animation.props[0]
  if (!firstProp || animation.props.some((prop) => prop.anim.length !== firstProp.anim.length)) {
    return undefined
  }

  const cycleFrameCount = firstProp.anim.length - 1
  if (cycleFrameCount < 1 || animation.props.length < 1) return undefined

  const transitionFrameCount = doublePlaybackMultiplier
  const firstConvertibleProp = findFirstConvertibleProp(animation, transitionFrameCount)
  if (firstConvertibleProp === undefined) return undefined

  const compiled = rootCompile(animation)
  const inheritedTurns = compiled.props.map((prop) => prop.anim.at(-1)?.turns)
  const inheritedArcs = compiled.props.map((prop) => prop.anim.at(-1)?.arc)
  if (inheritedTurns.some((value) => value === undefined)) return undefined
  if (inheritedArcs.some((value) => value === undefined)) return undefined

  const changeCount = animation.props.length * doublePlaybackMultiplier
  let result = animation

  for (let changeIndex = 0; changeIndex < changeCount; changeIndex += 1) {
    const propIndex = (firstConvertibleProp + changeIndex) % animation.props.length
    const turns = inheritedTurns[propIndex]
    const arc = inheritedArcs[propIndex]
    if (turns === undefined || arc === undefined) return undefined

    const nextTurns = alternateTurns(turns, arc)
    inheritedTurns[propIndex] = nextTurns
    result = appendFrames(
      result,
      propIndex,
      { turns: nextTurns, plane: transitionPlane },
      transitionFrameCount,
    )
    if (changeIndex < changeCount - 1) {
      result = appendFrames(result, undefined, undefined, cycleFrameCount)
    }
  }

  return result
}

/**
 * Uses the distinctive derived frame count to recover the original doubled
 * cycle without generating or caching every extended candidate.
 */
export const getAlternatingPatternBase = (animation: RootDataFinal): RootDataFinal | undefined => {
  const firstProp = animation.props[0]
  const propCount = animation.props.length
  if (!firstProp || propCount < 1) return undefined
  if (animation.props.some((prop) => prop.anim.length !== firstProp.anim.length)) return undefined

  const changeCount = propCount * doublePlaybackMultiplier
  const lastFramesAreTrimmed = animation.props.some((prop) => {
    const frame = prop.anim.at(-1)
    return frame?.turns !== undefined || frame?.plane !== undefined
  })
  const completedCycleCount = lastFramesAreTrimmed ? changeCount : changeCount + 1
  const cycleFrameCount =
    (firstProp.anim.length - 1 - changeCount * doublePlaybackMultiplier) / completedCycleCount
  if (!Number.isInteger(cycleFrameCount) || cycleFrameCount < 1) return undefined

  const baseFrameCount = cycleFrameCount + 1
  return {
    ...animation,
    props: animation.props.map((prop) => ({
      ...prop,
      anim: prop.anim.slice(0, baseFrameCount),
    })),
  }
}
