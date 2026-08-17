import type { VtgPatternSelection, VtgTransitionInitialTurnsOffset } from '@/features/vtg/types'
import { shiftVtgStartingFrames } from '@/features/vtg/math/shiftVtgStartingBeat'
import {
  doubleAnimationPlayback,
  doublePlaybackMultiplier,
} from '@/math/animation/subdivideAnimationPlayback'
import type { RootDataFinal } from '@/types/AnimTypes'

/** Applies the shared prop-rotation state retained by a closed 45 Trans extraction. */
export const applyVtgInitialTurnsOffset = (
  animation: RootDataFinal,
  offset?: VtgTransitionInitialTurnsOffset,
): RootDataFinal => {
  if (offset === undefined) return animation

  return {
    ...animation,
    props: animation.props.map((prop) => {
      const firstFrame = prop.anim[0]
      if (!firstFrame) return prop

      return {
        ...prop,
        anim: [{ ...firstFrame, turns: (firstFrame.turns ?? 0) + offset }, ...prop.anim.slice(1)],
      }
    }),
  }
}

export const withVtgInitialTurnsOffsetBeat = (
  selection: VtgPatternSelection,
): VtgPatternSelection =>
  selection.initialTurnsOffset === undefined
    ? selection
    : {
        ...selection,
        beat: selection.initialTurnsOffsetBeat ?? selection.beat ?? 1,
      }

/**
 * Rebuilds a detected doubled-frame pattern at its matched beat before transporting the completed
 * animation to a newly selected beat. Applying the retained Turns offset after changing Beat would
 * move that adjustment to a different physical point in the cycle.
 */
export const applyVtgInitialTurnsPlayback = (
  animation: RootDataFinal,
  selection: VtgPatternSelection,
): RootDataFinal | undefined => {
  if (selection.initialTurnsOffset === undefined) return animation

  const doubled = doubleAnimationPlayback(animation)
  if (!doubled) return undefined
  const offset = applyVtgInitialTurnsOffset(doubled, selection.initialTurnsOffset)
  const originBeat = selection.initialTurnsOffsetBeat ?? selection.beat ?? 1
  const requestedBeat = selection.beat ?? 1
  const relativeBeatShifts = (requestedBeat - originBeat + 4) % 4
  return shiftVtgStartingFrames(offset, relativeBeatShifts * doublePlaybackMultiplier)
}
