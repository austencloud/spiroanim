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

/** These source patterns have an intentional fixed shape and ignore Diamond/Box transforms. */
export const vtgFixedShapeCells: ReadonlySet<VtgCellReference> = new Set([
  '1-1',
  '1-2',
  '2-1',
  '2-2',
  '3-3',
  '3-4',
  '4-3',
  '4-4',
])

/** The paired ratios intentionally allow Tilted to transform the otherwise fixed-shape cells. */
export const hasFixedVtgPatternShape = (
  reference: VtgCellReference,
  speedRatio: VtgPatternSelection['speedRatio'],
): boolean => vtgFixedShapeCells.has(reference) && speedRatio !== '1:2' && speedRatio !== '1:4'

export const buildVtgPattern = (
  selection: VtgPatternSelection,
): VtgReadableAnimation | undefined => {
  const buildPattern = catalog[selection.reference]?.patternsBySpeedRatio[selection.speedRatio]
  const pattern = buildPattern?.(selection.isAnti === true)
  if (pattern === undefined) return undefined

  const applyBoxShape =
    selection.shape === 'box' && !hasFixedVtgPatternShape(selection.reference, selection.speedRatio)
  const adjustedScale = getAdjustedVtgScale(
    selection.scale ?? vtgScaleControl.default,
    selection.speedRatio,
  )
  const applyScale = selection.scale !== undefined || adjustedScale !== vtgScaleControl.default

  const transformedProps =
    applyScale || applyBoxShape
      ? pattern.props.map((prop) => {
          const baseFrame = prop.anim[0]
          if (baseFrame === undefined) return prop

          const initialArc = baseFrame.arc ?? 0
          const boxArcDelta = Math.abs(baseFrame.plane ?? 0) === 180 ? -45 : 45
          const firstContinuationArc = prop.anim[1]?.arc ?? initialArc

          return {
            ...prop,
            anim: prop.anim.map((frame, frameIndex) => ({
              ...frame,
              ...(frameIndex === 0 && applyBoxShape
                ? { arc: (initialArc + boxArcDelta + 360) % 360 }
                : undefined),
              ...(frameIndex === 1 && applyBoxShape ? { arc: firstContinuationArc } : undefined),
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
