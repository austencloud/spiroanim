import { describe, expect, it } from 'vitest'

import { useSpiroAnimQS } from '@/composables/useSpiroAnimQS'
import { createDefaultVtgAnimation } from '@/features/vtg/createVtgAnimation'
import { findVtgPatternMatch } from '@/features/vtg/matchVtgAnimation'
import {
  createVtgTransitionQuickSlotAnimationCandidates,
  resolveVtgTransitionQuickSlotAnimations,
} from '@/features/vtg/math/createVtgTransitionQuickSlotAnimations'
import { findQtrPatternMatch } from '@/features/vtg/qtr/matchQtrAnimation'
import { doubleAnimationPlayback } from '@/math/animation/subdivideAnimationPlayback'
import { findExplicitPlaneOrTurnsFrameIndices } from '@/math/animation/findExplicitPlaneOrTurnsFrameIndices'
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
  candidates: ReturnType<typeof createVtgTransitionQuickSlotAnimationCandidates>,
) => {
  if (!candidates) throw new Error('Expected Quick Slot candidates')
  return resolveVtgTransitionQuickSlotAnimations(candidates, findMatchKind).then((resolution) => {
    if (resolution.status !== 'matched') {
      const slots = resolution.unmatchedSlots.join(', ')
      throw new Error(`Expected Quick Slot ${slots} to match`)
    }
    return resolution.animations
  })
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
        'r=Ew08Yk11Y&p0=Q__.5E0wmHj_s._U0s8Hj.......&m0=_1_mxqv__&p1=N__.gU0tyHj_s.5L_s8w3.......&c=_i_bhq&v=6',
      ),
      queryFrom(
        'r=Ew08Yk11Y&p0=Q__.g_______s.5E0wm.......&m0=_1_mxqv__&p1=N__.5L______s.___wm.......&c=_i_bhq&v=6',
      ),
    ])
  })

  it('matches each raw doubled-cycle extraction without phase shifting', async () => {
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

  it('directly matches a cycle extracted from a transition shifted by one authored frame', async () => {
    const version = await loadSpiroAnimQSVersion(6)
    const codec = await useSpiroAnimQS(
      version.VDEF,
      useBaseQS(version.VDEF, { charset: version.CHARSET }),
      6,
    )
    const sourceQuery = queryFrom(
      'r=Ew08Yk11Y&p0=Q__.bn______s.5L_s8......._ZEwm........_ZEs8........_ZEwm........_ZEs8&m0=_1_mxqv__&p1=N__.bn______s.5L_s8......._ZEwm........_ZEs8........_ZEwm........_ZEs8&c=_i_bhq&v=6',
    )
    const candidates = createVtgTransitionQuickSlotAnimationCandidates(codec.decodeQS(sourceQuery))
    const animations = await selectDetectableAnimations(candidates)

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
    const suppliedCanonicalMatch = doubleAnimationPlayback(
      codec.decodeQS(
        queryFrom(
          'r=Ew08kk11Y&p0=Q__.bn______s.___pk...&m0=_1_mxqv__&p1=N__.bn______s.___pk...&c=_i_bhq&v=6',
        ),
      ),
    )
    if (!suppliedCanonicalMatch)
      throw new Error('Expected the supplied canonical pattern to double')
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
        'r=Ew08Yk11Y&p0=Q__.g__tyw3_s.5L_s8w3.......&m0=_1_mxqv__&p1=N__.g__tyw3_s.5L_s8w3.......&c=_i_bhq&v=6',
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
      expect(quickSlotCandidates?.[0]).toEqual(animation)
      expect(
        quickSlotCandidates
          ?.slice(1)
          .flatMap((candidate) => candidate.props.map((prop) => prop.anim.length)),
      ).toEqual(Array(8).fill(9))
    },
  )

  it('detects pattern boundaries from authored Plane or Turns frames instead of beat spacing', () => {
    const base = createDefaultVtgAnimation({ reference: '5-1', speedRatio: '1:3' })
    if (!base) throw new Error('Expected a supported VTG animation')
    const explicitFrames = Array.from({ length: 12 }, () => ({}))
    explicitFrames[0] = { arc: 0, turns: 0 }
    explicitFrames[3] = { plane: 0 }
    explicitFrames[6] = { turns: 0 }
    explicitFrames[10] = { plane: 0, turns: 0 }
    const animation = {
      ...base,
      props: base.props.map((prop) => ({
        ...prop,
        anim: explicitFrames.map((frame) => ({ ...frame })),
      })),
    }

    expect(findExplicitPlaneOrTurnsFrameIndices(animation)).toEqual([3, 6, 10])
    const quickSlotCandidates = createVtgTransitionQuickSlotAnimationCandidates(animation)

    expect(quickSlotCandidates).toHaveLength(5)
    expect(
      quickSlotCandidates
        ?.slice(1)
        .flatMap((candidate) => candidate.props.map((prop) => prop.anim.length)),
    ).toEqual(Array(8).fill(9))
  })

  it('resolves the same pattern group regardless of the authored transition interval', () => {
    const createPatternGroup = (transitionBeats: 2 | 3 | 4 | 5 | 6) => {
      const animation = createDefaultVtgAnimation({
        reference: '5-1',
        speedRatio: '1:3',
        transition: true,
        transitionBeats,
        transitionQuad: true,
        transitionSecond: true,
      })
      if (!animation) throw new Error('Expected a supported VTG transition')

      return createVtgTransitionQuickSlotAnimationCandidates(animation)
        ?.slice(1)
        .map((candidate) => {
          const match = findVtgPatternMatch(candidate) ?? findQtrPatternMatch(candidate)
          if (!match) return undefined
          const { beat: _startingBeat, ...patternIdentity } = match
          return patternIdentity
        })
    }

    const expectedGroup = createPatternGroup(2)
    expect(expectedGroup).toBeDefined()
    expect(expectedGroup?.some((identity) => identity !== undefined)).toBe(true)
    for (const transitionBeats of [3, 4, 5, 6] as const) {
      expect(createPatternGroup(transitionBeats)).toEqual(expectedGroup)
    }
  })

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
    const candidates = createVtgTransitionQuickSlotAnimationCandidates(animation)
    if (!candidates) throw new Error('Expected Quick Slot candidates')

    await expect(resolveVtgTransitionQuickSlotAnimations(candidates, () => false)).resolves.toEqual(
      {
        status: 'partial',
        animations: candidates,
        unmatchedSlots: [2, 3, 4, 5],
      },
    )
  })
})
