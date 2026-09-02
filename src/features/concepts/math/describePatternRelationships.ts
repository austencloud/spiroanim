import type { VtgDirectionCode, VtgRelationshipCode, VtgTimingCode } from '@/features/vtg/types'
import { rootCompile } from '@/math/animation/AnimFunc'
import { InitialPoint } from '@/math/animation/OrthogonalFunc'
import type { RootDataFinal } from '@/types/AnimTypes'

export type RelationshipVector = readonly [number, number, number]

export const indeterminateRelationshipCode = 'XX' as const
export const indeterminateTimingCode = 'X' as const
export const patternRelationshipErrorLabel = 'XX / XX' as const
export type PatternTimingCode = VtgTimingCode | typeof indeterminateTimingCode
export type PatternRelationshipCode =
  | VtgRelationshipCode
  | `${typeof indeterminateTimingCode}${VtgDirectionCode}`
  | typeof indeterminateRelationshipCode
export type PatternRelationshipLabel = `${PatternRelationshipCode} / ${PatternRelationshipCode}`

export interface PatternRelationship {
  timing: PatternTimingCode
  direction: VtgDirectionCode
}

export interface PatternRelationships {
  label: PatternRelationshipLabel
  description: string
  hands?: PatternRelationship
  props?: PatternRelationship
  handsIndeterminate: boolean
  propsIndeterminate: boolean
}

export type PatternRelationshipCheckpoint = 'source' | 'destination'

const relationshipTolerance = 0.000_001
const relationshipPhaseRadians = (Math.PI * 3) / 2
const fullRotationRadians = Math.PI * 2
const quarterRotationRadians = Math.PI / 2
const timingReference: RelationshipVector = [InitialPoint.x, InitialPoint.y, InitialPoint.z]

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

const vectorLength = (vector: RelationshipVector): number => Math.hypot(...vector)

const normalizedVector = (vector: RelationshipVector): RelationshipVector => {
  const length = vectorLength(vector)
  if (length <= relationshipTolerance) {
    throw new Error('Expected a nonzero relationship vector')
  }

  return [vector[0] / length, vector[1] / length, vector[2] / length]
}

const projectedUnitVector = (
  vector: RelationshipVector,
  axis: RelationshipVector,
): RelationshipVector => {
  const projection = dotProduct(vector, axis)
  return normalizedVector([
    vector[0] - axis[0] * projection,
    vector[1] - axis[1] * projection,
    vector[2] - axis[2] * projection,
  ])
}

const normalizedRadians = (radians: number): number =>
  ((radians % fullRotationRadians) + fullRotationRadians) % fullRotationRadians

const circularDistance = (first: number, second: number): number => {
  const distance = Math.abs(first - second) % fullRotationRadians
  return Math.min(distance, fullRotationRadians - distance)
}

const directedPhaseToReference = (
  orientation: RelationshipVector,
  velocityAxis: RelationshipVector,
): number => {
  const axis = normalizedVector(velocityAxis)
  const planarOrientation = projectedUnitVector(orientation, axis)
  const planarReference = projectedUnitVector(timingReference, axis)
  return normalizedRadians(
    Math.atan2(
      orientedCrossProduct(planarOrientation, planarReference, axis),
      dotProduct(planarOrientation, planarReference),
    ),
  )
}

/**
 * Classifies timing by comparing each member's directed phase to the common bottom reference.
 * The velocity axes include spin direction, so equal Cartesian orientations are not assumed to
 * have equal timing when the members move in opposite directions.
 */
