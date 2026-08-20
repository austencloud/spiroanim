import { describe, expect, it } from 'vitest'

import { useSpiroAnimQS } from '@/composables/useSpiroAnimQS'
import { resolveVtgBuilderPreviewRelationships } from '@/features/builder/resolveVtgBuilderPreviewRelationships'
import { findVtgPatternMatch } from '@/features/vtg/matchVtgAnimation'
import { createVtgTransitionPreviewAnimations } from '@/features/vtg/math/createVtgTransitionQuickSlotAnimations'
import { useBaseQS } from '@/services/query/createBaseQS'
import { loadSpiroAnimQSVersion } from '@/services/query/versions'

describe('resolveVtgBuilderPreviewRelationships', () => {
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

    return resolveVtgBuilderPreviewRelationships(
      previews,
      async ({ animation: candidate, preferences, rotationFilter }) => {
        const match = findVtgPatternMatch(candidate, preferences, rotationFilter)
        return match ? { status: 'matched', source: 'vtg', match } : { status: 'unmatched' }
      },
    )
  }

  it('uses VTG cell labels for experimental compound-ratio portions', async () => {
    const relationships = await resolveQueryRelationships(
      'r=Ew08Yk11Y&p0=Q__.mBExM___s.5JEs8....._ZEwm............_ZEs8......&m0=_1_mxqv__&p1=N__.07_xM___s.5L_sR..........._ZEvF............_ZEsR&c=_i_bhq&v=6',
    )

    expect(relationships?.map(({ label }) => label)).toEqual([
      'SS / SS',
      'SO / TS',
      'TS / SS',
      'TO / TS',
      'SS / TS',
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
