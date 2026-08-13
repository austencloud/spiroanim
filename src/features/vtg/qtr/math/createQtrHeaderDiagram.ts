import { Vector3 } from 'three'

import { createDefaultQtrAnimation } from '@/features/vtg/qtr/createQtrAnimation'
import type {
  QtrMode,
  VtgCellReference,
  VtgPropPlacement,
  VtgRuleDiagram,
  VtgRuleNumber,
  VtgSpeedRatio,
} from '@/features/vtg/types'
import { rootCompile } from '@/math/animation/AnimFunc'
import type { AnimDataCompiled } from '@/types/AnimTypes'
import type { PatternShape } from '@/types/PatternTypes'

export type QtrCardinalPosition = 'top' | 'right' | 'bottom' | 'left'
export type QtrFacing = 'in' | 'out'

export interface QtrPropState {
  position: QtrCardinalPosition
  facing: QtrFacing
}

export interface QtrSideDiagramOptions {
  row: VtgRuleNumber
  speedRatio: VtgSpeedRatio
  quarters?: QtrMode
  swapProps: boolean
  reversePlane: boolean
  shape?: PatternShape
}

interface QtrReferenceFrameOptions {
  reference: VtgCellReference
  speedRatio: VtgSpeedRatio
  quarters?: QtrMode
  swapProps: boolean
  reversePlane: boolean
  shape?: PatternShape
}

export const vtgPropBounds = {
  outerStart: 4,
  beforeDivider: 41,
  afterDivider: 59,
  outerEnd: 96,
} as const

const cardinalDirections = [
  { position: 'top', direction: new Vector3(0, 1, 0) },
  { position: 'right', direction: new Vector3(-1, 0, 0) },
  { position: 'bottom', direction: new Vector3(0, -1, 0) },
  { position: 'left', direction: new Vector3(1, 0, 0) },
] as const satisfies readonly {
  position: QtrCardinalPosition
  direction: Vector3
}[]

const classifyQtrProp = (frame: AnimDataCompiled): QtrPropState => {
  const position = new Vector3().fromArray(frame.pos).normalize()
  const rotation = new Vector3().fromArray(frame.rot).normalize()
  let closest: (typeof cardinalDirections)[number] = cardinalDirections[0]
  let closestDot = position.dot(closest.direction)

  for (const candidate of cardinalDirections.slice(1)) {
    const dot = position.dot(candidate.direction)
    if (dot > closestDot) {
      closest = candidate
      closestDot = dot
    }
  }

  return {
    position: closest.position,
    facing: position.dot(rotation) < 0 ? 'in' : 'out',
  }
}

const getVtgQuarterReferencePropStates = ({
  reference,
  speedRatio,
  quarters = 1,
  swapProps,
  reversePlane,
  shape,
}: QtrReferenceFrameOptions): readonly [QtrPropState, QtrPropState] => {
  const animation = createDefaultQtrAnimation({
    reference,
    speedRatio,
    quarters,
    ...(swapProps ? { swapProps: true } : {}),
    ...(reversePlane ? { reversePlane: true } : {}),
    ...(shape === 'box' ? { shape } : {}),
  })
  if (!animation)
    throw new Error(`Missing Quarters reference pattern ${reference} at ${speedRatio}`)

  const frames = rootCompile(animation).props.map((prop) => prop.anim[0])
  const firstFrame = frames[0]
  const secondFrame = frames[1]
  if (!firstFrame || !secondFrame) {
    throw new Error(`Missing compiled Quarters starting frame for reference ${reference}`)
  }

  return [classifyQtrProp(firstFrame), classifyQtrProp(secondFrame)]
}

/**
 * Each left header represents the starting state shared by its row. Compile
 * the row's first cell so this stays aligned with future pattern-form changes.
 */
export const getQtrSidePropStates = ({
  row,
  ...options
}: QtrSideDiagramOptions): readonly [QtrPropState, QtrPropState] =>
  getVtgQuarterReferencePropStates({
    ...options,
    reference: `1-${row}`,
  })

const createPlacement = ({ position, facing }: QtrPropState): VtgPropPlacement => {
  const isBeforeCenter = position === 'top' || position === 'left'
  const pointsOutFromStart = isBeforeCenter ? facing === 'out' : facing === 'in'

  return {
    orientation: position === 'top' || position === 'bottom' ? 'vertical' : 'horizontal',
    lane: 50,
    start: isBeforeCenter ? vtgPropBounds.outerStart : vtgPropBounds.afterDivider,
    end: isBeforeCenter ? vtgPropBounds.beforeDivider : vtgPropBounds.outerEnd,
    largeEnd: pointsOutFromStart ? 'start' : 'end',
  }
}

export const createQtrSideDiagram = (options: QtrSideDiagramOptions): VtgRuleDiagram => {
  const [firstProp, secondProp] = getQtrSidePropStates(options)
  return { props: [createPlacement(firstProp), createPlacement(secondProp)] }
}