export const classifyDirectedTiming = (
  firstOrientation: RelationshipVector,
  firstVelocityAxis: RelationshipVector,
  secondOrientation: RelationshipVector,
  secondVelocityAxis: RelationshipVector,
): VtgTimingCode => {
  const relativePhase = normalizedRadians(
    directedPhaseToReference(secondOrientation, secondVelocityAxis) -
      directedPhaseToReference(firstOrientation, firstVelocityAxis),
  )

  if (circularDistance(relativePhase, 0) <= relationshipTolerance) {
    return 'T'
  }
  if (circularDistance(relativePhase, Math.PI) <= relationshipTolerance) {
    return 'S'
  }
  if (circularDistance(relativePhase, quarterRotationRadians) <= relationshipTolerance) {
    return 'Q'
  }
  if (
    circularDistance(relativePhase, fullRotationRadians - quarterRotationRadians) <=
    relationshipTolerance
  ) {
    return 'Q'
  }

  throw new Error(`Expected together, split, or quarter directed phase, received ${relativePhase}`)
}

const rotateAroundAxis = (
  vector: RelationshipVector,
  axis: RelationshipVector,
  angle: number,
): RelationshipVector => {
  const cosine = Math.cos(angle)
  const sine = Math.sin(angle)
  const projection = dotProduct(axis, vector) * (1 - cosine)

  return [
    vector[0] * cosine + (axis[1] * vector[2] - axis[2] * vector[1]) * sine + axis[0] * projection,
    vector[1] * cosine + (axis[2] * vector[0] - axis[0] * vector[2]) * sine + axis[1] * projection,
    vector[2] * cosine + (axis[0] * vector[1] - axis[1] * vector[0]) * sine + axis[2] * projection,
  ]
}

const semanticPropPhase = (
  start: RelationshipVector,
  endAxis: RelationshipVector,
  rotationAmount: number,
): RelationshipVector => {
  const direction = Math.sign(rotationAmount)
  return direction === 0
    ? start
    : rotateAroundAxis(start, endAxis, direction * relationshipPhaseRadians)
}

const relationshipSign = (first: RelationshipVector, second: RelationshipVector): 1 | -1 => {
  const dot = dotProduct(first, second)
  if (Math.abs(Math.abs(dot) - 1) > relationshipTolerance) {
    throw new Error(`Expected parallel or antiparallel relationship vectors, received ${dot}`)
  }

  return dot > 0 ? 1 : -1
}

const directionCode = (sign: number): VtgDirectionCode => (sign > 0 ? 'S' : 'O')

const scaledVector = (vector: RelationshipVector, scale: number): RelationshipVector => [
  vector[0] * scale,
  vector[1] * scale,
  vector[2] * scale,
]

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

const relationshipCode = (
  relationship: PatternRelationship | undefined,
): PatternRelationshipCode =>
  relationship ? `${relationship.timing}${relationship.direction}` : indeterminateRelationshipCode

const relationshipDescription = (
  name: 'Hands' | 'Props',
  relationship: PatternRelationship | undefined,
): string =>
  relationship
    ? relationship.timing === indeterminateTimingCode
      ? `${name}: Indeterminate / ${directionDescriptions[relationship.direction]}`
      : `${name}: ${describeRelationship(relationship.timing, relationship.direction)}`
    : `${name}: Indeterminate`

export const createPatternRelationships = (
  hands: PatternRelationship | undefined,
  props: PatternRelationship | undefined,
): PatternRelationships => ({
  label: `${relationshipCode(hands)} / ${relationshipCode(props)}`,
  description: `${relationshipDescription('Hands', hands)}\n${relationshipDescription('Props', props)}`,
  ...(hands ? { hands } : undefined),
  ...(props ? { props } : undefined),
  handsIndeterminate: hands === undefined || hands.timing === indeterminateTimingCode,
  propsIndeterminate: props === undefined || props.timing === indeterminateTimingCode,
})

const classifyRelationshipValue = <Value>(classify: () => Value): Value | undefined => {
  try {
    return classify()
  } catch {
    return undefined
  }
}

const createClassifiedRelationship = (
  timing: VtgTimingCode | undefined,
  direction: VtgDirectionCode | undefined,
): PatternRelationship | undefined =>
  direction ? { timing: timing ?? indeterminateTimingCode, direction } : undefined

