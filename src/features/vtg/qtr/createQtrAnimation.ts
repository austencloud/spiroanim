import {
  applyVtgPlaybackControls,
  createDefaultVtgAnimation,
  createVtgAnimation,
  toVtgPreviewAnimation,
} from '@/features/vtg/createVtgAnimation'
import type { QtrMode, QtrPatternSelection } from '@/features/vtg/types'
import type { RootDataFinal } from '@/types/AnimTypes'
import { applyPatternFinalTransforms } from '@/features/concepts/applyPatternFinalTransforms'
import { hasFixedVtgPatternShape } from '@/features/vtg/data/vtgPatternCatalog'
import {
  applyVtgInitialTurnsPlayback,
  withVtgInitialTurnsOffsetBeat,
} from '@/features/vtg/math/applyVtgInitialTurnsOffset'

const normalizeArc = (arc: number): number => ((arc % 360) + 360) % 360
const propIndices = [0, 1] as const
const firstQuarterArcAmounts = [90, 0] as const

const shiftPropArc = (
  animation: RootDataFinal,
  propIndex: 0 | 1,
  amount: number,
): RootDataFinal => {
  const prop = animation.props[propIndex]
  const firstFrame = prop?.anim[0]
  if (!prop || !firstFrame) return animation

  return {
    ...animation,
    props: animation.props.map((candidate, index) =>
      index === propIndex
        ? {
            ...prop,
            anim: [
              { ...firstFrame, arc: normalizeArc((firstFrame.arc ?? 0) + amount) },
              ...prop.anim.slice(1),
            ],
          }
        : candidate,
    ),
  }
}

const getQtrArcAmounts = (
  animation: RootDataFinal,
  quarterMode: QtrMode,
): readonly [number, number] => {
  const amounts = propIndices.map((outputIndex) => {
    const firstQuarterAmount = firstQuarterArcAmounts[outputIndex]
    if (quarterMode === 1) return firstQuarterAmount

    const plane = normalizeArc(animation.props[outputIndex]?.anim[0]?.plane ?? 0)
    return firstQuarterAmount + (plane === 180 ? -90 : 90)
  })

  return [amounts[0]!, amounts[1]!]
}

const transformQtrAnimation = (
  animation: RootDataFinal,
  quarterMode: QtrMode,
  direction: 1 | -1,
): RootDataFinal => {
  const amounts = getQtrArcAmounts(animation, quarterMode)
  return shiftPropArc(shiftPropArc(animation, 0, direction * amounts[0]), 1, direction * amounts[1])
}

export const removeQtrArcs = (
  animation: RootDataFinal,
  quarterMode: QtrMode,
  swapProps: boolean,
): RootDataFinal => {
  const semantic = swapProps
    ? applyPatternFinalTransforms(animation, { swapProps: true })
    : animation
  const transformed = transformQtrAnimation(semantic, quarterMode, -1)
  return swapProps ? applyPatternFinalTransforms(transformed, { swapProps: true }) : transformed
}

const withoutFinalTransforms = ({
  swapProps: _swapProps,
  reversePlane: _reversePlane,
  initialTurnsOffset: _initialTurnsOffset,
  initialTurnsOffsetBeat: _initialTurnsOffsetBeat,
  ...selection
}: QtrPatternSelection): QtrPatternSelection => selection

// Qtr #2 remains accepted for legacy callers, while the current UI always emits Qtr #1 and uses
// the shared 180 control to select the alternate face-on orientation.
const getSelectedQtrMode = (selection: QtrPatternSelection): QtrMode => {
  const appliesBoxShape =
    selection.shape === 'box' && !hasFixedVtgPatternShape(selection.reference, selection.speedRatio)
  return selection.reversePlane && !appliesBoxShape ? 2 : selection.quarters
}

const applyQtrFinalTransforms = (
  animation: RootDataFinal,
  selection: QtrPatternSelection,
): RootDataFinal => applyPatternFinalTransforms(animation, selection)

/** Builds the concept-specific QTR state before playback and shared final transforms. */
export const createDefaultQtrBaseAnimation = (
  selection: QtrPatternSelection,
): RootDataFinal | undefined => {
  const animation = createDefaultVtgAnimation({
    ...withoutFinalTransforms(selection),
    beat: 1,
    transition: false,
  })

  return animation ? transformQtrAnimation(animation, getSelectedQtrMode(selection), 1) : undefined
}

export const createQtrAnimation = (
  current: RootDataFinal,
  selection: QtrPatternSelection,
): RootDataFinal | undefined => {
  const animation = createVtgAnimation(current, {
    ...withoutFinalTransforms(selection),
    beat: 1,
    transition: false,
  })
  if (!animation) return undefined

  const completed = applyVtgPlaybackControls(
    transformQtrAnimation(animation, getSelectedQtrMode(selection), 1),
    withVtgInitialTurnsOffsetBeat(selection),
  )
  if (!completed || (selection.transition && selection.initialTurnsOffset !== undefined)) {
    return undefined
  }

  const transformed = applyQtrFinalTransforms(completed, selection)
  return applyVtgInitialTurnsPlayback(transformed, selection)
}

export const createDefaultQtrAnimation = (
  selection: QtrPatternSelection,
): RootDataFinal | undefined => {
  const base = createDefaultQtrBaseAnimation(selection)
  if (!base) return undefined

  const completed = applyVtgPlaybackControls(base, withVtgInitialTurnsOffsetBeat(selection))
  if (!completed || (selection.transition && selection.initialTurnsOffset !== undefined)) {
    return undefined
  }

  const transformed = applyQtrFinalTransforms(completed, selection)
  return applyVtgInitialTurnsPlayback(transformed, selection)
}

export const createQtrPreviewAnimation = (
  selection: QtrPatternSelection,
): RootDataFinal | undefined => {
  const animation = createDefaultQtrAnimation(selection)
  return animation ? toVtgPreviewAnimation(animation) : undefined
}
