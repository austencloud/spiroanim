import { Vector3 } from 'three'

import { PNTIND, PPOS } from '@/domain/animation/AnimStruct'
import type {
  QstPosition,
  QstPositionPair,
  QstSequenceLine,
  QstSequenceTile,
} from '@/features/quarter-space-tech/types'
import { rootCompile } from '@/math/animation/AnimFunc'
import type { PointInd, RootDataFinal } from '@/types/AnimTypes'

const qstPointByPosition = {
  top: PNTIND.MTC,
  left: PNTIND.ML,
  front: PNTIND.FC,
  right: PNTIND.MR,
  bottom: PNTIND.MBC,
  back: PNTIND.BC,
} as const satisfies Readonly<Record<QstPosition, PointInd>>

const qstPositionByPoint = new Map<PointInd, QstPosition>(
  Object.entries(qstPointByPosition).map(([position, point]) => [point, position as QstPosition]),
)

const endpoint = new Vector3()
const endpointTolerance = 1e-5

const identifyPosition = (coordinates: readonly [number, number, number]): QstPosition => {
  endpoint.fromArray(coordinates)

  let closestPosition: QstPosition | undefined
  let closestDistance = Number.POSITIVE_INFINITY
  for (const [point, position] of qstPositionByPoint) {
    const distance = endpoint.distanceTo(PPOS[point]!)
    if (distance < closestDistance) {
      closestDistance = distance
      closestPosition = position
    }
  }

  if (!closestPosition || closestDistance > endpointTolerance) {
    throw new Error(`QST animation endpoint does not land on a QST position (${closestDistance})`)
  }

  return closestPosition
}

export const analyzeQstPositionPairs = (animation: RootDataFinal): readonly QstPositionPair[] => {
  const compiled = rootCompile(animation)
  const firstProp = compiled.props[0]
  const secondProp = compiled.props[1]
  if (!firstProp || !secondProp || compiled.props.length !== 2) {
    throw new Error('QST patterns require exactly two props')
  }
  if (firstProp.anim.length !== secondProp.anim.length || firstProp.anim.length < 2) {
    throw new Error('QST props require matching animation timelines with at least two frames')
  }

  const pairs = firstProp.anim.map(
    (frame, index): QstPositionPair => [
      identifyPosition(frame.pos),
      identifyPosition(secondProp.anim[index]!.pos),
    ],
  )
  const first = pairs[0]
  const last = pairs.at(-1)
  if (!first || !last || first[0] !== last[0] || first[1] !== last[1]) {
    throw new Error('QST patterns must close on their starting position pair')
  }

  return pairs
}

export const analyzeQstSequence = (
  animation: RootDataFinal,
  lineBeats?: number,
): readonly QstSequenceLine[] => {
  const pairs = analyzeQstPositionPairs(animation)
  const beatCount = pairs.length - 1
  const beatsPerLine = lineBeats ?? beatCount
  if (!Number.isInteger(beatsPerLine) || beatsPerLine <= 0) {
    throw new Error('QST lineBeats must be a positive integer')
  }

  const tiles = Array.from(
    { length: beatCount },
    (_, index): QstSequenceTile => ({
      current: pairs[index]!,
      next: pairs[index + 1]!,
      transition: describeQstTransition(pairs[index]!, pairs[index + 1]!),
    }),
  )

  return Array.from({ length: Math.ceil(beatCount / beatsPerLine) }, (_, index) => ({
    index,
    tiles: tiles.slice(index * beatsPerLine, (index + 1) * beatsPerLine),
  }))
}

type QstRelation = 'quarter' | 'split' | 'together'
type QstPlane = 'horizontal' | 'wall' | 'wheel'

const oppositePosition = {
  top: 'bottom',
  left: 'right',
  front: 'back',
  right: 'left',
  bottom: 'top',
  back: 'front',
} as const satisfies Readonly<Record<QstPosition, QstPosition>>

const relation = ([first, second]: QstPositionPair): QstRelation => {
  if (first === second) return 'together'
  if (oppositePosition[first] === second) return 'split'
  return 'quarter'
}

const movementPlane = (start: QstPosition, end: QstPosition): QstPlane | undefined => {
  const pair = new Set([start, end])
  if ((pair.has('top') || pair.has('bottom')) && (pair.has('left') || pair.has('right')))
    return 'wall'
  if ((pair.has('top') || pair.has('bottom')) && (pair.has('front') || pair.has('back')))
    return 'wheel'
  if ((pair.has('left') || pair.has('right')) && (pair.has('front') || pair.has('back')))
    return 'horizontal'
  return undefined
}

export const describeQstTransition = (
  current: QstPositionPair,
  next: QstPositionPair,
): QstSequenceTile['transition'] => {
  const currentRelation = relation(current)
  const nextRelation = relation(next)

  if (currentRelation === 'together') {
    if (nextRelation === 'together') return 'TT'
    if (nextRelation === 'split') return 'TS'
    return 'TQ'
  }
  if (currentRelation === 'split') {
    if (nextRelation === 'together') return 'ST'
    if (nextRelation === 'split') return 'SS'
    return 'SQ'
  }
  if (nextRelation === 'together') return 'QT'
  if (nextRelation === 'split') return 'QS'

  const [firstCurrent, secondCurrent] = current
  const [firstNext, secondNext] = next
  if (
    firstCurrent === firstNext ||
    secondCurrent === secondNext ||
    oppositePosition[firstCurrent] === firstNext ||
    oppositePosition[secondCurrent] === secondNext
  )
    return 'QQ'

  const follows = firstNext === secondCurrent || secondNext === firstCurrent
  const breaksPlane =
    movementPlane(firstCurrent, firstNext) !== movementPlane(secondCurrent, secondNext)
  if (follows) return breaksPlane ? 'FB' : 'F'
  return breaksPlane ? 'OB' : 'O'
}
