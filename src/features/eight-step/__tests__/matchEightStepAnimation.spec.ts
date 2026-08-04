import { describe, expect, it } from 'vitest'

import { createDefaultEightStepAnimation } from '@/features/eight-step/createEightStepAnimation'
import {
  findEightStepPatternMatch,
  matchesEightStepSelection,
} from '@/features/eight-step/matchEightStepAnimation'

describe('matchEightStepAnimation', () => {
  it('recovers the cell and transforms from compiled geometry', () => {
    const selection = {
      concept: '8stp',
      reference: '7-IE',
      swapProps: true,
      reversePlane: true,
      bpm: 91,
      scale: 1.1,
    } as const
    const animation = createDefaultEightStepAnimation(selection)

    expect(animation).toBeDefined()
    if (!animation) return

    expect(findEightStepPatternMatch(animation)).toEqual({
      reference: '7-IE',
      swapProps: true,
      reversePlane: true,
      bpm: 91,
      scale: 1.1,
    })
    expect(matchesEightStepSelection(animation, selection)).toBe(true)
  })

  it('ignores player-only rendering settings when matching geometry', () => {
    const animation = createDefaultEightStepAnimation({
      concept: '8stp',
      reference: '3-EI',
      thick: 13,
      paths: false,
      hands: true,
      arms: false,
    })

    expect(animation).toBeDefined()
    expect(animation && findEightStepPatternMatch(animation)?.reference).toBe('3-EI')
  })

  it('rejects non-Eight-Step frame geometry', () => {
    const animation = createDefaultEightStepAnimation({ concept: '8stp', reference: '1-AA' })
    expect(animation).toBeDefined()
    if (!animation) return

    animation.props[0]!.anim[4]!.arc = 45
    expect(findEightStepPatternMatch(animation)).toBeUndefined()
  })
})
