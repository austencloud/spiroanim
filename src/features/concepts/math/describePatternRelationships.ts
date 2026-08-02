import type {
  VtgDirectionCode,
  VtgPatternLabel,
  VtgRelationshipCode,
  VtgTimingCode,
} from '@/features/vtg/types'
import { rootCompile } from '@/math/animation/AnimFunc'
import type { RootDataFinal } from '@/types/AnimTypes'

type RelationshipVector = [number, number, number]

interface RelativePhase {
  timing: VtgTimingCode
  orientation: 1 | -1
}

export interface PatternRelationships {
  label: VtgPatternLabel
  description: string
  hands: {
    timing: VtgTimingCode
    direction: VtgDirectionCode
  }
  props: {
    timing: VtgTimingCode
    direction: VtgDirectionCode
  }
}

const relationshipTolerance = 0.000_001

const dotProduct = (first: RelationshipVector, second: RelationshipVector): number =>
  first[0] * second[0] + first[1] * second[1] + first[2] * second[2]

const orientedCrossProduct = (
  first: RelationshipVector,
  second: RelationshipVector,
  axis: RelationshipVector,
): number =>
  (first[1] * second[2] - first[2] * second[1]) * axis[0] +
  (first[2] * second[0] - first[0] * second[2]) * axis[1] +
  (first[0] * second[1] - first[1] * second[0]) * axis[2]

const relationshipSign = (first: RelationshipVector, second: RelationshipVector): 1 | -1 => {
  const dot = dotProduct(first, second)
  if (Math.abs(Math.abs(dot) - 1) > relationshipTolerance) {
    throw new Error(`Expected parallel or antiparallel relationship vectors, received ${dot}`)
  }

  return dot > 0 ? 1 : -1
}

const classifyRelativePhase = (
  first: RelationshipVector,
  second: RelationshipVector,
  firstAxis: RelationshipVector,
): RelativePhase => {
  const dot = dotProduct(first, second)
  if (Math.abs(Math.abs(dot) - 1) <= relationshipTolerance) {
    return { timing: dot > 0 ? 'T' : 'S', orientation: dot > 0 ? 1 : -1 }
  }

  if (Math.abs(dot) > relationshipTolerance) {
    throw new Error(`Expected together, split, or quarter relationship vectors, received ${dot}`)
  }

  const orientation = orientedCrossProduct(first, second, firstAxis)
  if (Math.abs(Math.abs(orientation) - 1) > relationshipTolerance) {
    throw new Error(`Expected an oriented quarter relationship, received ${orientation}`)
  }

  return { timing: 'Q', orientation: orientation > 0 ? 1 : -1 }
}

const directionCode = (sign: number): VtgDirectionCode => (sign > 0 ? 'S' : 'O')

const timingDescriptions = {
  T: 'Together',
  S: 'Split',
  Q: 'Quarter',
} as const satisfies Readonly<Record<VtgTimingCode, string>>

const directionDescriptions = {
  S: 'Same',
  O: 'Opposite',
} as const satisfies Readonly<Record<VtgDirectionCode, string>>

const describeRelationship = (timing: VtgTimingCode, direction: VtgDirectionCode): string =>
  `${timingDescriptions[timing]} / ${directionDescriptions[direction]}`

export const describePatternRelationships = (
  animation: RootDataFinal,
): PatternRelationships => {
  const compiled = rootCompile(animation)
  const firstStart = compiled.props[0]?.anim[0]
  const secondStart = compiled.props[1]?.anim[0]
  const firstEnd = compiled.props[0]?.anim[1]
  const secondEnd = compiled.props[1]?.anim[1]
  if (!firstStart || !secondStart || !firstEnd || !secondEnd) {
    throw new Error('Pattern relationships require two props with at least two compiled frames')
  }

  const handStartPhase = classifyRelativePhase(firstStart.pos, secondStart.pos, firstStart.posx)
  const propStartPhase = classifyRelativePhase(firstStart.rot, secondStart.rot, firstStart.rotx)
  const handPhase = classifyRelativePhase(firstEnd.pos, secondEnd.pos, firstEnd.posx)
  const propPhase = classifyRelativePhase(firstEnd.rot, secondEnd.rot, firstEnd.rotx)
  const handDirection = directionCode(relationshipSign(firstEnd.posx, secondEnd.posx))

  // Rotation axes live in local hand/prop phase frames. The four orientation
  // terms correct their relative handedness when either phase changes parity.
  const propDirection = directionCode(
    relationshipSign(firstEnd.rotx, secondEnd.rotx) *
      handStartPhase.orientation *
      propStartPhase.orientation *
      handPhase.orientation *
      propPhase.orientation,
  )

  const hands: VtgRelationshipCode = `${handPhase.timing}${handDirection}`
  const props: VtgRelationshipCode = `${propPhase.timing}${propDirection}`
  const label: VtgPatternLabel = `${hands}/${props}`

  return {
    label,
    description: `Hands: ${describeRelationship(handPhase.timing, handDirection)}\nProps: ${describeRelationship(propPhase.timing, propDirection)}`,
    hands: { timing: handPhase.timing, direction: handDirection },
    props: { timing: propPhase.timing, direction: propDirection },
  }
}
