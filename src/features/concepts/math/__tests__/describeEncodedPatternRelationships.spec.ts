import { describe, expect, it } from 'vitest'

import { useSpiroAnimQS } from '@/composables/useSpiroAnimQS'
import { describePatternRelationships } from '@/features/concepts/math/describePatternRelationships'
import {
  describePatternSelectionRelationships,
  inferPatternRelationshipOrientation,
  inferPatternRelationshipPropRotationOffsets,
} from '@/features/concepts/math/describePatternSelectionRelationships'
import { exactlyMatchesVtgSelection, findVtgPatternMatch } from '@/features/vtg/matchVtgAnimation'
import {
  exactlyMatchesQtrSelection,
  findQtrPatternMatch,
} from '@/features/vtg/qtr/matchQtrAnimation'
import { useBaseQS } from '@/services/query/createBaseQS'
import { loadSpiroAnimQSVersion } from '@/services/query/versions'
import { matchVtgPatternRequest } from '@/workers/pattern-matching/handlePatternMatchingRequest'
import { rootCompile } from '@/math/animation/AnimFunc'
import { shiftVtgStartingBeat } from '@/features/vtg/math/shiftVtgStartingBeat'
import { stripVtgPropertySettings } from '@/features/vtg/stripVtgPropertySettings'

