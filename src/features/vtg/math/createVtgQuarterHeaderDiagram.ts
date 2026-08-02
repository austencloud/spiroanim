import { Vector3 } from 'three'

import { createDefaultVtgAnimation } from '@/features/vtg/createVtgAnimation'
import type {
  VtgCellReference,
  VtgPropPlacement,
  VtgQuarterMode,
  VtgRuleDiagram,
  VtgRuleNumber,
  VtgSpeedRatio,
} from '@/features/vtg/types'
import { rootCompile } from '@/math/animation/AnimFunc'
import type { AnimDataCompiled } from '@/types/AnimTypes'

export type VtgQuarterCardinalPosition = 'top' | 'right' | 'bottom' | 'left'
export type VtgQuarterFacing = 'in' | 'out'

export interface VtgQuarterPropState {
  position: VtgQuarterCardinalPosition
  facing: VtgQuarterFacing
}

export interface VtgQuarterSideDiagramOptions {
  row: VtgRuleNumber
  speedRatio: VtgSpeedRatio
  quarters?: VtgQuarterMode
  swapProps: boolean
  reversePlane: boolean
}

export interface VtgQuarterBottomDiagramOptions {
  column: VtgRuleNumber
  speedRatio: VtgSpeedRatio
  quarters?: VtgQuarterMode
  isAnti: boolean
  swapProps: boolean
  reversePlane: boolean
}

interface VtgQuarterReferenceFrameOptions {
  reference: VtgCellReference
  frameNumber: number
  speedRatio: VtgSpeedRatio
  quarters?: VtgQuarterMode
  isAnti: boolean
  swapProps: boolean
  reversePlane: boolean
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
  position: VtgQuarterCardinalPosition
  direction: Vector3
}[]

const classifyQuarterProp = (frame: AnimDataCompiled): VtgQuarterPropState => {
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
  frameNumber,
  speedRatio,
  quarters = 1,
  isAnti,
  swapProps,
  reversePlane,
}: VtgQuarterReferenceFrameOptions): readonly [VtgQuarterPropState, VtgQuarterPropState] => {
  const animation = createDefaultVtgAnimation({
    reference,
    speedRatio,
    quarters,
    ...(isAnti ? { isAnti: true } : {}),
    ...(swapProps ? { swapProps: true } : {}),
    ...(reversePlane ? { reversePlane: true } : {}),
  })
  if (!animation)
    throw new Error(`Missing Quarters reference pattern ${reference} at ${speedRatio}`)

  const frameIndex = frameNumber - 1
  const frames = rootCompile(animation).props.map((prop) => prop.anim[frameIndex])
  const firstFrame = frames[0]
  const secondFrame = frames[1]
  if (!firstFrame || !secondFrame) {
    throw new Error(`Missing compiled Quarters frame ${frameNumber} for reference ${reference}`)
  }

  return [classifyQuarterProp(firstFrame), classifyQuarterProp(secondFrame)]
}

/**
 * Each left header represents the starting state shared by its row. Compile
 * the row's first cell so this stays aligned with future pattern-form changes.
 */
export const getVtgQuarterSidePropStates = ({
  row,
  ...options
}: VtgQuarterSideDiagramOptions): readonly [VtgQuarterPropState, VtgQuarterPropState] =>
  getVtgQuarterReferencePropStates({
    ...options,
    reference: `1-${row}`,
    frameNumber: 1,
    isAnti: false,
  })

export const vtgQuarterBottomFrameNumbers = {
  1: 4,
  2: 4,
  3: 4,
  4: 4,
  5: 2,
  6: 4,
} as const satisfies Readonly<Record<VtgRuleNumber, number>>

/**
 * Each bottom header uses its column's row-6 pattern at the domain-selected
 * compiled frame. Frame numbers are one-based to match the editor UI.
 */
export const getVtgQuarterBottomPropStates = ({
  column,
  ...options
}: VtgQuarterBottomDiagramOptions): readonly [VtgQuarterPropState, VtgQuarterPropState] =>
  getVtgQuarterReferencePropStates({
    ...options,
    reference: `${column}-6`,
    frameNumber: vtgQuarterBottomFrameNumbers[column],
  })

const createPlacement = ({ position, facing }: VtgQuarterPropState): VtgPropPlacement => {
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

export const createVtgQuarterSideDiagram = (
  options: VtgQuarterSideDiagramOptions,
): VtgRuleDiagram => {
  const [firstProp, secondProp] = getVtgQuarterSidePropStates(options)
  return { props: [createPlacement(firstProp), createPlacement(secondProp)] }
}

export const createVtgQuarterBottomDiagram = (
  options: VtgQuarterBottomDiagramOptions,
): VtgRuleDiagram => {
  const [firstProp, secondProp] = getVtgQuarterBottomPropStates(options)
  return { props: [createPlacement(firstProp), createPlacement(secondProp)] }
}
