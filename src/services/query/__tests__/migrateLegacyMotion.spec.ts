import { describe, expect, it } from 'vitest'

import { rootFinal } from '@/math/animation/PlayerFunc'
import { migrateLegacyMotion } from '@/services/query/migrateLegacyMotion'
import type { RootData } from '@/types/AnimTypes'

const createRoot = (anim: RootData['props'][number]['anim']) =>
  rootFinal({
    bpm: 60,
    prop: 0,
    color: 0,
    smooth: true,
    guides: false,
    paths: false,
    hands: false,
    arms: false,
    visible: true,
    nodes: false,
    anchors: false,
    props: [{ anim }],
    aspectx: 16,
    aspecty: 9,
    distance: 22,
    thick: 4,
  })

describe('migrateLegacyMotion', () => {
  it('collapses stationary frames while retaining the outgoing frame before MOVE', () => {
    const migrated = migrateLegacyMotion(
      createRoot([{ beats: 2 }, { beats: 4 }, { beats: 3 }, { move: [10, 0, 0] }, {}]),
    )

    expect(migrated.props[0]!.motion).toEqual([{ beats: 6 }, { beats: 3 }, { move: [10, 0, 0] }])
    expect(migrated.props[0]!.anim).toEqual([{ beats: 2 }, { beats: 4 }, { beats: 3 }, {}, {}])
  })

  it('preserves an initial MOVE and returns an empty track when MOVE is unused', () => {
    expect(migrateLegacyMotion(createRoot([{ move: [1, 2, 3] }, {}, {}])).props[0]!.motion).toEqual(
      [{ move: [1, 2, 3] }],
    )
    expect(migrateLegacyMotion(createRoot([{}, {}])).props[0]!.motion).toEqual([])
  })
})