describe('encoded pattern relationships', () => {
  it('preserves the sign of per-prop rotation for equivalent QTR matches', async () => {
    const version = await loadSpiroAnimQSVersion(11)
    const codec = await useSpiroAnimQS(
      version.VDEF,
      useBaseQS(version.VDEF, { charset: version.CHARSET }),
      11,
    )
    const cases = [
      {
        query:
          'r=Ew08Yk11Y&p0=Q__.mBEQDk.5JEQpg.......&x0=_s_&m0=_1_mxqv__&p1=N__.bn_.5L_Qpg.......&x1=_s_&c=_i_bhq&v=11',
        propRotationOffsets: [-90, 0],
      },
      {
        query:
          'r=Ew08Yk11Y&p0=Q__.mBER3s.5JEQpg.......&x0=_s_&m0=_1_mxqv__&p1=N__.bn_.5L_Qpg.......&x1=_s_&c=_i_bhq&v=11',
        propRotationOffsets: [90, 0],
      },
    ] as const

    for (const { query, propRotationOffsets } of cases) {
      const animation = stripVtgPropertySettings(
        codec.decodeQS(Object.fromEntries(new URLSearchParams(query))),
      )
      const worker = await matchVtgPatternRequest({
        animation,
        preferences: { swapProps: false, reversePlane: false, quarters: 1, orientation: 0 },
      })

      expect(worker).toMatchObject({
        status: 'matched',
        source: 'qtr',
        match: {
          reference: '2-2',
          speedRatio: '1:3',
          propRotationOffsets,
        },
      })
    }
  })

  it('retains the QTR 1-2 cell at beat 2 without inferred rotation', async () => {
    const version = await loadSpiroAnimQSVersion(11)
    const codec = await useSpiroAnimQS(
      version.VDEF,
      useBaseQS(version.VDEF, { charset: version.CHARSET }),
      11,
    )
    const animation = stripVtgPropertySettings(
      codec.decodeQS(
        Object.fromEntries(
          new URLSearchParams(
            'r=Ew08Yk11Y&p0=Q__.bg0.5E0Qpg.......&x0=_s_&m0=_1_mxqv__&p1=N__.mD_.5E0Qpg.......&x1=_s_&c=_i_bhq&v=11',
          ),
        ),
      ),
    )

    expect(findQtrPatternMatch(animation)).toMatchObject({
      reference: '1-2',
      speedRatio: '1:3',
      beat: 2,
    })
    await expect(
      matchVtgPatternRequest({
        animation,
        preferences: { swapProps: false, reversePlane: false, quarters: 1, orientation: 0 },
      }),
    ).resolves.toMatchObject({
      status: 'matched',
      source: 'qtr',
      match: { reference: '1-2', speedRatio: '1:3', beat: 2 },
    })
  })

  it('prefers regular 1-2 beat 3 over a rotated 2-1 interpretation', async () => {
    const version = await loadSpiroAnimQSVersion(11)
    const codec = await useSpiroAnimQS(
      version.VDEF,
      useBaseQS(version.VDEF, { charset: version.CHARSET }),
      11,
    )
    const animation = stripVtgPropertySettings(
      codec.decodeQS(
        Object.fromEntries(
          new URLSearchParams(
            'r=Ew08Yk11Y&p0=Q__.bn_.5L_Qpg.......&x0=_s_&m0=_1_mxqv__&p1=N__.bn_.5E0Qpg.......&x1=_s_&c=_i_bhq&v=11',
          ),
        ),
      ),
    )

    expect(findVtgPatternMatch(animation)).toMatchObject({
      reference: '1-2',
      speedRatio: '1:3',
      beat: 3,
    })
    await expect(
      matchVtgPatternRequest({
        animation,
        preferences: { swapProps: false, reversePlane: false, quarters: 1, orientation: 0 },
      }),
    ).resolves.toMatchObject({
      status: 'matched',
      source: 'vtg',
      match: { reference: '1-2', speedRatio: '1:3', beat: 3 },
    })
  })

  it('prefers the regular 1-2 beat match over a rotated QTR interpretation', async () => {
    const version = await loadSpiroAnimQSVersion(11)
    const codec = await useSpiroAnimQS(
      version.VDEF,
      useBaseQS(version.VDEF, { charset: version.CHARSET }),
      11,
    )
    const animation = stripVtgPropertySettings(
      codec.decodeQS(
        Object.fromEntries(
          new URLSearchParams(
            'r=Ew08Yk11Y&p0=Q__.5E0R3s_WQ._U0Qpg_WQ.......&x0=_s_&m0=_1_mxqv__&p1=N__.gU0QDk_WQ.5L_Qpg_U0.......&x1=_s_&c=_i_bhq&v=11',
          ),
        ),
      ),
    )

    const vtgMatch = findVtgPatternMatch(animation)
    expect(vtgMatch).toMatchObject({
      reference: '1-2',
      speedRatio: '1:3',
      beat: 1.5,
    })
    expect(vtgMatch && exactlyMatchesVtgSelection(animation, vtgMatch)).toBe(true)
    expect(findQtrPatternMatch(animation)).toMatchObject({ reference: '2-1' })
    await expect(
      matchVtgPatternRequest({
        animation,
        preferences: { swapProps: false, reversePlane: false, quarters: 1, orientation: 0 },
      }),
    ).resolves.toMatchObject({
      status: 'matched',
      source: 'vtg',
      match: { reference: '1-2', speedRatio: '1:3', beat: 1.5 },
    })
  })

  it('retains the regular 1-2 beat 2 prop orientation after refresh', async () => {
    const version = await loadSpiroAnimQSVersion(11)
    const codec = await useSpiroAnimQS(
      version.VDEF,
      useBaseQS(version.VDEF, { charset: version.CHARSET }),
      11,
    )
    const animation = stripVtgPropertySettings(
      codec.decodeQS(
        Object.fromEntries(
          new URLSearchParams(
            'r=Ew08Yk11Y&p0=Q__..5L_Qpg.......&x0=_s_&m0=_1_mxqv__&p1=N__.mD_.5E0Qpg.......&x1=_s_&c=_i_bhq&v=11',
          ),
        ),
      ),
    )
    const vtgMatch = findVtgPatternMatch(animation)
    expect(vtgMatch).toMatchObject({ reference: '1-2', speedRatio: '1:3', beat: 2 })
    expect(vtgMatch && exactlyMatchesVtgSelection(animation, vtgMatch)).toBe(true)

    const result = await matchVtgPatternRequest({
      animation,
      preferences: { swapProps: false, reversePlane: false, quarters: 1, orientation: 0 },
    })
    expect(result).toMatchObject({
      status: 'matched',
      source: 'vtg',
      match: { reference: '1-2', speedRatio: '1:3', beat: 2 },
    })
    if (result.status !== 'matched') throw new Error('Expected a VTG match')
    expect(result.match.propRotationOffsets).toBeUndefined()
  })

  it('retains the QTR left prop rotation at beat 1.5', async () => {
    const version = await loadSpiroAnimQSVersion(11)
    const codec = await useSpiroAnimQS(
      version.VDEF,
      useBaseQS(version.VDEF, { charset: version.CHARSET }),
      11,
    )
    const animation = codec.decodeQS(
      Object.fromEntries(
        new URLSearchParams(
          'r=Ew08Yk11Y&p0=Q__.gU0QDk_WQ.5E0Qpg_WQ.......&x0=_s_&m0=_1_mxqv__&p1=N__.gU0QDk_WQ.5L_Qpg_U0.......&x1=_s_&c=_i_bhq&v=11',
        ),
      ),
    )

    const rawMatch = findQtrPatternMatch(animation)
    expect(rawMatch && exactlyMatchesQtrSelection(animation, rawMatch)).toBe(true)

    const result = await matchVtgPatternRequest({
      animation,
      preferences: { swapProps: false, reversePlane: false, quarters: 1, orientation: 0 },
    })
    expect(result).toMatchObject({
      status: 'matched',
      source: 'qtr',
      match: {
        reference: '1-2',
        speedRatio: '1:3',
        beat: 1.5,
      },
    })
    if (result.status !== 'matched') throw new Error('Expected a QTR match')
    expect(result.match.propRotationOffsets).toBeUndefined()
  })

  it('preserves the left prop path when semantically shifting the supplied pattern to beat 3.5', async () => {
    const version = await loadSpiroAnimQSVersion(11)
    const codec = await useSpiroAnimQS(
      version.VDEF,
      useBaseQS(version.VDEF, { charset: version.CHARSET }),
      11,
    )
    const decode = (query: string) => codec.decodeQS(Object.fromEntries(new URLSearchParams(query)))
    const initial = decode(
      'r=Ew68Yk11Y&p0=Q__.5JER3s.5JEQpg.......&x0=_s_&r0=....MX___....MX___&m0=_1_mxqv__&p1=N__.5JE.5L_Qpg.......&x1=_s_&r1=....BH___....BH___&c=_i_bhq&v=11',
    )
    const patternAnimation = stripVtgPropertySettings(initial)
    const shifted = shiftVtgStartingBeat(patternAnimation, 3.5)
    if (!shifted) throw new Error('Expected the supplied animation to shift')
    const match = findVtgPatternMatch(patternAnimation) ?? findQtrPatternMatch(patternAnimation)

    expect(match).toMatchObject({ reference: '1-2', speedRatio: '1:3', orientation: 45 })
    expect(match?.propRotationOffsets).toEqual([90, 0])
    const pathPoints = (animation: typeof shifted) =>
      rootCompile(animation)
        .props[0]?.anim.slice(0, -1)
        .map(({ pos }) =>
          pos
            .map((coordinate) => (Math.abs(coordinate) < 0.000000001 ? 0 : coordinate).toFixed(9))
            .join(','),
        )
        .sort()
    expect(pathPoints(shifted)).toEqual(pathPoints(patternAnimation))
  })

  it('classifies prop timing relative to the carrying hands', async () => {
    const version = await loadSpiroAnimQSVersion(11)
    const codec = await useSpiroAnimQS(
      version.VDEF,
      useBaseQS(version.VDEF, { charset: version.CHARSET }),
      11,
    )
    const queries = [
      'r=Ew68Yk11Y&p0=Q__.5E0R3s_WQ._U0Qpg_WQ.......&x0=_s_&r0=....MX___....MX___&m0=_1_mxqv__&p1=N__.gU0QDk_WQ.5L_Qpg_U0.......&x1=_s_&r1=....BH___....BH___&c=_i_bhq&v=11',
      'r=Ew68Yk11Y&p0=Q__.___Rhw.5L_Qpg.......&x0=_s_&r0=....MX___....MX___&m0=_1_mxqv__&p1=N__.bg0____WQ.5L_Qpg_U0.......&x1=_s_&r1=....BH___....BH___&c=_i_bhq&v=11',
      'r=Ew68Yk11Y&p0=Q__.gU0QDk_WQ.5E0Qpg_WQ.......&x0=_s_&m0=_1_mxqv__&p1=N__.gU0QDk_WQ.5L_Qpg_U0.......&x1=_s_&c=_i_bhq&v=11',
      'r=Ew68Yk11Y&p0=Q__.bg0____WQ.5E0Qpg_WQ.......&x0=_s_&m0=_1_mxqv__&p1=N__.bg0____WQ.5L_Qpg_U0.......&x1=_s_&c=_i_bhq&v=11',
    ]
    const labels = queries.map((query) => {
      const animation = codec.decodeQS(Object.fromEntries(new URLSearchParams(query)))
      return describePatternRelationships(animation).label
    })

    expect(labels).toEqual(['TO / QO', 'QO / TO', 'QO / QO', 'SO / SO'])
  })

  it('classifies relationships from actual hand and prop orientation', async () => {
    const version = await loadSpiroAnimQSVersion(11)
    const codec = await useSpiroAnimQS(
      version.VDEF,
      useBaseQS(version.VDEF, { charset: version.CHARSET }),
      11,
    )
    const queries = [
      'r=Ew68Yk11Y&p0=Q__.5JE.5JEQpg.......&x0=_s_&m0=_1_mxqv__&p1=N__.5JE.5JEQpg.......&x1=_s_&c=_i_bhq&v=11',
      'r=Ew68Yk11Y&p0=Q__.blE.5JEQpg.......&x0=_s_&m0=_1_mxqv__&p1=N__.blE.5L_Qpg.......&x1=_s_&c=_i_bhq&v=11',
      'r=Ew68Yk11Y&p0=Q__.gZE.5JEQpg.......&x0=_s_&m0=_1_mxqv__&p1=N__.gZE.5L_Qpg.......&x1=_s_&c=_i_bhq&v=11',
      'r=Ew68Yk11Y&p0=Q__.blER3s.5JEQpg.......&x0=_s_&m0=_1_mxqv__&p1=N__.blE.5L_Qpg.......&x1=_s_&c=_i_bhq&v=11',
      'r=Ew68Yk11Y&p0=Q__.blEQDk.5JEQpg.......&x0=_s_&m0=_1_mxqv__&p1=N__.blE.5JEQpg.......&x1=_s_&c=_i_bhq&v=11',
      'r=Ew68Yk11Y&p0=Q__.blER3s.5JEQpg.......&x0=_s_&m0=_1_mxqv__&p1=N__.bn_.5JEQpg.......&x1=_s_&c=_i_bhq&v=11',
    ]
    const labels = queries.map((query) => {
      const animation = codec.decodeQS(Object.fromEntries(new URLSearchParams(query)))
      const match = findVtgPatternMatch(animation)
      return match
        ? describePatternSelectionRelationships(match).label
        : describePatternRelationships(animation).label
    })

    expect(labels).toEqual(['TS / TS', 'SO / SO', 'QO / QO', 'SO / QO', 'TS / QS', 'TO / QO'])
  })

  it('keeps a shifted half-beat pattern on its canonical relationship', async () => {
    const version = await loadSpiroAnimQSVersion(11)
    const codec = await useSpiroAnimQS(
      version.VDEF,
      useBaseQS(version.VDEF, { charset: version.CHARSET }),
      11,
    )
    const animation = codec.decodeQS(
      Object.fromEntries(
        new URLSearchParams(
          'r=Ew68Yk11Y&p0=Q__.5E0Rhw_WQ._U0Qpg_WQ.......&x0=_s_&m0=_1_mxqv__&p1=N__.gU0QDk_WQ.5L_Qpg_U0.......&x1=_s_&c=_i_bhq&v=11',
        ),
      ),
    )
    const match = findVtgPatternMatch(animation)
    expect(match).toMatchObject({
      reference: '1-2',
      beat: 1.5,
      propRotationOffsets: [90, 0],
    })
    expect(match && describePatternSelectionRelationships(match).label).toBe('SO / QO')
  })

  it('keeps continuously split hands classified as Split', async () => {
    const version = await loadSpiroAnimQSVersion(11)
    const codec = await useSpiroAnimQS(
      version.VDEF,
      useBaseQS(version.VDEF, { charset: version.CHARSET }),
      11,
    )
    const animation = codec.decodeQS(
      Object.fromEntries(
        new URLSearchParams(
          'r=Ew68Yk11Y&p0=Q__.5JE.5JEQpg.......&x0=_s_&m0=_1_mxqv__&p1=N__.g__.5L_Qpg.......&x1=_s_&c=_i_bhq&v=11',
        ),
      ),
    )
    const match = findVtgPatternMatch(animation)
    expect(describePatternRelationships(animation).label).toBe('SS / SS')
    expect(match && describePatternSelectionRelationships(match).label).toBe('SS / SS')
  })

  it('classifies diagonal opposite hand travel as Quarter', async () => {
    const version = await loadSpiroAnimQSVersion(11)
    const codec = await useSpiroAnimQS(
      version.VDEF,
      useBaseQS(version.VDEF, { charset: version.CHARSET }),
      11,
    )
    const animation = codec.decodeQS(
      Object.fromEntries(
        new URLSearchParams(
          'r=Ew68Yk11Y&p0=Q__.5JE.5JEQpg.......&x0=_s_&m0=_1_mxqv__&p1=N__.5JE.5L_Qpg.......&x1=_s_&c=_i_bhq&v=11',
        ),
      ),
    )
    const match = findVtgPatternMatch(animation)
    expect(describePatternRelationships(animation).label).toBe('QO / QO')
    expect(match && describePatternSelectionRelationships(match).label).toBe('QO / QO')
  })

  it('keeps cardinal opposite hand travel Split in a QTR cell', async () => {
    const version = await loadSpiroAnimQSVersion(11)
    const codec = await useSpiroAnimQS(
      version.VDEF,
      useBaseQS(version.VDEF, { charset: version.CHARSET }),
      11,
    )
    const animation = codec.decodeQS(
      Object.fromEntries(
        new URLSearchParams(
          'r=Ew68Yk11Y&p0=Q__.gZE.5JEQpg.......&x0=_s_&m0=_1_mxqv__&p1=N__.5JE.5L_Qpg.......&x1=_s_&c=_i_bhq&v=11',
        ),
      ),
    )
    const match = findQtrPatternMatch(animation) ?? findVtgPatternMatch(animation)
    if (!match) throw new Error('Expected the QTR pattern to match')
    const orientation = inferPatternRelationshipOrientation(animation, match)
    expect(describePatternRelationships(animation).label).toBe('SO / QO')
    expect(orientation).toBeDefined()
    expect(describePatternSelectionRelationships({ ...match, orientation }).label).toBe('SO / QO')
  })

  it('retains a rotated QTR 1-2 match after refresh', async () => {
    const version = await loadSpiroAnimQSVersion(11)
    const codec = await useSpiroAnimQS(
      version.VDEF,
      useBaseQS(version.VDEF, { charset: version.CHARSET }),
      11,
    )
    const animation = codec.decodeQS(
      Object.fromEntries(
        new URLSearchParams(
          'r=Ew68Yk11Y&p0=Q__.DqQ.5L_Qpg.......&x0=_s_&m0=_1_mxqv__&p1=N__.5GQ.5JEQpg.......&x1=_s_&c=_i_bhq&v=11',
        ),
      ),
    )
    await expect(
      matchVtgPatternRequest({
        animation,
        preferences: { swapProps: false, reversePlane: false, quarters: 1, orientation: 0 },
      }),
    ).resolves.toMatchObject({
      status: 'matched',
      source: 'qtr',
      match: { reference: '1-2', speedRatio: '1:3' },
    })
  })

  it('moves Quarter prop timing through a retained quarter-turn', async () => {
    const version = await loadSpiroAnimQSVersion(11)
    const codec = await useSpiroAnimQS(
      version.VDEF,
      useBaseQS(version.VDEF, { charset: version.CHARSET }),
      11,
    )
    const animation = codec.decodeQS(
      Object.fromEntries(
        new URLSearchParams(
          'r=Ew68Yk11Y&p0=Q__.bn_QDk.5L_R3s.......&x0=_r_&m0=_1_mxqv__&p1=N__..5E0R3s.......&x1=_r_&c=_g_bhq&v=11',
        ),
      ),
    )
    const match = findQtrPatternMatch(animation) ?? findVtgPatternMatch(animation)
    if (!match) throw new Error('Expected the rotated Quarter pattern to match')
    const propRotationOffsets = inferPatternRelationshipPropRotationOffsets(animation, match)

    expect(describePatternRelationships(animation).label).toBe('QO / QO')
    expect(propRotationOffsets).toBeDefined()
    expect(describePatternSelectionRelationships({ ...match, propRotationOffsets }).label).toBe(
      'QO / QO',
    )
  })
})
