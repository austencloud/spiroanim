import { rootCompile } from '@/math/animation/AnimFunc'
import type { AnimDataCompiled, RootDataFinal } from '@/types/AnimTypes'
import type { VtgIndividualSpeedRatio, VtgSpeedRatio } from '@/features/vtg/types'
import { formatVtgIndividualSpeedRatio, formatVtgSpeedRatio } from '@/features/vtg/types'

const firstContinuationFrameIndex = 1
const directionTolerance = 0.000_001
const floatingPointTolerance = 0.000_001
const legacySerializedTurnsResolution = 1
const maximumTimingNumerator = 3600

export type VtgSpinDirection = 'anti' | 'in'

export interface VtgPropTiming {
  ratio: VtgIndividualSpeedRatio
  spin: VtgSpinDirection
}

export interface VtgTiming {
  speedRatio: VtgSpeedRatio
  props: readonly [VtgPropTiming, VtgPropTiming]
}

type DirectionVector = readonly [number, number, number]

const dot = (first: DirectionVector, second: DirectionVector): number =>
  first[0] * second[0] + first[1] * second[1] + first[2] * second[2]

const signedDirection = (
  firstAxis: DirectionVector,
  firstAmount: number,
  secondAxis: DirectionVector,
  secondAmount: number,
): number => dot(firstAxis, secondAxis) * Math.sign(firstAmount) * Math.sign(secondAmount)

const inferReducedRatio = (
  rate: number,
  tolerance: number,
): VtgIndividualSpeedRatio | undefined => {
  if (!Number.isFinite(rate) || rate <= 0) return undefined

  for (let numerator = 1; numerator <= maximumTimingNumerator; numerator += 1) {
    const denominator = Math.round(rate * numerator)
    if (denominator < 1) continue
    if (Math.abs(denominator / numerator - rate) <= tolerance) {
      return formatVtgIndividualSpeedRatio({ numerator, denominator })
    }
  }

  return undefined
}

const inferContinuation = (frame: AnimDataCompiled): VtgPropTiming | undefined => {
  const absoluteRotation = frame.arc + frame.turns
  if (
    Math.abs(frame.arc) <= directionTolerance ||
    Math.abs(absoluteRotation) <= directionTolerance
  ) {
    return undefined
  }

  const direction = signedDirection(frame.posx, frame.arc, frame.rotx, absoluteRotation)
  if (Math.abs(direction) <= directionTolerance) return undefined

  // Current query strings serialize Turns to tenths, while legacy versions rounded to whole
  // degrees. Use the widest supported half-step so old compound ratios still reduce to their
  // intended timing after decoding.
  const ratioTolerance = Math.max(
    floatingPointTolerance,
    legacySerializedTurnsResolution / 2 / Math.abs(frame.arc) + Number.EPSILON,
  )
  const ratio = inferReducedRatio(Math.abs(absoluteRotation / frame.arc), ratioTolerance)
  if (!ratio) return undefined
  return { ratio, spin: direction < 0 ? 'anti' : 'in' }
}

const combinePropTimings = (
  left: VtgPropTiming | undefined,
  right: VtgPropTiming | undefined,
): VtgTiming | undefined =>
  left && right
    ? { speedRatio: formatVtgSpeedRatio(left.ratio, right.ratio), props: [left, right] }
    : undefined

/** Infers VTG timing from one compiled movement interval. */
const inferVtgTimingAtFrame = (
  animation: RootDataFinal,
  frameIndex: number,
): VtgTiming | undefined => {
  if (animation.props.length !== 2 || !Number.isInteger(frameIndex) || frameIndex < 1) {
    return undefined
  }

  const compiled = rootCompile(animation)
  const left = compiled.props[0]?.anim[frameIndex]
  const right = compiled.props[1]?.anim[frameIndex]
  return left && right
    ? combinePropTimings(inferContinuation(left), inferContinuation(right))
    : undefined
}

/** Infers the ratio carried by a 45-degree Pattern Builder portion. */
export const inferVtgDoubledPortionSpeedRatio = (
  animation: RootDataFinal,
): VtgSpeedRatio | undefined =>
  inferVtgTimingAtFrame(animation, firstContinuationFrameIndex)?.speedRatio

/** Infers each prop's ordered reduced timing ratio and spin from its continuation beats. */
export const inferVtgTiming = (animation: RootDataFinal): VtgTiming | undefined => {
  const frameCount = animation.props[0]?.anim.length
  if (
    frameCount === undefined ||
    frameCount <= firstContinuationFrameIndex ||
    animation.props.length !== 2 ||
    animation.props.some((prop) => prop.anim.length !== frameCount)
  ) {
    return undefined
  }

  const compiled = rootCompile(animation)
  const timings = compiled.props.map((prop) => {
    const inferred = prop.anim.slice(1).map(inferContinuation)
    const first = inferred[0]
    return first &&
      inferred.every((timing) => timing?.ratio === first.ratio && timing.spin === first.spin)
      ? first
      : undefined
  })

  return combinePropTimings(timings[0], timings[1])
}

export const inferVtgSpeedRatio = (animation: RootDataFinal): VtgSpeedRatio | undefined =>
  inferVtgTiming(animation)?.speedRatio
