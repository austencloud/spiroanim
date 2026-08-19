import { applyPatternFinalTransforms } from '@/features/concepts/applyPatternFinalTransforms'
import { rootCompile } from '@/math/animation/AnimFunc'
import type { RootDataFinal } from '@/types/AnimTypes'

const precision = 1e9
const normalizeNumber = (value: number) => {
  const rounded = Math.round(value * precision) / precision
  return Object.is(rounded, -0) ? 0 : rounded
}
const normalizeAngle = (value: number) => {
  const normalized = ((((normalizeNumber(value) + 180) % 360) + 360) % 360) - 180
  return normalized === -180 ? 180 : normalized
}
const getPositionOrientation = (position: readonly number[], fallback: number) => {
  const x = position[0] ?? 0
  const y = position[1] ?? 0
  return Math.abs(x) + Math.abs(y) < 1e-9
    ? fallback
    : normalizeAngle((Math.atan2(y, x) * 180) / Math.PI)
}

const normalizePosition = (position: readonly number[], orientation: number) => {
  const radians = (orientation * Math.PI) / 180
  const cosine = Math.cos(radians)
  const sine = Math.sin(radians)
  const x = position[0] ?? 0
  const y = position[1] ?? 0
  return [
    normalizeNumber(x * cosine + y * sine),
    normalizeNumber(-x * sine + y * cosine),
    normalizeNumber(position[2] ?? 0),
  ]
}

const hasUnsupportedPatternFields = (animation: RootDataFinal) =>
  animation.type !== 0 ||
  animation.props.some((prop) =>
    prop.anim.some((frame) => frame.type !== undefined || frame.adjust !== undefined),
  )

export interface VtgDirectionSignature {
  key: string
  orientation: number
}

/**
 * Describes starting placement and the direction of every beat. Absolute prop turns and absolute
 * table rotation are intentionally omitted so authored oddballs can match the same VTG cell.
 */
export const createVtgDirectionSignature = (
  animation: RootDataFinal,
): VtgDirectionSignature | undefined => {
  if (animation.props.length !== 2 || hasUnsupportedPatternFields(animation)) return undefined

  const compiled = rootCompile(animation)
  const first = compiled.props[0]?.anim[0]
  if (!first) return undefined
  const orientation = getPositionOrientation(first.pos, normalizeAngle(first.arc))
  const tracks = compiled.props.map((prop) =>
    prop.anim.map((frame, frameIndex) =>
      frameIndex === 0
        ? normalizePosition(frame.pos, orientation)
        : [
            ...normalizePosition(frame.pos, orientation),
            Math.sign(frame.turns),
            normalizeNumber(frame.beats),
          ],
    ),
  )

  return { key: JSON.stringify(tracks), orientation }
}

export const createVtgAnimationSignature = (animation: RootDataFinal): string | undefined =>
  createVtgDirectionSignature(animation)?.key

export const getVtgStartingTurns = (
  animation: RootDataFinal,
): readonly [number, number] | undefined => {
  if (animation.props.length !== 2) return undefined
  const compiled = rootCompile(animation)
  const left = compiled.props[0]?.anim[0]?.turns
  const right = compiled.props[1]?.anim[0]?.turns
  return left === undefined || right === undefined ? undefined : [left, right]
}

const getSignedRotationDifference = (
  axis: readonly number[],
  from: readonly number[],
  to: readonly number[],
) => {
  const crossX = (from[1] ?? 0) * (to[2] ?? 0) - (from[2] ?? 0) * (to[1] ?? 0)
  const crossY = (from[2] ?? 0) * (to[0] ?? 0) - (from[0] ?? 0) * (to[2] ?? 0)
  const crossZ = (from[0] ?? 0) * (to[1] ?? 0) - (from[1] ?? 0) * (to[0] ?? 0)
  const sine = (axis[0] ?? 0) * crossX + (axis[1] ?? 0) * crossY + (axis[2] ?? 0) * crossZ
  const cosine =
    (from[0] ?? 0) * (to[0] ?? 0) + (from[1] ?? 0) * (to[1] ?? 0) + (from[2] ?? 0) * (to[2] ?? 0)
  return normalizeAngle((Math.atan2(sine, cosine) * 180) / Math.PI)
}

export const getVtgPropRotationOffsets = (
  animation: RootDataFinal,
  candidate: RootDataFinal,
): readonly [number, number] | undefined => {
  if (animation.props.length !== 2 || candidate.props.length !== 2) return undefined
  const compiled = rootCompile(animation)
  const compiledCandidate = rootCompile(candidate)
  const offsets = compiled.props.map((prop, index) => {
    const frame = prop.anim[0]
    const candidateFrame = compiledCandidate.props[index]?.anim[0]
    if (!frame || !candidateFrame) return undefined
    const difference = getSignedRotationDifference(
      candidateFrame.rotx,
      candidateFrame.rot,
      frame.rot,
    )
    if (Math.abs(difference) !== 180) return difference
    return frame.turns - candidateFrame.turns < 0 ? -180 : 180
  })
  const left = offsets[0]
  const right = offsets[1]
  return left === undefined || right === undefined ? undefined : [left, right]
}

export const createFinalTransformedVtgAnimationSignature = (
  animation: RootDataFinal,
  transforms: { swapProps: boolean; reversePlane: boolean; initialTurnsOffset?: number },
): string | undefined =>
  createVtgAnimationSignature(applyPatternFinalTransforms(animation, transforms))

export const getVtgAnimationScale = (animation: RootDataFinal): number | undefined => {
  const firstScale =
    animation.props[0]?.anim[0]?.scale ?? rootCompile(animation).props[0]?.anim[0]?.scale
  return firstScale === undefined ? undefined : firstScale / 10
}
