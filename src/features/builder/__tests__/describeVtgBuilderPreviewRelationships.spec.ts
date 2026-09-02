import { describe, expect, it } from 'vitest'

import { useSpiroAnimQS } from '@/composables/useSpiroAnimQS'
import {
  appendVtgBuilderPattern,
  insertVtgBuilderPattern,
} from '@/features/builder/appendVtgBuilderPattern'
import { createVtgBuilderDropPreview } from '@/features/builder/createVtgBuilderDropPreview'
import {
  describeVtgBuilderPreviewRelationship,
  describeVtgBuilderPreviewRelationships,
} from '@/features/builder/describeVtgBuilderPreviewRelationships'
import { resolveVtgBuilderInitialPropRotationOffsets } from '@/features/builder/resolveVtgBuilderInitialPropRotationOffsets'
import { describePatternRelationships } from '@/features/concepts/math/describePatternRelationships'
import { createDefaultVtgAnimation } from '@/features/vtg/createVtgAnimation'
import { findVtgPatternMatch } from '@/features/vtg/matchVtgAnimation'
import { createVtgTransitionPreviewAnimations } from '@/features/vtg/math/createVtgTransitionQuickSlotAnimations'
import { prepareVtg45TransitionPattern } from '@/features/vtg/math/prepareVtg45TransitionPattern'
import { useBaseQS } from '@/services/query/createBaseQS'
import { loadSpiroAnimQSVersion } from '@/services/query/versions'
import type { PatternMatchingClient } from '@/workers/pattern-matching/PatternMatchingWorkerTypes'

