import { buildVtgPattern } from '@/features/vtg/data/vtgPatternCatalog'
import { vtgPlayerSettings, vtgPropSettings } from '@/features/vtg/data/vtgPlayerSettings'
import type {
  VtgPatternSelection,
  VtgQuarterMode,
  VtgReadableAnimation,
} from '@/features/vtg/types'
import { rootFinal } from '@/math/animation/PlayerFunc'
import { decodeReadable, encodeReadable } from '@/services/animation/AnimReadableFunc'
import type { RootDataFinal, RootReadable } from '@/types/AnimTypes'

const vtgFrameCount = 5

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
            anim: [{ ...firstFrame, arc: (firstFrame.arc ?? 0) + amount }, ...prop.anim.slice(1)],
          }
        : candidate,
    ),
  }
}

const quarterArcAmounts = {
  1: [90, 0],
  2: [180, 90],
} as const satisfies Readonly<Record<VtgQuarterMode, readonly [number, number]>>

export const removeVtgQuarterArcs = (
  animation: RootDataFinal,
  quarterMode: VtgQuarterMode,
  swapProps: boolean,
  quartersAfterSwap: boolean,
): RootDataFinal => {
  const amounts = quarterArcAmounts[quarterMode]
  const outputAmounts = swapProps && !quartersAfterSwap ? [amounts[1], amounts[0]] : amounts

  return shiftPropArc(shiftPropArc(animation, 0, -outputAmounts[0]), 1, -outputAmounts[1])
}

const addDefaultFrames = (pattern: VtgReadableAnimation): VtgReadableAnimation => ({
  ...pattern,
  props: pattern.props.map((prop, index) => {
    const defaults = vtgPropSettings[index]

    return {
      ...defaults,
      ...prop,
      anim: [
        ...prop.anim,
        ...Array.from({ length: Math.max(0, vtgFrameCount - prop.anim.length) }, () => ({})),
      ],
    }
  }),
})

const mergeWithCurrentAnimation = (
  current: RootDataFinal,
  pattern: VtgReadableAnimation,
): RootReadable => ({
  ...encodeReadable(current),
  ...pattern,
  props: pattern.props,
})

const vtgStandaloneBase = rootFinal(
  decodeReadable({
    ...vtgPlayerSettings,
    smooth: true,
    props: [],
  }),
)

/**
 * Builds fresh player data for a VTG selection. Undefined means that the
 * selected cell has no pattern for that speed ratio yet.
 */
export const createVtgAnimation = (
  current: RootDataFinal,
  selection: VtgPatternSelection,
): RootDataFinal | undefined => {
  const selectedPattern = buildVtgPattern(selection)
  if (!selectedPattern) return undefined

  const pattern = addDefaultFrames({
    ...selectedPattern,
    ...(selection.thick === undefined ? {} : { thick: selection.thick }),
  })
  const decoded = decodeReadable(mergeWithCurrentAnimation(current, pattern))

  const animation = {
    ...rootFinal(decoded),
    speed: pattern.speed ?? current.speed,
    type: pattern.type ?? current.type,
    turns: pattern.turns ?? current.turns,
    depth: pattern.depth ?? current.depth,
  }

  if (!selection.quarters) return animation

  const amounts = quarterArcAmounts[selection.quarters]
  // By default, Quarters belongs to the original tracks and Swap moves the
  // adjustments with them. The experimental post-Swap mode applies the same
  // amounts directly to the output tracks instead.
  const outputAmounts =
    selection.swapProps && !selection.quartersAfterSwap ? [amounts[1], amounts[0]] : amounts

  return shiftPropArc(shiftPropArc(animation, 0, outputAmounts[0]), 1, outputAmounts[1])
}

/**
 * Builds VTG data without inheriting settings from the active player.
 */
export const createDefaultVtgAnimation = (
  selection: VtgPatternSelection,
): RootDataFinal | undefined => createVtgAnimation(vtgStandaloneBase, selection)

/**
 * Builds VTG data without inheriting settings from the active player.
 */
export const createVtgPreviewAnimation = (
  selection: VtgPatternSelection,
): RootDataFinal | undefined => {
  const animation = createDefaultVtgAnimation(selection)
  if (!animation) return undefined

  return {
    ...animation,
    hands: false,
    thick: 15,
    visible: false,
    props: animation.props.map((prop) => ({
      ...prop,
      hands: false,
      paths: animation.paths,
      thick: 15,
      visible: false,
    })),
  }
}
