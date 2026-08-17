import { describe, expect, it } from 'vitest'

import { useSpiroAnimQS } from '@/composables/useSpiroAnimQS'
import { createDefaultVtgAnimation } from '@/features/vtg/createVtgAnimation'
import { findVtgPatternMatch } from '@/features/vtg/matchVtgAnimation'
import {
  createVtgTransitionQuickSlotAnimationCandidates,
  resolveVtgTransitionQuickSlotAnimations,
} from '@/features/vtg/math/createVtgTransitionQuickSlotAnimations'
import { findQtrPatternMatch } from '@/features/vtg/qtr/matchQtrAnimation'
import { useBaseQS } from '@/services/query/createBaseQS'
import { loadSpiroAnimQSVersion } from '@/services/query/versions'

const queryFrom = (query: string) => Object.fromEntries(new URLSearchParams(query))

const findMatchKind = (
  animation: Parameters<typeof findVtgPatternMatch>[0],
  rotationFilter: Parameters<typeof findVtgPatternMatch>[2],
) => {
  const matches = [
    findVtgPatternMatch(animation, undefined, rotationFilter),
    findQtrPatternMatch(animation, undefined, rotationFilter),
  ].filter((match) => match !== undefined)

  if (matches.some((match) => match.initialTurnsOffset === undefined)) return 'exact'
  return matches.length > 0 ? 'transitionTurns' : false
}

const selectDetectableAnimations = (
  candidateGroups: ReturnType<typeof createVtgTransitionQuickSlotAnimationCandidates>,
) => {
  if (!candidateGroups) throw new Error('Expected Quick Slot candidate groups')
  return resolveVtgTransitionQuickSlotAnimations(candidateGroups, findMatchKind).then(
    (resolution) => {
      if (resolution.status !== 'matched') {
        const slots =
          resolution.status === 'partial' ? resolution.unmatchedSlots.join(', ') : resolution.slot
        throw new Error(`Expected Quick Slot ${slots} to match`)
      }
      return resolution.animations
    },
  )
}

