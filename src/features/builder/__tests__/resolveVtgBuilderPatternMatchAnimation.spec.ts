import { describe, expect, it } from 'vitest'

import { useSpiroAnimQS } from '@/composables/useSpiroAnimQS'
import { resolveVtgBuilderPatternMatchAnimation } from '@/features/builder/resolveVtgBuilderPatternMatchAnimation'
import { createDefaultVtgAnimation } from '@/features/vtg/createVtgAnimation'
import { findVtgPatternMatch } from '@/features/vtg/matchVtgAnimation'
import {
  createVtgTransitionPreviewAnimations,
  getVtgTransitionPreviewBeatCount,
  resizeVtgTransitionPatternPreview,
} from '@/features/vtg/math/createVtgTransitionQuickSlotAnimations'
import { prepareVtg45TransitionPattern } from '@/features/vtg/math/prepareVtg45TransitionPattern'
import { useBaseQS } from '@/services/query/createBaseQS'
import { loadSpiroAnimQSVersion } from '@/services/query/versions'

describe('resolveVtgBuilderPatternMatchAnimation', () => {
  const createPreviews = () => {
    const first = createDefaultVtgAnimation({ reference: '1-1', speedRatio: '1:3' })
    const second = createDefaultVtgAnimation({ reference: '2-3', speedRatio: '1:3' })
    if (!first || !second) throw new Error('Expected supported VTG animations')
    return [first, second] as const
  }

  it('uses the selected portion normalized to its exact timing cycle', () => {
    const previews = createPreviews()
    const shortOneCycle = resizeVtgTransitionPatternPreview(previews[0], 0, 2)
    const shortTwoCycle = createDefaultVtgAnimation({ reference: '1-1', speedRatio: '2:3' })
    if (!shortOneCycle || !shortTwoCycle) throw new Error('Expected supported VTG animations')
    const resizedTwoCycle = resizeVtgTransitionPatternPreview(shortTwoCycle, 0, 4)
    if (!resizedTwoCycle) throw new Error('Expected a resized 2:3 animation')

    expect(
      getVtgTransitionPreviewBeatCount(resolveVtgBuilderPatternMatchAnimation([shortOneCycle], 0)!),
    ).toBe(4)
    expect(
      getVtgTransitionPreviewBeatCount(
        resolveVtgBuilderPatternMatchAnimation([resizedTwoCycle], 0)!,
      ),
    ).toBe(8)
  })

  it('uses the final portion for the selected dummy drop cell', () => {
    const previews = createPreviews()

    expect(resolveVtgBuilderPatternMatchAnimation(previews, previews.length)).toEqual(
      resolveVtgBuilderPatternMatchAnimation(previews, 1),
    )
  })

  it('does not provide a match animation without a selected existing portion', () => {
    expect(resolveVtgBuilderPatternMatchAnimation([], 0)).toBeUndefined()
    expect(resolveVtgBuilderPatternMatchAnimation(createPreviews(), undefined)).toBeUndefined()
  })

  it.each([
    'r=Ew68kk11Y&p0=Q__..bn_PZ8...........&x0=_s_&m0=_1_mxqv__&p1=N__..bg0Rhw.._U0PZ8._U0Rhw.._U0PZ8._U0Rhw.._U0PZ8._U0Rhw.._U0PZ8&x1=_s_&c=_i_bhq&v=11',
    'r=Ew68kk11Y&p0=Q__..bn_PZ8...........&x0=_s_&m0=_1_mxqv__&p1=N__..bg0PZ8.._U0QRo._U0PZ8.._U0QRo._U0PZ8.._U0QRo._U0PZ8.._U0QRo&x1=_s_&c=_i_bhq&v=11',
  ])('normalizes every Eight Step portion into a matchable catalog cycle', async (query) => {
    const params = new URLSearchParams(query)
    const queryVersion = Number(params.get('v'))
    const version = await loadSpiroAnimQSVersion(queryVersion)
    const codec = await useSpiroAnimQS(
      version.VDEF,
      useBaseQS(version.VDEF, { charset: version.CHARSET }),
      queryVersion,
    )
    const prepared = prepareVtg45TransitionPattern(codec.decodeQS(Object.fromEntries(params)))
    if (!prepared.supported) throw new Error('Expected a supported Builder pattern')
    const previews = createVtgTransitionPreviewAnimations(prepared.pattern)
    if (!previews) throw new Error('Expected Builder portions from the supplied query')

    expect(previews.map(getVtgTransitionPreviewBeatCount)).toEqual([2, 1, 2, 1, 2, 1, 2, 1])
    expect(
      previews.map((_, index) => {
        const candidate = resolveVtgBuilderPatternMatchAnimation(previews, index)
        return candidate
          ? {
              beats: getVtgTransitionPreviewBeatCount(candidate),
              matched: findVtgPatternMatch(candidate) !== undefined,
            }
          : undefined
      }),
    ).toEqual(previews.map(() => ({ beats: 4, matched: true })))
  })
})