const describePatternRelationshipsUnsafe = (
  animation: RootDataFinal,
  checkpoint: PatternRelationshipCheckpoint = 'destination',
): PatternRelationships => {
  const compiled = rootCompile(animation)
  const firstStart = compiled.props[0]?.anim[0]
  const secondStart = compiled.props[1]?.anim[0]
  const firstEnd = compiled.props[0]?.anim[2]
  const secondEnd = compiled.props[1]?.anim[2]
  if (!firstStart || !secondStart || !firstEnd || !secondEnd) {
    throw new Error('Pattern relationships require two props with at least two compiled frames')
  }

  const handTiming = classifyRelationshipValue(() => {
    const startTiming = classifyDirectedTiming(
      firstStart.pos,
      firstEnd.posx,
      secondStart.pos,
      secondEnd.posx,
    )
    const destinationTiming = classifyDirectedTiming(
      firstEnd.pos,
      firstEnd.posx,
      secondEnd.pos,
      secondEnd.posx,
    )
    return checkpoint === 'source' ? startTiming : destinationTiming
  })
  const handDirection = classifyRelationshipValue(() =>
    directionCode(relationshipSign(firstEnd.posx, secondEnd.posx)),
  )
  const hands = createClassifiedRelationship(handTiming, handDirection)

  const propTiming = classifyRelationshipValue(() => {
    // VTG relationship labels describe the props at their three-quarter phase checkpoint. Unequal
    // ratios change how many degrees each prop travels per beat, so their Cartesian endpoints can
    // coincide even when the paths represent a Split relationship. Advance each real starting
    // orientation through the canonical checkpoint using its actual incoming axis and direction.
    // At 1:3 this is the compiled endpoint; at other ratios it preserves the same path semantics.
    const firstPropPhase = semanticPropPhase(
      firstStart.rot,
      firstEnd.rotx,
      firstEnd.turns + firstEnd.arc,
    )
    const secondPropPhase = semanticPropPhase(
      secondStart.rot,
      secondEnd.rotx,
      secondEnd.turns + secondEnd.arc,
    )
    const firstRotationDirection = Math.sign(firstEnd.turns + firstEnd.arc)
    const secondRotationDirection = Math.sign(secondEnd.turns + secondEnd.arc)
    const firstVelocityAxis = scaledVector(firstEnd.rotx, firstRotationDirection || 1)
    const secondVelocityAxis = scaledVector(secondEnd.rotx, secondRotationDirection || 1)
    const timing =
      checkpoint === 'source'
        ? classifyDirectedTiming(
            firstStart.rot,
            firstVelocityAxis,
            secondStart.rot,
            secondVelocityAxis,
          )
        : classifyDirectedTiming(
            firstPropPhase,
            firstVelocityAxis,
            secondPropPhase,
            secondVelocityAxis,
          )
    return timing
  })
  const propDirection = classifyRelationshipValue(() => {
    const firstRotationDirection = Math.sign(firstEnd.turns + firstEnd.arc)
    const secondRotationDirection = Math.sign(secondEnd.turns + secondEnd.arc)
    const firstVelocityAxis = scaledVector(firstEnd.rotx, firstRotationDirection || 1)
    const secondVelocityAxis = scaledVector(secondEnd.rotx, secondRotationDirection || 1)
    return directionCode(relationshipSign(firstVelocityAxis, secondVelocityAxis))
  })
  const props = createClassifiedRelationship(propTiming, propDirection)

  return createPatternRelationships(hands, props)
}

export const createPatternRelationshipError = (error: unknown): PatternRelationships => {
  const message = error instanceof Error ? error.message : String(error)
  return {
    label: patternRelationshipErrorLabel,
    description: `Pattern relationship error: ${message}`,
    handsIndeterminate: true,
    propsIndeterminate: true,
  }
}

export const describePatternRelationships = (
  animation: RootDataFinal,
  checkpoint: PatternRelationshipCheckpoint = 'destination',
): PatternRelationships => {
  try {
    return describePatternRelationshipsUnsafe(animation, checkpoint)
  } catch (error) {
    return createPatternRelationshipError(error)
  }
}
