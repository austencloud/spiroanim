import { rootCompile } from '@/math/animation/AnimFunc'
import type { RootDataCompiled, RootDataFinal } from '@/types/AnimTypes'

export type VtgBuilderSpinCode = 'A' | 'I'
export type VtgBuilderDirectionCode = 'S' | 'O'

export interface VtgBuilderMotion {
  spins: readonly [VtgBuilderSpinCode, VtgBuilderSpinCode]
  directions: readonly [VtgBuilderDirectionCode, VtgBuilderDirectionCode]
}

export const vtgBuilderMotionErrorLabel = 'XX / XX' as const
export type VtgBuilderMotionLabel =
  | `${VtgBuilderSpinCode}${VtgBuilderSpinCode} / ${VtgBuilderDirectionCode}${VtgBuilderDirectionCode}`
  | typeof vtgBuilderMotionErrorLabel

const spinDescription = (code: VtgBuilderSpinCode): string => (code === 'A' ? 'Anti' : 'In')
const directionDescription = (code: VtgBuilderDirectionCode): string =>
  code === 'S' ? 'Same' : 'Opposite'

export const describeVtgBuilderMotionLabel = (label: VtgBuilderMotionLabel): string => {
  if (label === vtgBuilderMotionErrorLabel) return 'Builder motion classification error.'
  const [spins, directions] = label.split(' / ')
  const firstSpin = spins?.[0] as VtgBuilderSpinCode | undefined
  const secondSpin = spins?.[1] as VtgBuilderSpinCode | undefined
  const firstDirection = directions?.[0] as VtgBuilderDirectionCode | undefined
  const secondDirection = directions?.[1] as VtgBuilderDirectionCode | undefined
  if (!firstSpin || !secondSpin || !firstDirection || !secondDirection) {
    throw new Error(`Invalid Builder motion label ${label}`)
  }

  return `Spin: ${spinDescription(firstSpin)} / ${spinDescription(secondSpin)}\nDirection: ${directionDescription(firstDirection)} / ${directionDescription(secondDirection)}`
}

type DirectionVector = readonly [number, number, number]

const dot = (first: DirectionVector, second: DirectionVector): number =>
  first[0] * second[0] + first[1] * second[1] + first[2] * second[2]

const axisDirection = (first: DirectionVector, second: DirectionVector): 1 | -1 => {
  const relationship = dot(first, second)
  if (Math.abs(Math.abs(relationship) - 1) > 0.000_001) {
    throw new Error(`Expected parallel or antiparallel movement axes, received ${relationship}`)
  }
  return relationship > 0 ? 1 : -1
}

const angleDirection = (amount: number): 1 | -1 => (amount < 0 ? -1 : 1)

const signedDirection = (
  first: DirectionVector,
  firstAmount: number,
  second: DirectionVector,
  secondAmount: number,
): 1 | -1 =>
  (axisDirection(first, second) * angleDirection(firstAmount) * angleDirection(secondAmount)) as
    | 1
    | -1

const spinCode = (
  posx: DirectionVector,
  arc: number,
  rotx: DirectionVector,
  rotation: number,
): VtgBuilderSpinCode => (signedDirection(posx, arc, rotx, rotation) < 0 ? 'A' : 'I')

const directionCode = (
  first: DirectionVector,
  firstAmount: number,
  second: DirectionVector,
  secondAmount: number,
): VtgBuilderDirectionCode =>
  signedDirection(first, firstAmount, second, secondAmount) < 0 ? 'O' : 'S'

/** Returns the spin and relationship directions at one compiled relationship frame. */
export const getCompiledVtgBuilderMotion = (
  compiled: RootDataCompiled,
  frameIndex: number,
): VtgBuilderMotion => {
  const first = compiled.props[0]?.anim[frameIndex]
  const second = compiled.props[1]?.anim[frameIndex]
  if (!first || !second) throw new Error('Builder motion labels require two compiled prop tracks')

  const firstRotation = first.turns + first.arc
  const secondRotation = second.turns + second.arc
  return {
    spins: [
      spinCode(first.posx, first.arc, first.rotx, firstRotation),
      spinCode(second.posx, second.arc, second.rotx, secondRotation),
    ],
    directions: [
      directionCode(first.posx, first.arc, second.posx, second.arc),
      directionCode(first.rotx, firstRotation, second.rotx, secondRotation),
    ],
  }
}

/** Returns the compiled spin and relationship directions used by Pattern Builder. */
export const getVtgBuilderMotion = (animation: RootDataFinal): VtgBuilderMotion =>
  getCompiledVtgBuilderMotion(rootCompile(animation), 1)

export const areVtgBuilderMotionsEqual = (
  firstMotion: VtgBuilderMotion,
  secondMotion: VtgBuilderMotion,
): boolean =>
  firstMotion.spins[0] === secondMotion.spins[0] &&
  firstMotion.spins[1] === secondMotion.spins[1] &&
  firstMotion.directions[0] === secondMotion.directions[0] &&
  firstMotion.directions[1] === secondMotion.directions[1]

export const areVtgBuilderSpinsEqual = (
  firstMotion: VtgBuilderMotion,
  secondMotion: VtgBuilderMotion,
): boolean =>
  firstMotion.spins[0] === secondMotion.spins[0] && firstMotion.spins[1] === secondMotion.spins[1]

/** Describes the compiled movement axes used when a VTG cell enters Pattern Builder. */
export const describeVtgBuilderMotion = (animation: RootDataFinal): VtgBuilderMotionLabel => {
  try {
    const motion = getVtgBuilderMotion(animation)
    return `${motion.spins[0]}${motion.spins[1]} / ${motion.directions[0]}${motion.directions[1]}`
  } catch (error) {
    console.warn('Unable to classify Builder motion.', { error })
    return vtgBuilderMotionErrorLabel
  }
}
