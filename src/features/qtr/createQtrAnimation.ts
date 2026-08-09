import type { QtrMode, QtrPatternSelection } from '@/features/qtr/types'
import {
  applyVtgPlaybackControls,
  createDefaultVtgAnimation,
  createVtgAnimation,
  toVtgPreviewAnimation,
} from '@/features/vtg/createVtgAnimation'
import type { RootDataFinal } from '@/types/AnimTypes'

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
  swapProps: boolean,
): readonly [number, number] => {
  const amounts = propIndices.map((outputIndex) => {
    const originalIndex = swapProps ? propIndices[1 - outputIndex]! : outputIndex
    const firstQuarterAmount = firstQuarterArcAmounts[originalIndex]
    if (quarterMode === 1) return firstQuarterAmount

    const plane = normalizeArc(animation.props[outputIndex]?.anim[0]?.plane ?? 0)
    return firstQuarterAmount + (plane === 180 ? -90 : 90)
  })

  return [amounts[0]!, amounts[1]!]
}

const transformQtrAnimation = (
  animation: RootDataFinal,
  quarterMode: QtrMode,
  swapProps: boolean,
  direction: 1 | -1,
): RootDataFinal => {
  const amounts = getQtrArcAmounts(animation, quarterMode, swapProps)
  return shiftPropArc(shiftPropArc(animation, 0, direction * amounts[0]), 1, direction * amounts[1])
}

export const removeQtrArcs = (
  animation: RootDataFinal,
  quarterMode: QtrMode,
  swapProps: boolean,
): RootDataFinal => transformQtrAnimation(animation, quarterMode, swapProps, -1)

export const createQtrAnimation = (
  current: RootDataFinal,
  selection: QtrPatternSelection,
): RootDataFinal | undefined => {
  const animation = createVtgAnimation(current, { ...selection, beat: 1, double: false })
  if (!animation) return undefined

  return applyVtgPlaybackControls(
    transformQtrAnimation(animation, selection.quarters, selection.swapProps === true, 1),
    selection,
  )
}

export const createDefaultQtrAnimation = (
  selection: QtrPatternSelection,
): RootDataFinal | undefined => {
  const animation = createDefaultVtgAnimation({ ...selection, beat: 1, double: false })
  if (!animation) return undefined

  return applyVtgPlaybackControls(
    transformQtrAnimation(animation, selection.quarters, selection.swapProps === true, 1),
    selection,
  )
}

export const createQtrPreviewAnimation = (
  selection: QtrPatternSelection,
): RootDataFinal | undefined => {
  const animation = createDefaultQtrAnimation(selection)
  return animation ? toVtgPreviewAnimation(animation) : undefined
}
