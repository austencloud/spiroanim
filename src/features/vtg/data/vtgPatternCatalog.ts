import { vtgRowPatterns } from '@/features/vtg/data/patterns/rows'
import {
  clampVtgBpm,
  getVtgDistanceForScale,
  toVtgInternalScale,
} from '@/features/vtg/data/vtgPlayerSettings'
import { reverseAngle } from '@/math/animation/AngleFunc'
import type {
  VtgCellReference,
  VtgPatternDefinition,
  VtgPatternSelection,
  VtgReadableAnimation,
} from '@/features/vtg/types'

const catalog: Readonly<Partial<Record<VtgCellReference, Readonly<VtgPatternDefinition>>>> = {
  ...vtgRowPatterns,
}

export const buildVtgPattern = (
  selection: VtgPatternSelection,
): VtgReadableAnimation | undefined => {
  const buildPattern = catalog[selection.reference]?.patternsBySpeedRatio[selection.speedRatio]
  const pattern = buildPattern?.(selection.isAnti === true)
  if (pattern === undefined) return undefined

  const transformedProps =
    selection.reversePlane || selection.scale !== undefined
      ? pattern.props.map((prop) => {
          const [baseFrame, ...continuationFrames] = prop.anim
          if (baseFrame === undefined) return prop

          return {
            ...prop,
            anim: [
              {
                ...baseFrame,
                ...(selection.reversePlane
                  ? { plane: reverseAngle(baseFrame.plane ?? 0) }
                  : undefined),
                ...(selection.scale !== undefined
                  ? { scale: toVtgInternalScale(selection.scale) }
                  : undefined),
              },
              ...continuationFrames,
            ],
          }
        })
      : pattern.props

  return {
    ...pattern,
    ...(selection.bpm !== undefined ? { bpm: clampVtgBpm(selection.bpm) } : undefined),
    ...(selection.scale !== undefined
      ? { distance: getVtgDistanceForScale(selection.scale) }
      : undefined),
    props: selection.swapProps ? [...transformedProps].reverse() : transformedProps,
  }
}
