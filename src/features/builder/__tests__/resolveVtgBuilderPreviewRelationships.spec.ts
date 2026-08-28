import { describe, expect, it } from 'vitest'

import { useSpiroAnimQS } from '@/composables/useSpiroAnimQS'
import { resolveVtgBuilderPreviewRelationships } from '@/features/builder/resolveVtgBuilderPreviewRelationships'
import { createDefaultVtgAnimation } from '@/features/vtg/createVtgAnimation'
import { findVtgPatternMatch } from '@/features/vtg/matchVtgAnimation'
import { createVtgTransitionPreviewAnimations } from '@/features/vtg/math/createVtgTransitionQuickSlotAnimations'
import { prepareVtg45TransitionPattern } from '@/features/vtg/math/prepareVtg45TransitionPattern'
import { useBaseQS } from '@/services/query/createBaseQS'
import { loadSpiroAnimQSVersion } from '@/services/query/versions'

describe('resolveVtgBuilderPreviewRelationships', () => {
  const matchVtg = async ({
    animation,
    preferences,
    rotationFilter,
  }: Parameters<Parameters<typeof resolveVtgBuilderPreviewRelationships>[1]>[0]) => {
    const match = findVtgPatternMatch(animation, preferences, rotationFilter)
    return match
      ? ({ status: 'matched', source: 'vtg', match } as const)
      : ({ status: 'unmatched' } as const)
  }

  const resolveQueryRelationships = async (query: string) => {
    const version = await loadSpiroAnimQSVersion(6)
    const codec = await useSpiroAnimQS(
      version.VDEF,
      useBaseQS(version.VDEF, { charset: version.CHARSET }),
      6,
    )
    const animation = codec.decodeQS(Object.fromEntries(new URLSearchParams(query)))
    const previews = createVtgTransitionPreviewAnimations(animation)
    if (!previews) throw new Error('Expected Builder portions from the compound ratio')

    return resolveVtgBuilderPreviewRelationships(previews, matchVtg)
  }

  it.each(['2:1', '2:3', '2:5'] as const)(
    'resolves an eight-beat %s preview',
    async (speedRatio) => {
      const animation = createDefaultVtgAnimation({ reference: '1-1', speedRatio })
      if (!animation) throw new Error(`Expected a ${speedRatio} animation`)
      const previews = createVtgTransitionPreviewAnimations(animation)
      if (!previews) throw new Error(`Expected a ${speedRatio} Builder preview`)

      const relationships = await resolveVtgBuilderPreviewRelationships(previews, matchVtg)

      expect(relationships).toHaveLength(1)
    },
  )

  it('resolves an eight-beat mixed-numerator preview', async () => {
    const animation = createDefaultVtgAnimation({ reference: '1-1', speedRatio: '1:1v2:1' })
    if (!animation) throw new Error('Expected a mixed-numerator animation')
    const prepared = prepareVtg45TransitionPattern(animation)
    const previews = createVtgTransitionPreviewAnimations(prepared.pattern)
    if (!previews) throw new Error('Expected a mixed-numerator Builder preview')

    expect(prepared.supported).toBe(true)
    expect(animation.props.every((prop) => prop.anim.length === 17)).toBe(true)
    expect(await resolveVtgBuilderPreviewRelationships(previews, matchVtg)).toHaveLength(1)
  })

  it('uses VTG cell labels for experimental compound-ratio portions', async () => {
    const relationships = await resolveQueryRelationships(
      'r=Ew08Yk11Y&p0=Q__.mBExM___s.5JEs8....._ZEwm............_ZEs8......&m0=_1_mxqv__&p1=N__.07_xM___s.5L_sR..........._ZEvF............_ZEsR&c=_i_bhq&v=6',
    )

    expect(relationships?.map(({ label }) => label)).toEqual([
      'SS / XX',
      'SO / XX',
      'TS / XX',
      'TO / XX',
      'SS / XX',
    ])
  })

  it('resolves the original compound-ratio URL without using shifted playback orientations', async () => {
    const relationships = await resolveQueryRelationships(
      'r=Ew08Yk11Y&p0=Q__.mBE_____s.5JEs8....._ZEwm............_ZEs8......&m0=_1_mxqv__&p1=N__.07______s.5L_sR..........._ZEvF............_ZEsR&c=_i_bhq&v=6',
    )

    expect(relationships).toBeDefined()
    expect(relationships).toHaveLength(5)
  })
})
