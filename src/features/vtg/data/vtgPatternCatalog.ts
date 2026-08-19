import { vtgRowPatterns } from '@/features/vtg/data/patterns/rows'
import {
  clampVtgBpm,
  getAdjustedVtgScale,
  getVtgDistanceForScale,
  toVtgInternalScale,
  vtgScaleControl,
} from '@/features/vtg/data/vtgPlayerSettings'
import type {
  VtgCellReference,
  VtgPatternDefinition,
  VtgPatternSelection,
  VtgReadableAnimation,
} from '@/features/vtg/types'

const catalog: Readonly<Partial<Record<VtgCellReference, Readonly<VtgPatternDefinition>>>> = {
  ...vtgRowPatterns,
}

/** @deprecated Retained for source compatibility; VTG no longer applies shape transforms. */
export const vtgFixedShapeCells: ReadonlySet<VtgCellReference> = new Set([
  '1-1', '1-2', '2-1', '2-2', '3-3', '3-4', '4-3', '4-4',
])

/** @deprecated Retained for source compatibility; VTG no longer applies shape transforms. */
export const hasFixedVtgPatternShape = (
  reference: VtgCellReference,
  _speedRatio: VtgPatternSelection['speedRatio'],
): boolean => vtgFixedShapeCells.has(reference)

export const buildVtgPattern = (
  selection: VtgPatternSelection,
): VtgReadableAnimation | undefined => {
  const pattern = catalog[selection.reference]?.build(
    selection.isAnti === true,
    selection.speedRatio,
  )
  if (pattern === undefined) return undefined

  const adjustedScale = getAdjustedVtgScale(
    selection.scale ?? vtgScaleControl.default,
    selection.speedRatio,
  )
  const applyScale = selection.scale !== undefined || adjustedScale !== vtgScaleControl.default

  const transformedProps =
    applyScale
      ? pattern.props.map((prop) => {
          const baseFrame = prop.anim[0]
          if (baseFrame === undefined) return prop

          return {
            ...prop,
            anim: prop.anim.map((frame, frameIndex) => ({
              ...frame,
              ...(frameIndex === 0 && applyScale
                ? { scale: toVtgInternalScale(adjustedScale) }
                : undefined),
            })),
          }
        })
      : pattern.props

  return {
    ...pattern,
    ...(selection.bpm !== undefined ? { bpm: clampVtgBpm(selection.bpm) * 2 } : undefined),
    distance: getVtgDistanceForScale(adjustedScale),
    props: transformedProps,
  }
}
