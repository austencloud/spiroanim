import { describe, expect, it } from 'vitest'

import { createBuilderQuickSlotCandidates } from '@/features/builder/createBuilderQuickSlotCandidates'
import { createDefaultVtgAnimation } from '@/features/vtg/createVtgAnimation'
import {
  createVtgTransitionPreviewAnimations,
  getVtgTransitionPreviewBeatCount,
} from '@/features/vtg/math/createVtgTransitionQuickSlotAnimations'

describe('createBuilderQuickSlotCandidates', () => {
  it('retains the complete current pattern and makes every extracted slot four beats', () => {
    const current = createDefaultVtgAnimation({
      reference: '5-1',
      speedRatio: '1:3',
      transition: true,
      transitionBeats: 5,
      transitionQuad: true,
      transitionSecond: true,
    })
    if (!current) throw new Error('Expected a supported VTG transition')
    const previews = createVtgTransitionPreviewAnimations(current)
    if (!previews) throw new Error('Expected Builder previews')

    const candidates = createBuilderQuickSlotCandidates(current, previews)

    expect(candidates[0]).toBe(current)
    expect(candidates.slice(1).map(getVtgTransitionPreviewBeatCount)).toEqual(previews.map(() => 4))
  })

  it('keeps eight beats for each extracted 2:3 slot', () => {
    const current = createDefaultVtgAnimation({
      reference: '5-1',
      speedRatio: '2:3',
      transition: true,
      transitionBeats: 5,
    })
    if (!current) throw new Error('Expected a supported VTG transition')
    const previews = createVtgTransitionPreviewAnimations(current)
    if (!previews) throw new Error('Expected Builder previews')

    const candidates = createBuilderQuickSlotCandidates(current, previews)

    expect(candidates.slice(1).map(getVtgTransitionPreviewBeatCount)).toEqual(previews.map(() => 8))
  })
})
