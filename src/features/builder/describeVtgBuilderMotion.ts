import { rootCompile } from '@/math/animation/AnimFunc'
import type { RootDataFinal } from '@/types/AnimTypes'

type SpinCode = 'A' | 'I'
type DirectionCode = 'S' | 'O'

export type VtgBuilderMotionLabel = `${SpinCode}${SpinCode}/${DirectionCode}${DirectionCode}`

const spinDescription = (code: SpinCode): string => (code === 'A' ? 'Anti' : 'In')
const directionDescription = (code: DirectionCode): string => (code === 'S' ? 'Same' : 'Opposite')

export const describeVtgBuilderMotionLabel = (label: VtgBuilderMotionLabel): string => {
  const [spins, directions] = label.split('/')
  const firstSpin = spins?.[0] as SpinCode | undefined
  const secondSpin = spins?.[1] as SpinCode | undefined
  const firstDirection = directions?.[0] as DirectionCode | undefined
  const secondDirection = directions?.[1] as DirectionCode | undefined
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
): SpinCode => (signedDirection(posx, arc, rotx, rotation) < 0 ? 'A' : 'I')

const directionCode = (
  first: DirectionVector,
  firstAmount: number,
  second: DirectionVector,
  secondAmount: number,
): DirectionCode => (signedDirection(first, firstAmount, second, secondAmount) < 0 ? 'O' : 'S')

/** Describes the compiled movement axes used when a VTG cell enters Pattern Builder. */
export const describeVtgBuilderMotion = (animation: RootDataFinal): VtgBuilderMotionLabel => {
  const compiled = rootCompile(animation)
  const first = compiled.props[0]?.anim[1]
  const second = compiled.props[1]?.anim[1]
  if (!first || !second) throw new Error('Builder motion labels require two compiled prop tracks')

  const firstRotation = first.turns + first.arc
  const secondRotation = second.turns + second.arc
  return `${spinCode(first.posx, first.arc, first.rotx, firstRotation)}${spinCode(second.posx, second.arc, second.rotx, secondRotation)}/${directionCode(first.posx, first.arc, second.posx, second.arc)}${directionCode(first.rotx, firstRotation, second.rotx, secondRotation)}`
}
