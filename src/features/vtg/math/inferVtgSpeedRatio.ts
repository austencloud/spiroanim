import { rootCompile } from '@/math/animation/AnimFunc'
import type { RootDataFinal } from '@/types/AnimTypes'
import type {
  VtgIndividualSpeedRatio,
  VtgSpeedRatio,
} from '@/features/vtg/types'
import { isVtgSpeedRatio } from '@/features/vtg/types'

const normalFrameCount = 5
const doubledFrameCount = 9
const doubledPlaybackMultiplier = 2
const firstContinuationFrameIndex = 1

export type VtgSpinDirection = 'anti' | 'in'

export interface VtgPropTiming {
  ratio: VtgIndividualSpeedRatio
  spin: VtgSpinDirection
}

export interface VtgTiming {
  speedRatio: VtgSpeedRatio
  props: readonly [VtgPropTiming, VtgPropTiming]
}

const inferContinuation = (
  turns: number,
  playbackMultiplier: number,
): VtgPropTiming | undefined => {
  const effectiveTurns = turns * playbackMultiplier
  const spin: VtgSpinDirection = effectiveTurns >= 0 ? 'anti' : 'in'
  const denominator =
    spin === 'anti' ? effectiveTurns / 90 + 1 : Math.abs(effectiveTurns) / 90 - 1
  if (!Number.isInteger(denominator) || denominator < 1 || denominator > 5) return undefined

  return { ratio: `1:${denominator}` as VtgIndividualSpeedRatio, spin }
}

const combinePropTimings = (
  left: VtgPropTiming | undefined,
  right: VtgPropTiming | undefined,
): VtgTiming | undefined => {
  if (!left || !right) return undefined

  const leftDenominator = left.ratio.slice(2)
  const rightDenominator = right.ratio.slice(2)
  const speedRatio = (
    leftDenominator === rightDenominator ? left.ratio : `1:${leftDenominator}v${rightDenominator}`
  ) as string
  if (!isVtgSpeedRatio(speedRatio)) return undefined

  return { speedRatio, props: [left, right] }
}

/** Infers VTG timing from one compiled movement interval at a known playback subdivision. */
const inferVtgTimingAtFrame = (
  animation: RootDataFinal,
  frameIndex: number,
  playbackMultiplier = 1,
): VtgTiming | undefined => {
  if (
    animation.props.length !== 2 ||
    !Number.isInteger(frameIndex) ||
    frameIndex < 1 ||
    !Number.isFinite(playbackMultiplier) ||
    playbackMultiplier <= 0
  ) {
    return undefined
  }

  const compiled = rootCompile(animation)
  const left = compiled.props[0]?.anim[frameIndex]
  const right = compiled.props[1]?.anim[frameIndex]
  if (!left || !right) return undefined

  return combinePropTimings(
    inferContinuation(left.turns, playbackMultiplier),
    inferContinuation(right.turns, playbackMultiplier),
  )
}

/** Infers the ratio carried by a 45-degree Pattern Builder portion. */
export const inferVtgDoubledPortionSpeedRatio = (
  animation: RootDataFinal,
): VtgSpeedRatio | undefined =>
  inferVtgTimingAtFrame(animation, firstContinuationFrameIndex, doubledPlaybackMultiplier)
    ?.speedRatio

/** Infers each prop's ordered timing and spin from its continuation beats. */
export const inferVtgTiming = (animation: RootDataFinal): VtgTiming | undefined => {
  const frameCount = animation.props[0]?.anim.length
  if (
    (frameCount !== normalFrameCount && frameCount !== doubledFrameCount) ||
    animation.props.length !== 2 ||
    animation.props.some((prop) => prop.anim.length !== frameCount)
  ) {
    return undefined
  }

  const playbackMultiplier = frameCount === doubledFrameCount ? doubledPlaybackMultiplier : 1
  const compiled = rootCompile(animation)
  const timings = compiled.props.map((prop) => {
    const inferred = prop.anim.slice(1).map((frame) =>
      inferContinuation(frame.turns, playbackMultiplier),
    )
    const first = inferred[0]
    return first && inferred.every(
      (timing) => timing?.ratio === first.ratio && timing.spin === first.spin,
    )
      ? first
      : undefined
  })
  const left = timings[0]
  const right = timings[1]
  if (!left || !right) return undefined

  const leftDenominator = left.ratio.slice(2)
  const rightDenominator = right.ratio.slice(2)
  const speedRatio = (
    leftDenominator === rightDenominator
      ? left.ratio
      : `1:${leftDenominator}v${rightDenominator}`
  ) as string
  if (!isVtgSpeedRatio(speedRatio)) return undefined

  return { speedRatio, props: [left, right] }
}

export const inferVtgSpeedRatio = (animation: RootDataFinal): VtgSpeedRatio | undefined =>
  inferVtgTiming(animation)?.speedRatio
