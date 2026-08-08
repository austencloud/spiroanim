import { vtgRowPatterns } from '@/features/vtg/data/patterns/rows'
import {
  clampVtgBpm,
  getVtgDistanceForScale,
  toVtgInternalScale,
  vtgScaleControl,
} from '@/features/vtg/data/vtgPlayerSettings'
import { reverseAngle } from '@/math/animation/AngleFunc'
import { deriveBoxInitialPlacement } from '@/math/animation/SpatialRelationshipFunc'
import type {
  VtgCellReference,
  VtgPatternDefinition,
  VtgPatternSelection,
  VtgReadableAnimation,
} from '@/features/vtg/types'
import type { PatternShape } from '@/types/PatternTypes'

const catalog: Readonly<Partial<Record<VtgCellReference, Readonly<VtgPatternDefinition>>>> = {
  ...vtgRowPatterns,
}

export const vtgDiamondCellReferences = [
  '1-1',
  '1-2',
  '2-1',
  '2-2',
] as const satisfies readonly VtgCellReference[]

export const vtgBoxCellReferences = [
  '3-3',
  '3-4',
  '4-3',
  '4-4',
] as const satisfies readonly VtgCellReference[]

/** These source patterns have an intrinsic shape and ignore Diamond/Box transforms. */
export const vtgFixedShapeByCell: Readonly<Partial<Record<VtgCellReference, PatternShape>>> = {
  '1-1': 'diamond',
  '1-2': 'diamond',
  '2-1': 'diamond',
  '2-2': 'diamond',
  '3-3': 'box',
  '3-4': 'box',
  '4-3': 'box',
  '4-4': 'box',
}

export const getVtgFixedShape = (reference: VtgCellReference): PatternShape | undefined =>
  vtgFixedShapeByCell[reference]

export const buildVtgPattern = (
  selection: VtgPatternSelection,
): VtgReadableAnimation | undefined => {
  const buildPattern = catalog[selection.reference]?.patternsBySpeedRatio[selection.speedRatio]
  const pattern = buildPattern?.(selection.isAnti === true)
  if (pattern === undefined) return undefined

  const applyBoxShape =
    selection.shape === 'box' && getVtgFixedShape(selection.reference) === undefined

  const transformedProps =
    selection.reversePlane || selection.scale !== undefined || applyBoxShape
      ? pattern.props.map((prop) => {
          const baseFrame = prop.anim[0]
          if (baseFrame === undefined) return prop

          const initialArc = baseFrame.arc ?? 0
          const effectivePlane = selection.reversePlane
            ? reverseAngle(baseFrame.plane ?? 0)
            : (baseFrame.plane ?? 0)
          const boxPlacement = deriveBoxInitialPlacement({
            arc: initialArc,
            plane: effectivePlane,
          })
          const firstContinuationArc = prop.anim[1]?.arc ?? initialArc

          return {
            ...prop,
            anim: prop.anim.map((frame, frameIndex) => ({
              ...frame,
              ...(frameIndex === 0 && selection.reversePlane
                ? { plane: effectivePlane }
                : undefined),
              ...(frameIndex === 0 && applyBoxShape ? boxPlacement : undefined),
              ...(frameIndex === 1 && applyBoxShape ? { arc: firstContinuationArc } : undefined),
              ...(frameIndex === 0 && selection.scale !== undefined
                ? { scale: toVtgInternalScale(selection.scale) }
                : undefined),
            })),
          }
        })
      : pattern.props

  return {
    ...pattern,
    ...(selection.bpm !== undefined ? { bpm: clampVtgBpm(selection.bpm) } : undefined),
    distance: getVtgDistanceForScale(selection.scale ?? vtgScaleControl.default),
    props: selection.swapProps ? [...transformedProps].reverse() : transformedProps,
  }
}
