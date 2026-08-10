import { describe, expect, it } from 'vitest'

import { createDefaultEightStepAnimation } from '@/features/eight-step/createEightStepAnimation'
import { createDefaultQtrAnimation } from '@/features/vtg/qtr/createQtrAnimation'
import { createDefaultVtgAnimation } from '@/features/vtg/createVtgAnimation'
import {
  matchEightStepPatternRequest,
  matchVtgPatternRequest,
} from '@/workers/pattern-matching/handlePatternMatchingRequest'

describe('handlePatternMatchingRequest', () => {
  it('matches VTG and preserves a selection that produced the animation', async () => {
    const selection = {
      reference: '2-2',
      speedRatio: '1:3',
      beat: 3,
      transition: true,
    } as const
    const animation = createDefaultVtgAnimation(selection)
    if (!animation) throw new Error('Expected a supported VTG animation')

    await expect(
      matchVtgPatternRequest({
        animation,
        preferences: { swapProps: false, reversePlane: false, quarters: 1 },
      }),
    ).resolves.toMatchObject({
      status: 'matched',
      source: 'vtg',
      match: { reference: '2-2', swapProps: true, transition: true },
    })
    await expect(
      matchVtgPatternRequest({
        animation,
        preferences: { swapProps: false, reversePlane: false, quarters: 1 },
        lastSelection: selection,
      }),
    ).resolves.toEqual({ status: 'unchanged' })
  })

  it('falls back from VTG to merged QTR matching', async () => {
    const animation = createDefaultQtrAnimation({
      reference: '3-4',
      speedRatio: '1:5',
      quarters: 2,
    })
    if (!animation) throw new Error('Expected a supported QTR animation')

    await expect(
      matchVtgPatternRequest({
        animation,
        preferences: { swapProps: false, reversePlane: false, quarters: 2 },
      }),
    ).resolves.toMatchObject({
      status: 'matched',
      source: 'qtr',
      match: { reference: '3-4', speedRatio: '1:5', quarters: 2 },
    })
  })

  it('matches Eight Step and recognizes the last emitted selection', async () => {
    const selection = {
      concept: '8stp',
      reference: '6-AI',
      swapProps: true,
      reversePlane: true,
      shape: 'box',
    } as const
    const animation = createDefaultEightStepAnimation(selection)
    if (!animation) throw new Error('Expected a supported Eight Step animation')

    await expect(matchEightStepPatternRequest({ animation })).resolves.toMatchObject({
      status: 'matched',
      match: { reference: '6-AI', swapProps: true, reversePlane: true, shape: 'box' },
    })
    await expect(
      matchEightStepPatternRequest({ animation, lastSelection: selection }),
    ).resolves.toEqual({ status: 'unchanged' })
  })
})