describe('createVtgTransitionQuickSlotAnimations', () => {
  it('reproduces the supplied four-beat transition extractions', async () => {
    const version = await loadSpiroAnimQSVersion(6)
    const codec = await useSpiroAnimQS(
      version.VDEF,
      useBaseQS(version.VDEF, { charset: version.CHARSET }),
      6,
    )
    const sourceQuery = queryFrom(
      'r=Ew08Yk11Y&p0=Q__.blE_____s.5JEs8......._ZEwm........_ZEs8........_ZEwm........_ZEs8&m0=_1_mxqv__&p1=N__.blE_____s.5L_s8......._ZEwm........_ZEs8........_ZEwm........_ZEs8&c=_i_bhq&v=6',
    )
    const animations = await selectDetectableAnimations(
      createVtgTransitionQuickSlotAnimationCandidates(codec.decodeQS(sourceQuery)),
    )

    expect(animations).toHaveLength(5)
    expect(animations?.map((animation) => codec.encodeQS(animation, false))).toEqual([
      sourceQuery,
      queryFrom(
        'r=Ew08Yk11Y&p0=Q__.blE_____s.5JEs8.......&m0=_1_mxqv__&p1=N__.blE_____s.5L_s8.......&c=_i_bhq&v=6',
      ),
      queryFrom(
        'r=Ew08Yk11Y&p0=Q__.g_______s.5E0wm.......&m0=_1_mxqv__&p1=N__.5L______s.___wm.......&c=_i_bhq&v=6',
      ),
      queryFrom(
        'r=Ew08Yk11Y&p0=Q__.________s.5L_s8.......&m0=_1_mxqv__&p1=N__.mD______s.5E0s8.......&c=_i_bhq&v=6',
      ),
      queryFrom(
        'r=Ew08Yk11Y&p0=Q__.g_______s.5E0wm.......&m0=_1_mxqv__&p1=N__.5L______s.___wm.......&c=_i_bhq&v=6',
      ),
    ])
  })

  it('retains the first phase detected by established transforms', async () => {
    const version = await loadSpiroAnimQSVersion(6)
    const codec = await useSpiroAnimQS(
      version.VDEF,
      useBaseQS(version.VDEF, { charset: version.CHARSET }),
      6,
    )
    const sourceQuery = queryFrom(
      'r=Ew08Yk11Y&p0=Q__.bn______s.5L_s8......._ZEwm................_ZEs8........&m0=_1_mxqv__&p1=N__.bn______s.5L_s8..............._ZEwm................_ZEs8&c=_i_bhq&v=6',
    )

    const animations = await selectDetectableAnimations(
      createVtgTransitionQuickSlotAnimationCandidates(codec.decodeQS(sourceQuery)),
    )

    expect(animations).toHaveLength(5)
    expect(
      animations
        ?.slice(1)
        .every(
          (animation) =>
            findVtgPatternMatch(animation) !== undefined ||
            findQtrPatternMatch(animation) !== undefined,
        ),
    ).toBe(true)
    expect(animations?.map((animation) => codec.encodeQS(animation, false))).toEqual([
      sourceQuery,
      queryFrom(
        'r=Ew08Yk11Y&p0=Q__.bn______s.5L_s8.......&m0=_1_mxqv__&p1=N__.bn______s.5L_s8.......&c=_i_bhq&v=6',
      ),
      queryFrom(
        'r=Ew08Yk11Y&p0=Q__.5E0_____s.___wm.......&m0=_1_mxqv__&p1=N__.g__tyw3_s.5L_s8w3.......&c=_i_bhq&v=6',
      ),
      queryFrom(
        'r=Ew08Yk11Y&p0=Q__.5E0_____s.___wm.......&m0=_1_mxqv__&p1=N__.5E0_____s.___wm.......&c=_i_bhq&v=6',
      ),
      queryFrom(
        'r=Ew08Yk11Y&p0=Q__.g__tyw3_s.5L_s8w3.......&m0=_1_mxqv__&p1=N__.5E0_____s.___wm.......&c=_i_bhq&v=6',
      ),
    ])
  })

  it('normalizes a cycle extracted from a transition shifted by one authored frame', async () => {
    const version = await loadSpiroAnimQSVersion(6)
    const codec = await useSpiroAnimQS(
      version.VDEF,
      useBaseQS(version.VDEF, { charset: version.CHARSET }),
      6,
    )
    const sourceQuery = queryFrom(
      'r=Ew08Yk11Y&p0=Q__.bn______s.5L_s8......._ZEwm........_ZEs8........_ZEwm........_ZEs8&m0=_1_mxqv__&p1=N__.bn______s.5L_s8......._ZEwm........_ZEs8........_ZEwm........_ZEs8&c=_i_bhq&v=6',
    )
    const candidateGroups = createVtgTransitionQuickSlotAnimationCandidates(
      codec.decodeQS(sourceQuery),
    )
    const animations = await selectDetectableAnimations(candidateGroups)

    expect(
      animations
        ?.slice(1)
        .every(
          (animation) =>
            findVtgPatternMatch(animation) !== undefined ||
            findQtrPatternMatch(animation) !== undefined,
        ),
    ).toBe(true)
    const fourthAnimation = animations[3]
    if (!fourthAnimation) throw new Error('Expected the fourth Quick Slot animation')
    expect(findVtgPatternMatch(fourthAnimation)).toMatchObject({
      reference: '1-1',
      speedRatio: '1:3',
    })
    const suppliedCanonicalMatch = codec.decodeQS(
      queryFrom(
        'r=Ew08kk11Y&p0=Q__.bn______s.___pk...&m0=_1_mxqv__&p1=N__.bn______s.___pk...&c=_i_bhq&v=6',
      ),
    )
    expect(findVtgPatternMatch(suppliedCanonicalMatch)).toMatchObject({
      reference: '1-1',
      speedRatio: '1:3',
    })
    expect(animations.map((animation) => codec.encodeQS(animation, false))).toEqual([
      sourceQuery,
      queryFrom(
        'r=Ew08Yk11Y&p0=Q__.bn______s.5L_s8.......&m0=_1_mxqv__&p1=N__.bn______s.5L_s8.......&c=_i_bhq&v=6',
      ),
      queryFrom(
        'r=Ew08Yk11Y&p0=Q__.5E0_____s.___wm.......&m0=_1_mxqv__&p1=N__.5E0_____s.___wm.......&c=_i_bhq&v=6',
      ),
      queryFrom(
        'r=Ew08Yk11Y&p0=Q__.mD______s.5L_s8.......&m0=_1_mxqv__&p1=N__.mD______s.5L_s8.......&c=_i_bhq&v=6',
      ),
      queryFrom(
        'r=Ew08Yk11Y&p0=Q__.5E0_____s.___wm.......&m0=_1_mxqv__&p1=N__.5E0_____s.___wm.......&c=_i_bhq&v=6',
      ),
    ])
  })

  it.each([
    { transitionBeats: 2, transitionQuad: false, transitionSecond: false },
    { transitionBeats: 3, transitionQuad: true, transitionSecond: false },
    { transitionBeats: 4, transitionQuad: true, transitionSecond: true },
    { transitionBeats: 5, transitionQuad: false, transitionSecond: false },
    { transitionBeats: 6, transitionQuad: true, transitionSecond: true },
  ] as const)(
    'creates five nine-frame patterns for $transitionBeats beats, Quad $transitionQuad, Second $transitionSecond',
    (selection) => {
      const animation = createDefaultVtgAnimation({
        reference: '5-1',
        speedRatio: '1:3',
        transition: true,
        ...selection,
      })
      if (!animation) throw new Error('Expected a supported VTG transition')

      const quickSlotCandidates = createVtgTransitionQuickSlotAnimationCandidates(animation)

      expect(quickSlotCandidates).toHaveLength(5)
      expect(quickSlotCandidates?.[0]?.[0]).toEqual(animation)
      expect(
        quickSlotCandidates?.slice(1).flatMap((candidates) => {
          const candidate = candidates[0]
          return candidate ? candidate.props.map((prop) => prop.anim.length) : []
        }),
      ).toEqual(Array(8).fill(9))
    },
  )

  it('rejects an ordinary non-transition pattern', () => {
    const animation = createDefaultVtgAnimation({ reference: '5-1', speedRatio: '1:3' })
    if (!animation) throw new Error('Expected a supported VTG pattern')

    expect(createVtgTransitionQuickSlotAnimationCandidates(animation)).toBeUndefined()
  })

  it('retains raw extractions when no cyclic phase matches', async () => {
    const animation = createDefaultVtgAnimation({
      reference: '5-1',
      speedRatio: '1:3',
      transition: true,
    })
    if (!animation) throw new Error('Expected a supported VTG transition')
    const candidateGroups = createVtgTransitionQuickSlotAnimationCandidates(animation)
    if (!candidateGroups) throw new Error('Expected Quick Slot candidate groups')

    await expect(
      resolveVtgTransitionQuickSlotAnimations(candidateGroups, () => false),
    ).resolves.toEqual({
      status: 'partial',
      animations: candidateGroups.map((candidates) => candidates[0]),
      unmatchedSlots: [2, 3, 4, 5],
    })
  })
})