describe('describeVtgBuilderPreviewRelationships', () => {
  const matchVtg: PatternMatchingClient['matchVtg'] = async ({
    animation,
    preferences,
    rotationFilter,
  }) => {
    const match = findVtgPatternMatch(animation, preferences, rotationFilter)
    return match
      ? ({ status: 'matched', source: 'vtg', match } as const)
      : ({ status: 'unmatched' } as const)
  }

  const decodePreviews = async (query: string) => {
    const params = new URLSearchParams(query)
    const queryVersion = Number(params.get('v') ?? 6)
    const version = await loadSpiroAnimQSVersion(queryVersion)
    const codec = await useSpiroAnimQS(
      version.VDEF,
      useBaseQS(version.VDEF, { charset: version.CHARSET }),
      queryVersion,
    )
    const animation = codec.decodeQS(Object.fromEntries(params))
    const previews = createVtgTransitionPreviewAnimations(animation)
    if (!previews) throw new Error('Expected Builder portions from the supplied query')
    return previews
  }

  it.each(['2:1', '2:3', '2:5'] as const)(
    'describes an eight-beat %s preview directly',
    (speedRatio) => {
      const animation = createDefaultVtgAnimation({ reference: '1-1', speedRatio })
      if (!animation) throw new Error(`Expected a ${speedRatio} animation`)
      const previews = createVtgTransitionPreviewAnimations(animation)
      if (!previews) throw new Error(`Expected a ${speedRatio} Builder preview`)

      expect(describeVtgBuilderPreviewRelationships(previews)).toEqual(
        previews.map((preview) => describePatternRelationships(preview)),
      )
    },
  )

  it('describes an eight-beat mixed-numerator preview without catalog matching', () => {
    const animation = createDefaultVtgAnimation({ reference: '1-1', speedRatio: '1:1v2:1' })
    if (!animation) throw new Error('Expected a mixed-numerator animation')
    const prepared = prepareVtg45TransitionPattern(animation)
    const previews = createVtgTransitionPreviewAnimations(prepared.pattern)
    if (!previews) throw new Error('Expected a mixed-numerator Builder preview')

    expect(prepared.supported).toBe(true)
    expect(animation.props.every((prop) => prop.anim.length === 17)).toBe(true)
    expect(describeVtgBuilderPreviewRelationships(previews)).toHaveLength(1)
  })

  it('preserves a contextual 1:2 label through append', () => {
    const source = createDefaultVtgAnimation({
      reference: '1-1',
      speedRatio: '1:2',
      beat: 1.5,
    })
    const selection = { reference: '1-2', speedRatio: '1:2' } as const
    if (!source) throw new Error('Expected the 1:2 source pattern')
    const prospective = createVtgBuilderDropPreview(source, selection, 1)
    const appended = appendVtgBuilderPattern(source, selection)
    const inserted = appended ? createVtgTransitionPreviewAnimations(appended)?.[1] : undefined
    if (!prospective || !inserted) throw new Error('Expected the appended portion')

    expect(describeVtgBuilderPreviewRelationship(prospective).label).toBe('QO / TO')
    expect(describeVtgBuilderPreviewRelationship(inserted).label).toBe('QO / TO')
  })

  it('preserves a contextual 1:2 label through prepend', () => {
    const source = createDefaultVtgAnimation({
      reference: '1-2',
      speedRatio: '1:2',
      beat: 1.5,
    })
    const selection = { reference: '1-1', speedRatio: '1:2' } as const
    if (!source) throw new Error('Expected the 1:2 source pattern')
    const prospective = createVtgBuilderDropPreview(source, selection, 0)
    const prepended = insertVtgBuilderPattern(source, selection, 0)
    const inserted = prepended ? createVtgTransitionPreviewAnimations(prepended)?.[0] : undefined
    if (!prospective || !inserted) throw new Error('Expected the prepended portion')

    expect(describeVtgBuilderPreviewRelationship(inserted)).toEqual(
      describeVtgBuilderPreviewRelationship(prospective),
    )
  })

  it('labels a valid Quarter-hand portion even when it has no VTG catalog match', () => {
    const source = createDefaultVtgAnimation({
      reference: '1-2',
      speedRatio: '1:2',
      beat: 1.5,
    })
    if (!source) throw new Error('Expected the 1:2 source pattern')
    const appended = appendVtgBuilderPattern(source, {
      reference: '1-1',
      speedRatio: '1:2',
    })
    const inserted = appended ? createVtgTransitionPreviewAnimations(appended)?.[1] : undefined
    if (!inserted) throw new Error('Expected the appended portion')

    expect(describeVtgBuilderPreviewRelationship(inserted).label).toBe('QS / SS')
  })

  it('extends a half-beat portion for classification without mutating it', () => {
    const animation = createDefaultVtgAnimation({ reference: '1-1', speedRatio: '1:3' })
    if (!animation) throw new Error('Expected a VTG animation')
    const shortAnimation = {
      ...animation,
      props: animation.props.map((prop) => ({ ...prop, anim: prop.anim.slice(0, 2) })),
    }
    const serialized = JSON.stringify(shortAnimation)

    expect(describeVtgBuilderPreviewRelationship(shortAnimation).label).toBe(
      describePatternRelationships(animation).label,
    )
    expect(JSON.stringify(shortAnimation)).toBe(serialized)
  })

  it('keeps catalog matching isolated to first-portion Offset recovery', async () => {
    const animation = createDefaultVtgAnimation({
      reference: '1-1',
      speedRatio: '1:3',
      propRotationOffsets: [45, 0],
    })
    if (!animation) throw new Error('Expected an offset VTG animation')

    expect(await resolveVtgBuilderInitialPropRotationOffsets(animation, matchVtg, 'vtg')).toEqual([
      45, 0,
    ])
    expect(
      await resolveVtgBuilderInitialPropRotationOffsets(
        animation,
        async () => ({ status: 'unmatched' }),
        'vtg',
      ),
    ).toBeUndefined()
  })

  it('describes encoded Builder portions directly from their extracted geometry', async () => {
    const previews = await decodePreviews(
      'r=Ew48Yk11Y&p0=Q__.mD_.5L_Qpg.......&x0=_r_&m0=_1_mxqv__&p1=N__.___R3s_U0.5E0____WQ.......&x1=_r_&c=_g_bhq&v=11',
    )

    expect(describeVtgBuilderPreviewRelationships(previews).map(({ label }) => label)).toEqual([
      'SO / QS',
    ])
  })
})
